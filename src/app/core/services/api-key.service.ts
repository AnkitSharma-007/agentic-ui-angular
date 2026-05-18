import { Injectable, computed, signal } from '@angular/core';
import {
  DecryptionFailedError,
  EncryptedPayloadV1,
  decryptString,
  encryptString,
} from '../crypto/webcrypto.helpers';

export type KeyStorage = 'session' | 'encrypted-local';

const SESSION_STORAGE_KEY = 'agentic-ui.api-key.session';
const LOCAL_STORAGE_KEY = 'agentic-ui.api-key.encrypted';

// BYOK key with two storage tiers: in-memory/session, or AES-GCM encrypted
// in localStorage (requires a passphrase to unlock on subsequent loads).
@Injectable({ providedIn: 'root' })
export class ApiKeyService {
  private readonly _key = signal<string | null>(null);
  private readonly _storage = signal<KeyStorage>('session');

  readonly key = this._key.asReadonly();
  readonly storage = this._storage.asReadonly();
  readonly hasKey = computed(() => this._key() !== null);

  readonly hasLockedBlob = signal<boolean>(this.readLockedBlob() !== null);

  constructor() {
    const fromSession = this.readSessionKey();
    if (fromSession) {
      this._key.set(fromSession);
      this._storage.set('session');
    }
  }

  setForSession(key: string): void {
    this._key.set(key);
    this._storage.set('session');
    safeWrite(() => sessionStorage.setItem(SESSION_STORAGE_KEY, key));
  }

  async setEncryptedLocal(key: string, passphrase: string): Promise<void> {
    const payload = await encryptString(key, passphrase);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      this.hasLockedBlob.set(true);
    } catch (err) {
      throw new Error('Failed to write encrypted key to localStorage.', { cause: err });
    }
    safeWrite(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
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

  clear(): void {
    this._key.set(null);
    this._storage.set('session');
    safeWrite(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
    safeWrite(() => localStorage.removeItem(LOCAL_STORAGE_KEY));
    this.hasLockedBlob.set(false);
  }

  lock(): void {
    this._key.set(null);
    safeWrite(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  }

  static readonly DecryptionFailedError = DecryptionFailedError;

  private readSessionKey(): string | null {
    try {
      return sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private readLockedBlob(): EncryptedPayloadV1 | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as EncryptedPayloadV1;
      return parsed.version === 1 && parsed.algorithm === 'AES-GCM' ? parsed : null;
    } catch {
      return null;
    }
  }
}

function safeWrite(action: () => void): void {
  try {
    action();
  } catch {
    // storage unavailable (quota, private browsing) — best-effort only
  }
}
