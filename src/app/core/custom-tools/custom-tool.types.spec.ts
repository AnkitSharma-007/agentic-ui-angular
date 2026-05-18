import { describe, it, expect } from 'vitest';
import {
  applyResponseTemplate,
  validateParameterName,
  validateToolName,
} from './custom-tool.types';

describe('validateToolName', () => {
  it('accepts conforming names', () => {
    expect(validateToolName('searchWeather')).toBeNull();
    expect(validateToolName('_private')).toBeNull();
    expect(validateToolName('a')).toBeNull();
  });

  it('rejects empty names', () => {
    expect(validateToolName('')).toBe('Required.');
  });

  it('rejects names starting with a digit', () => {
    expect(validateToolName('1tool')).toMatch(/letters, digits/i);
  });

  it('rejects names with special characters', () => {
    expect(validateToolName('tool-name')).not.toBeNull();
    expect(validateToolName('tool name')).not.toBeNull();
    expect(validateToolName('tool$name')).not.toBeNull();
  });

  it('rejects names over 64 characters', () => {
    const longName = 'a'.repeat(65);
    expect(validateToolName(longName)).toBe('Max 64 characters.');
  });
});

describe('validateParameterName', () => {
  it('accepts conforming names', () => {
    expect(validateParameterName('city')).toBeNull();
    expect(validateParameterName('_x')).toBeNull();
  });

  it('rejects empty names', () => {
    expect(validateParameterName('')).toBe('Required.');
  });

  it('rejects names with special characters', () => {
    expect(validateParameterName('not-allowed')).not.toBeNull();
  });
});

describe('applyResponseTemplate', () => {
  it('substitutes {{paramName}} placeholders with arg values', () => {
    const result = applyResponseTemplate(
      '{"city": {{city}}, "temp": {{temp}}}',
      { city: 'Goa', temp: 28 },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ city: 'Goa', temp: 28 });
    }
  });

  it('substitutes booleans correctly', () => {
    const result = applyResponseTemplate('{"flag": {{flag}}}', { flag: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ flag: true });
  });

  it('passes through literal JSON when no placeholders match', () => {
    const result = applyResponseTemplate('{"static": "value"}', {});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ static: 'value' });
  });

  it('replaces missing placeholders with null', () => {
    const result = applyResponseTemplate('{"missing": {{x}}}', {});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ missing: null });
  });

  it('reports an error when the substituted template is invalid JSON', () => {
    const result = applyResponseTemplate('not json', {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it('handles strings with quotes by JSON-encoding them', () => {
    const result = applyResponseTemplate(
      '{"msg": {{msg}}}',
      { msg: 'hello "world"' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ msg: 'hello "world"' });
  });
});
