import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiKeyService } from './api-key.service';
import { DecryptionFailedError } from '../crypto/webcrypto.helpers';

const SESSION_STORAGE_KEY = 'agentic-ui.api-key.session';
const LOCAL_STORAGE_KEY = 'agentic-ui.api-key.encrypted';

describe('ApiKeyService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('starts with no key and no locked blob', () => {
    const service = TestBed.inject(ApiKeyService);
    expect(service.key()).toBeNull();
    expect(service.hasKey()).toBe(false);
    expect(service.hasLockedBlob()).toBe(false);
    expect(service.storage()).toBe('session');
  });

  it('setForSession() stores the key in memory + sessionStorage', () => {
    const service = TestBed.inject(ApiKeyService);
    service.setForSession('sk-test-123');

    expect(service.key()).toBe('sk-test-123');
    expect(service.hasKey()).toBe(true);
    expect(service.storage()).toBe('session');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe('sk-test-123');
  });

  it('hydrates the session key when the service is created with one in storage', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'sk-hydrated');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ApiKeyService);

    expect(service.key()).toBe('sk-hydrated');
    expect(service.storage()).toBe('session');
  });

  it('lock() clears the in-memory key + sessionStorage but leaves the locked blob alone', async () => {
    const service = TestBed.inject(ApiKeyService);
    await service.setEncryptedLocal('sk-locked', 'passphrase-1');
    expect(service.hasLockedBlob()).toBe(true);

    service.lock();

    expect(service.key()).toBeNull();
    expect(service.hasKey()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).not.toBeNull();
    expect(service.hasLockedBlob()).toBe(true);
  });

  it('clear() wipes session, localStorage, and resets all signals', async () => {
    const service = TestBed.inject(ApiKeyService);
    service.setForSession('sk-1');
    await service.setEncryptedLocal('sk-2', 'pw');

    service.clear();

    expect(service.key()).toBeNull();
    expect(service.hasLockedBlob()).toBe(false);
    expect(service.storage()).toBe('session');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull();
  });
});

describe('ApiKeyService — encrypt + decrypt round-trip', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('setEncryptedLocal → unlockLocal recovers the original key', async () => {
    const service = TestBed.inject(ApiKeyService);
    await service.setEncryptedLocal('sk-roundtrip', 'correct horse battery staple');

    // Re-create the service to simulate a page reload.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(ApiKeyService);

    expect(fresh.key()).toBeNull();
    expect(fresh.hasLockedBlob()).toBe(true);

    await fresh.unlockLocal('correct horse battery staple');
    expect(fresh.key()).toBe('sk-roundtrip');
    expect(fresh.storage()).toBe('encrypted-local');
  });

  it('unlockLocal() throws DecryptionFailedError on a wrong passphrase', async () => {
    const service = TestBed.inject(ApiKeyService);
    await service.setEncryptedLocal('sk-secret', 'right-passphrase');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(ApiKeyService);

    await expect(fresh.unlockLocal('wrong-passphrase')).rejects.toBeInstanceOf(
      DecryptionFailedError,
    );
  });

  it('unlockLocal() throws when no locked blob exists', async () => {
    const service = TestBed.inject(ApiKeyService);
    await expect(service.unlockLocal('anything')).rejects.toThrow(
      /No encrypted key stored/,
    );
  });

  it('setEncryptedLocal() persists JSON envelope v1/AES-GCM', async () => {
    const service = TestBed.inject(ApiKeyService);
    await service.setEncryptedLocal('sk', 'pw');

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)!;
    const payload = JSON.parse(raw);
    expect(payload.version).toBe(1);
    expect(payload.algorithm).toBe('AES-GCM');
    expect(payload.kdf).toBe('PBKDF2-SHA256');
    expect(payload.salt).toBeTruthy();
    expect(payload.iv).toBeTruthy();
    expect(payload.ciphertext).toBeTruthy();
  });

  it('setEncryptedLocal() switches storage mode to encrypted-local and clears sessionStorage', async () => {
    const service = TestBed.inject(ApiKeyService);
    service.setForSession('sk-session');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe('sk-session');

    await service.setEncryptedLocal('sk-locked', 'pw');

    expect(service.key()).toBe('sk-locked');
    expect(service.storage()).toBe('encrypted-local');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
