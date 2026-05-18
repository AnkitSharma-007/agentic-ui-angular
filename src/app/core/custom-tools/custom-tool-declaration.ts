import type {
  FunctionDeclaration,
  FunctionParametersSchema,
  FunctionPropertySchema,
} from '../registry/tool-descriptor';
import type { CustomToolSpec } from './custom-tool.types';

const TYPE_TO_GEMINI: Record<'string' | 'number' | 'boolean', FunctionPropertySchema['type']> = {
  string: 'STRING',
  number: 'NUMBER',
  boolean: 'BOOLEAN',
};

// Zero-dependency translator: kept importable from the eager manifest
// builder so Zod and Material modules stay in the lazy descriptor chunk.
export function specToDeclaration(spec: CustomToolSpec): FunctionDeclaration {
  const properties: Record<string, FunctionPropertySchema> = {};
  const required: string[] = [];
  for (const param of spec.parameters) {
    properties[param.name] = {
      type: TYPE_TO_GEMINI[param.type],
      description: param.description,
    };
    if (param.required) required.push(param.name);
  }
  const parameters: FunctionParametersSchema = {
    type: 'OBJECT',
    properties,
    required: required.length > 0 ? required : undefined,
  };
  return {
    name: spec.name,
    description: spec.description,
    parameters,
  };
}
