import { describe, expect, it } from 'vitest';
import {
  DecryptionFailedError,
  decryptString,
  encryptString,
} from './webcrypto.helpers';

describe('webcrypto.helpers', () => {
  it('round-trips a UTF-8 string through encrypt + decrypt', async () => {
    const plaintext = 'sk-live-1234567890 — наслаждайтесь';
    const payload = await encryptString(plaintext, 'correct passphrase');
    const recovered = await decryptString(payload, 'correct passphrase');
    expect(recovered).toBe(plaintext);
  });

  it('produces an envelope with the documented shape', async () => {
    const payload = await encryptString('hello', 'pw');
    expect(payload.version).toBe(1);
    expect(payload.algorithm).toBe('AES-GCM');
    expect(payload.kdf).toBe('PBKDF2-SHA256');
    expect(payload.iterations).toBe(250_000);
    expect(typeof payload.salt).toBe('string');
    expect(typeof payload.iv).toBe('string');
    expect(typeof payload.ciphertext).toBe('string');
  });

  it('throws DecryptionFailedError on wrong passphrase', async () => {
    const payload = await encryptString('secret', 'right');
    await expect(decryptString(payload, 'wrong')).rejects.toBeInstanceOf(
      DecryptionFailedError,
    );
  });

  it('uses a fresh random salt + IV each time (different ciphertexts for same input)', async () => {
    const a = await encryptString('same plaintext', 'same passphrase');
    const b = await encryptString('same plaintext', 'same passphrase');
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);

    // Both should still decrypt back to the same plaintext.
    expect(await decryptString(a, 'same passphrase')).toBe('same plaintext');
    expect(await decryptString(b, 'same passphrase')).toBe('same plaintext');
  });

  it('handles the empty string', async () => {
    const payload = await encryptString('', 'pw');
    expect(await decryptString(payload, 'pw')).toBe('');
  });

  it('rejects when the ciphertext is tampered with', async () => {
    const payload = await encryptString('payload', 'pw');
    const tampered = { ...payload, ciphertext: corruptBase64(payload.ciphertext) };
    await expect(decryptString(tampered, 'pw')).rejects.toBeInstanceOf(
      DecryptionFailedError,
    );
  });
});

function corruptBase64(b64: string): string {
  // Flip the first base64 character to a known different one. We pick a
  // character that's still valid base64 so the decode step succeeds and the
  // failure originates from the AES-GCM auth tag mismatch.
  const head = b64[0] === 'A' ? 'B' : 'A';
  return head + b64.slice(1);
}
