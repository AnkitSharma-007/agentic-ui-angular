import type { FunctionPropertySchema } from '../registry/tool-descriptor';
import type { CustomToolParameterType } from './custom-tool.types';

export const CUSTOM_TOOL_PARAM_TYPES: readonly CustomToolParameterType[] = [
  'string',
  'number',
  'boolean',
];

export const PARAM_TYPE_TO_GEMINI: Record<CustomToolParameterType, FunctionPropertySchema['type']> =
  {
    string: 'STRING',
    number: 'NUMBER',
    boolean: 'BOOLEAN',
  };
