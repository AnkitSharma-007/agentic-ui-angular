import type { Type } from '@angular/core';
import type { ZodType } from 'zod';

// Local OpenAPI-Lite mirror so callers need not import the SDK type.
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
  // Singleton: only latest (non-failed) instance shown when agent calls more than once per turn.
  readonly singleton?: boolean;
}

export interface ToolManifest<TArgs = unknown, TResult = unknown> extends ToolMeta {
  load(): Promise<ToolDescriptor<TArgs, TResult>>;
}

// Documents NgComponentOutlet inputs; components use signal input(), not `implements`.
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
