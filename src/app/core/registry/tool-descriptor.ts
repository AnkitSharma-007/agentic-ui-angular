import type { Type } from '@angular/core';
import type { ZodType } from 'zod';

// Mirror of Gemini's OpenAPI-Lite schema, declared locally so callers don't
// have to import the SDK type.
export interface FunctionDeclaration {
  readonly name: string;
  readonly description: string;
  readonly parameters: FunctionParametersSchema;
}

export interface FunctionParametersSchema {
  readonly type: 'OBJECT';
  readonly properties: Readonly<Record<string, FunctionPropertySchema>>;
  readonly required?: readonly string[];
}

export interface FunctionPropertySchema {
  readonly type: 'STRING' | 'INTEGER' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  readonly description?: string;
  readonly enum?: readonly string[];
  readonly items?: FunctionPropertySchema;
  readonly format?: string;
  readonly properties?: Readonly<Record<string, FunctionPropertySchema>>;
  readonly required?: readonly string[];
}

export interface ToolMeta {
  readonly name: string;
  readonly description: string;
  readonly declaration: FunctionDeclaration;
  readonly interruptive?: boolean;
  readonly interruptReason?: string;
}

export interface ToolManifest<TArgs = unknown, TResult = unknown> extends ToolMeta {
  load(): Promise<ToolDescriptor<TArgs, TResult>>;
}

// Documentation-only shape of the inputs supplied to tool components via
// NgComponentOutlet. Components declare each field as a signal input(), so
// this interface is not used as `implements` — it just documents the surface.
export interface ToolComponentInputs<TArgs = unknown, TResult = unknown> {
  readonly args: TArgs;
  readonly result: TResult | null;
  readonly status: 'running' | 'complete' | 'error';
  readonly errorMessage: string | null;
}

export interface ToolDescriptor<TArgs = unknown, TResult = unknown> extends ToolMeta {
  readonly argsSchema: ZodType<TArgs>;
  readonly component: Type<unknown>;
  execute(args: TArgs, ctx: ToolExecutionContext): Promise<TResult>;
}

export interface ToolExecutionContext {
  readonly callId: string;
  readonly signal: AbortSignal;
}
