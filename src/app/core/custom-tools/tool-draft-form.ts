import { applyEach, validate, type SchemaPathTree } from '@angular/forms/signals';
import {
  applyResponseTemplate,
  validateParameterName,
  validateToolName,
  type CustomToolParameterType,
} from './custom-tool.types';

export interface DraftParameter {
  name: string;
  type: CustomToolParameterType;
  description: string;
  required: boolean;
}

export interface ToolDraftModel {
  name: string;
  description: string;
  parameters: DraftParameter[];
  responseTemplate: string;
}

export const TYPE_OPTIONS: readonly { value: CustomToolParameterType; label: string }[] = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'boolean', label: 'boolean' },
];

export function addDraftParam(model: ToolDraftModel): ToolDraftModel {
  return {
    ...model,
    parameters: [
      ...model.parameters,
      { name: '', type: 'string', description: '', required: true },
    ],
  };
}

export function removeDraftParam(model: ToolDraftModel, index: number): ToolDraftModel {
  return { ...model, parameters: model.parameters.filter((_, i) => i !== index) };
}

export function setDraftParamType(
  model: ToolDraftModel,
  index: number,
  type: CustomToolParameterType,
): ToolDraftModel {
  return {
    ...model,
    parameters: model.parameters.map((p, i) => (i === index ? { ...p, type } : p)),
  };
}

export function setDraftParamRequired(
  model: ToolDraftModel,
  index: number,
  required: boolean,
): ToolDraftModel {
  return {
    ...model,
    parameters: model.parameters.map((p, i) => (i === index ? { ...p, required } : p)),
  };
}

export interface TemplatePreview {
  readonly ok: boolean;
  readonly text: string;
}

export function buildTemplatePreview(
  template: string,
  args: Record<string, unknown>,
): TemplatePreview {
  const result = applyResponseTemplate(template, args);
  if (result.ok) {
    try {
      return { ok: true, text: JSON.stringify(result.value, null, 2) };
    } catch {
      return { ok: true, text: String(result.value) };
    }
  }
  return { ok: false, text: result.error };
}

export interface ToolDraftValidatorDeps {
  readonly isNameInUse: (name: string) => boolean;
  readonly nameInUseMessage: string;
  readonly descriptionMessage: string;
}

export function applyToolDraftValidators(
  p: SchemaPathTree<ToolDraftModel>,
  deps: ToolDraftValidatorDeps,
): void {
  validate(p.name, ({ value }) => {
    const name = value().trim();
    const err = validateToolName(name);
    if (err) return { kind: 'toolName', message: err };
    if (deps.isNameInUse(name)) return { kind: 'nameInUse', message: deps.nameInUseMessage };
    return null;
  });
  validate(p.description, ({ value }) =>
    value().trim().length === 0 ? { kind: 'required', message: deps.descriptionMessage } : null,
  );
  applyEach(p.parameters, (param) => {
    validate(param.name, (ctx) => {
      const nm = ctx.value().trim();
      const err = validateParameterName(nm);
      if (err) return { kind: 'paramName', message: err };
      const count = ctx.valueOf(p.parameters).filter((q) => q.name.trim() === nm).length;
      return count > 1 ? { kind: 'dupParam', message: 'Duplicate parameter name.' } : null;
    });
  });
}
