import {
  addDraftParam,
  buildTemplatePreview,
  removeDraftParam,
  setDraftParamRequired,
  setDraftParamType,
  type ToolDraftModel,
} from './tool-draft-form';

function model(): ToolDraftModel {
  return {
    name: 'searchWeather',
    description: 'desc',
    parameters: [{ name: 'city', type: 'string', description: '', required: true }],
    responseTemplate: '{"city": {{city}}}',
  };
}

describe('tool-draft-form helpers', () => {
  it('addDraftParam appends a new required string param without mutating the input', () => {
    const before = model();
    const after = addDraftParam(before);
    expect(before.parameters).toHaveLength(1);
    expect(after.parameters).toHaveLength(2);
    expect(after.parameters[1]).toEqual({
      name: '',
      type: 'string',
      description: '',
      required: true,
    });
  });

  it('removeDraftParam drops the param at the given index', () => {
    const after = removeDraftParam(addDraftParam(model()), 0);
    expect(after.parameters).toHaveLength(1);
    expect(after.parameters[0].name).toBe('');
  });

  it('setDraftParamType / setDraftParamRequired update only the target param', () => {
    const typed = setDraftParamType(model(), 0, 'number');
    expect(typed.parameters[0].type).toBe('number');
    const optional = setDraftParamRequired(typed, 0, false);
    expect(optional.parameters[0].required).toBe(false);
    expect(optional.parameters[0].type).toBe('number');
  });

  it('buildTemplatePreview renders substituted JSON for a valid template', () => {
    const preview = buildTemplatePreview('{"city": {{city}}}', { city: 'Goa' });
    expect(preview.ok).toBe(true);
    expect(preview.text).toContain('Goa');
  });

  it('buildTemplatePreview reports an error for an invalid template', () => {
    const preview = buildTemplatePreview('{"broken": }', {});
    expect(preview.ok).toBe(false);
    expect(preview.text.length).toBeGreaterThan(0);
  });
});
