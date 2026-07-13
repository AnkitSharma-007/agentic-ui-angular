import { describe, expect, it } from 'vitest';
import { CUSTOM_TOOL_PARAM_TYPES, PARAM_TYPE_TO_GEMINI } from './param-types';

describe('param-types', () => {
  it('lists every custom-tool parameter type', () => {
    expect(CUSTOM_TOOL_PARAM_TYPES).toEqual(['string', 'number', 'boolean']);
  });

  it('maps each parameter type to its Gemini schema type', () => {
    expect(PARAM_TYPE_TO_GEMINI).toEqual({
      string: 'STRING',
      number: 'NUMBER',
      boolean: 'BOOLEAN',
    });
  });
});
