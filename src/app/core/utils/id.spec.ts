import { describe, expect, it } from 'vitest';
import { prefixedId, randomUuid } from './id';

describe('randomUuid', () => {
  it('returns a non-empty string that differs across calls', () => {
    const a = randomUuid();
    const b = randomUuid();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('prefixedId', () => {
  it('applies the prefix and stays unique across calls', () => {
    const a = prefixedId('turn');
    const b = prefixedId('turn');
    expect(a.startsWith('turn-')).toBe(true);
    expect(a).not.toBe(b);
  });
});
