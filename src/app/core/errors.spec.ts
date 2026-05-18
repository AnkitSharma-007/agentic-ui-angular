import { describe, expect, it } from 'vitest';
import { humanizeGeminiError } from './errors';

describe('humanizeGeminiError', () => {
  it('maps 401 / unauthorized / api key errors', () => {
    expect(humanizeGeminiError(new Error('401 Unauthorized'))).toMatch(
      /Authentication failed/,
    );
    expect(humanizeGeminiError(new Error('Invalid API key'))).toMatch(
      /Authentication failed/,
    );
  });

  it('maps rate-limit errors', () => {
    expect(humanizeGeminiError(new Error('429 Too Many Requests'))).toMatch(
      /rate-limited/,
    );
    expect(humanizeGeminiError(new Error('quota exceeded'))).toMatch(/rate-limited/);
  });

  it('maps network errors', () => {
    expect(humanizeGeminiError(new Error('Failed to fetch'))).toMatch(/Network error/);
    expect(humanizeGeminiError(new Error('network unreachable'))).toMatch(/Network error/);
  });

  it('maps CORS errors', () => {
    expect(humanizeGeminiError(new Error('CORS preflight failed'))).toMatch(
      /Browser blocked/,
    );
  });

  it('falls back to the raw error message for unrecognised shapes', () => {
    expect(humanizeGeminiError(new Error('something weird happened'))).toBe(
      'something weird happened',
    );
  });

  it('returns "Unknown error." when the Error has no message', () => {
    const e = new Error();
    expect(humanizeGeminiError(e)).toBe('Unknown error.');
  });

  it('stringifies non-Error throws', () => {
    expect(humanizeGeminiError('plain string')).toBe('plain string');
    expect(humanizeGeminiError(404)).toBe('404');
  });

  it('extracts the `.message` field from plain-object rejections', () => {
    expect(
      humanizeGeminiError({ code: 401, message: '401 Unauthorized' }),
    ).toMatch(/Authentication failed/);
    expect(humanizeGeminiError({ message: 'something weird' })).toBe(
      'something weird',
    );
  });

  it('JSON-stringifies plain-object rejections that have no usable message', () => {
    expect(humanizeGeminiError({ code: 500, detail: 'oops' })).toBe(
      '{"code":500,"detail":"oops"}',
    );
  });

  it('returns "Unknown error." for null / undefined throws', () => {
    expect(humanizeGeminiError(null)).toBe('Unknown error.');
    expect(humanizeGeminiError(undefined)).toBe('Unknown error.');
  });
});
