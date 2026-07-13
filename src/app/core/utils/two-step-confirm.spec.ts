import { describe, expect, it } from 'vitest';
import { createTwoStepConfirm } from './two-step-confirm';

describe('createTwoStepConfirm (boolean mode)', () => {
  it('arms on the first confirm and commits on the second', () => {
    const c = createTwoStepConfirm();
    expect(c.armed()).toBe(false);
    expect(c.confirm()).toBe(false);
    expect(c.armed()).toBe(true);
    expect(c.confirm()).toBe(true);
    expect(c.armed()).toBe(false);
  });

  it('cancel disarms without committing', () => {
    const c = createTwoStepConfirm();
    c.arm();
    expect(c.armed()).toBe(true);
    c.cancel();
    expect(c.armed()).toBe(false);
  });
});

describe('createTwoStepConfirm (keyed mode)', () => {
  it('tracks which key is armed and re-arms when the key changes', () => {
    const c = createTwoStepConfirm<string>();
    expect(c.confirm('a')).toBe(false);
    expect(c.isArmed('a')).toBe(true);
    expect(c.isArmed('b')).toBe(false);
    expect(c.confirm('b')).toBe(false);
    expect(c.isArmed('b')).toBe(true);
    expect(c.confirm('b')).toBe(true);
    expect(c.armed()).toBe(false);
  });
});
