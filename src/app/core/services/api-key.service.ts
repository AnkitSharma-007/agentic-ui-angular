import { Service, computed, inject, signal } from '@angular/core';
import {
  DecryptionFailedError,
  EncryptedPayloadV1,
  SessionKeyEnvelope,
  decryptString,
  decryptWithKey,
  encryptString,
  encryptWithKey,
  generateSessionKek,
  isSupportedEncryptedPayload,
} from '../crypto/webcrypto.helpers';
import { deleteSessionKek, getSessionKek, putSessionKek } from '../crypto/session-key-store';
import { LoggerService } from '../logging/logger.service';
import { StorageError } from '../errors/app-error';

export type KeyStorage = 'session' | 'encrypted-local';

// v2 session tier: AES-GCM envelope in sessionStorage; non-extractable KEK in IndexedDB.
// LEGACY_SESSION_KEY is the pre-v2 plaintext slot, migrated on restore and used as a WebCrypto/IDB fallback.
const SESSION_ENVELOPE_KEY = 'agentic-ui.api-key.session.v2';
const LEGACY_SESSION_KEY = 'agentic-ui.api-key.session';
const LOCAL_STORAGE_KEY = 'agentic-ui.api-key.encrypted';

// BYOK: session tier (per-session KEK, no passphrase) or localStorage AES-GCM (passphrase-unlocked).
@Service()
export class ApiKeyService {
  private readonly logger = inject(LoggerService);
  private readonly _key = signal<string | null>(null);
  private readonly _storage = signal<KeyStorage>('session');

  readonly key = this._key.asReadonly();
  readonly storage = this._storage.asReadonly();
  readonly hasKey = computed(() => this._key() !== null);

  readonly hasLockedBlob = signal<boolean>(this.readLockedBlob() !== null);

  // True when the in-memory session key could not be persisted — warn instead of silently losing it on reload.
  private readonly _sessionPersistenceFailed = signal(false);
  readonly sessionPersistenceFailed = this._sessionPersistenceFailed.asReadonly();

  // Rehydrate session key from storage; APP_INITIALIZER awaits this to avoid an onboarding flash.
  // Always resolves — corrupt envelopes are cleared, not thrown.
  async restore(): Promise<void> {
    try {
      const envelope = this.readSessionEnvelope();
      if (envelope) {
        const kek = await getSessionKek();
        if (kek) {
          const key = await decryptWithKey(kek, envelope);
          this._key.set(key);
          this._storage.set('session');
          return;
        }
        // Orphaned envelope or KEK half — drop rather than leave a dead key.
        await this.clearSessionPersistence();
        return;
      }
      // Pre-v2 plaintext: adopt it and upgrade to an encrypted envelope.
      const legacy = this.readLegacyPlaintext();
      if (legacy) await this.setForSession(legacy);
    } catch (err) {
      // Storage unavailable — start with no key; logged for diagnostics.
      this.logger.debug('Could not restore a session API key.', {
        category: 'storage',
        error: err,
      });
    }
  }

  async setForSession(key: string): Promise<void> {
    this._key.set(key);
    this._storage.set('session');
    await this.persistSession(key);
  }

  async setEncryptedLocal(key: string, passphrase: string): Promise<void> {
    const payload = await encryptString(key, passphrase);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      this.hasLockedBlob.set(true);
    } catch (err) {
      this.logger.warn('Failed to write the encrypted key to localStorage.', {
        category: 'storage',
        error: err,
      });
      throw new StorageError({
        code: 'local_write_failed',
        userMessage: 'Could not save your key to this browser. Storage may be full or disabled.',
        technicalMessage: 'Failed to write encrypted key to localStorage.',
        cause: err,
      });
    }
    await this.clearSessionPersistence();
    this._key.set(key);
    this._storage.set('encrypted-local');
  }

  async unlockLocal(passphrase: string): Promise<void> {
    const blob = this.readLockedBlob();
    if (!blob) throw new Error('No encrypted key stored locally.');
    const key = await decryptString(blob, passphrase);
    this._key.set(key);
    this._storage.set('encrypted-local');
  }

  async clear(): Promise<void> {
    this._key.set(null);
    this._storage.set('session');
    await this.clearSessionPersistence();
    safeWrite(() => localStorage.removeItem(LOCAL_STORAGE_KEY));
    this.hasLockedBlob.set(false);
  }

  async lock(): Promise<void> {
    this._key.set(null);
    await this.clearSessionPersistence();
  }

  static readonly DecryptionFailedError = DecryptionFailedError;

  // Encrypt under a fresh non-extractable KEK; fall back to plaintext only when WebCrypto/IndexedDB is missing.
  private async persistSession(key: string): Promise<void> {
    try {
      const kek = await generateSessionKek();
      await putSessionKek(kek);
      const envelope = await encryptWithKey(kek, key);
      const wrote = safeWrite(() =>
        sessionStorage.setItem(SESSION_ENVELOPE_KEY, JSON.stringify(envelope)),
      );
      safeWrite(() => sessionStorage.removeItem(LEGACY_SESSION_KEY));
      this.setSessionPersistenceFailed(!wrote);
    } catch (err) {
      // WebCrypto/IndexedDB unavailable — plaintext fallback so the key survives reload where possible.
      this.logger.debug('Session key encryption unavailable; using plaintext fallback.', {
        category: 'storage',
        error: err,
      });
      const wrote = safeWrite(() => sessionStorage.setItem(LEGACY_SESSION_KEY, key));
      safeWrite(() => sessionStorage.removeItem(SESSION_ENVELOPE_KEY));
      await deleteSessionKek().catch(() => undefined);
      this.setSessionPersistenceFailed(!wrote);
    }
  }

  private setSessionPersistenceFailed(failed: boolean): void {
    this._sessionPersistenceFailed.set(failed);
    if (failed) {
      this.logger.warn(
        'Could not persist the session key to sessionStorage; it will not survive a reload.',
        { category: 'storage' },
      );
    }
  }

  private async clearSessionPersistence(): Promise<void> {
    safeWrite(() => sessionStorage.removeItem(SESSION_ENVELOPE_KEY));
    safeWrite(() => sessionStorage.removeItem(LEGACY_SESSION_KEY));
    this._sessionPersistenceFailed.set(false);
    await deleteSessionKek().catch(() => undefined);
  }

  private readSessionEnvelope(): SessionKeyEnvelope | null {
    try {
      const raw = sessionStorage.getItem(SESSION_ENVELOPE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SessionKeyEnvelope;
      return parsed.version === 1 && !!parsed.iv && !!parsed.ciphertext ? parsed : null;
    } catch {
      return null;
    }
  }

  private readLegacyPlaintext(): string | null {
    try {
      return sessionStorage.getItem(LEGACY_SESSION_KEY);
    } catch {
      return null;
    }
  }

  private readLockedBlob(): EncryptedPayloadV1 | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      // Reject tampered kdf/iterations so a poisoned blob shows setup, not the unlock path.
      return isSupportedEncryptedPayload(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

// Best-effort storage write; returns success so callers can warn on session persistence failure.
function safeWrite(action: () => void): boolean {
  try {
    action();
    return true;
  } catch {
    // storage unavailable (quota, private browsing) — best-effort only
    return false;
  }
}
