import { describe, expect, it } from 'vitest';
import { approxBytesFromBase64, computeScaledDimensions } from './image-downscale';

describe('computeScaledDimensions', () => {
  it('leaves images within the max edge untouched', () => {
    expect(computeScaledDimensions(800, 600, 1568)).toEqual({ width: 800, height: 600 });
  });

  it('scales by the longest edge, preserving aspect ratio', () => {
    expect(computeScaledDimensions(3136, 1568, 1568)).toEqual({ width: 1568, height: 784 });
  });

  it('scales portrait images by height', () => {
    expect(computeScaledDimensions(1000, 4000, 2000)).toEqual({ width: 500, height: 2000 });
  });

  it('guards against zero-sized inputs', () => {
    expect(computeScaledDimensions(0, 0, 1568)).toEqual({ width: 0, height: 0 });
  });

  it('never produces a sub-pixel dimension', () => {
    const { width, height } = computeScaledDimensions(4000, 1, 100);
    expect(width).toBe(100);
    expect(height).toBe(1);
  });
});

describe('approxBytesFromBase64', () => {
  it('estimates decoded byte length, accounting for padding', () => {
    expect(approxBytesFromBase64('QUJD')).toBe(3); // "ABC"
    expect(approxBytesFromBase64('QUJDRA==')).toBe(4); // "ABCD"
  });
});
