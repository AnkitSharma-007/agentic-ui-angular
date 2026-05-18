import { type Type } from '@angular/core';
import { z, type ZodType } from 'zod';
import type { ToolDescriptor } from '../registry/tool-descriptor';
import { specToDeclaration } from './custom-tool-declaration';
import { applyResponseTemplate, type CustomToolSpec } from './custom-tool.types';

const TYPE_TO_ZOD: Record<'string' | 'number' | 'boolean', () => ZodType<unknown>> = {
  string: () => z.string(),
  number: () => z.number(),
  boolean: () => z.boolean(),
};

export function specToDescriptor(
  spec: CustomToolSpec,
  cardComponent: Type<unknown>,
): ToolDescriptor {
  return {
    name: spec.name,
    description: spec.description,
    declaration: specToDeclaration(spec),
    argsSchema: specToSchema(spec),
    component: cardComponent,
    async execute(rawArgs) {
      await simulatedLatency();
      const args = (rawArgs ?? {}) as Record<string, unknown>;
      const result = applyResponseTemplate(spec.responseTemplate, args);
      if (!result.ok) {
        throw new Error(`Response template error: ${result.error}`);
      }
      return {
        toolName: spec.name,
        toolDescription: spec.description,
        args,
        response: result.value,
      };
    },
  };
}

function specToSchema(spec: CustomToolSpec): ZodType<unknown> {
  const shape: Record<string, ZodType<unknown>> = {};
  for (const param of spec.parameters) {
    const base = TYPE_TO_ZOD[param.type]();
    shape[param.name] = param.required ? base : base.optional();
  }
  return z.object(shape);
}

function simulatedLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 400));
}
