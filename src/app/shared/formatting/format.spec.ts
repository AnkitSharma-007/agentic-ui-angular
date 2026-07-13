import { describe, expect, it } from 'vitest';
import { formatBytes, formatCurrency, formatElapsedMs } from './format';

describe('formatCurrency', () => {
  it('formats a whole-number currency value', () => {
    expect(formatCurrency(1234, 'INR')).toContain('1,234');
  });
});

describe('formatBytes', () => {
  it('formats bytes / kilobytes / megabytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1024 * 1024 * 3)).toBe('3.0 MB');
  });
});

describe('formatElapsedMs', () => {
  it('formats ms / seconds / minutes', () => {
    expect(formatElapsedMs(150)).toBe('150 ms');
    expect(formatElapsedMs(1500)).toBe('1.5 s');
    expect(formatElapsedMs(125000)).toMatch(/2m \d+s/);
  });
});
