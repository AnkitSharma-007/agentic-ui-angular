import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_MODEL,
  GEMINI_MODELS,
  ModelSelectionService,
} from './model-selection.service';

describe('ModelSelectionService', () => {
  let service: ModelSelectionService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModelSelectionService);
  });

  it('exposes the documented model list', () => {
    const ids = GEMINI_MODELS.map((m) => m.id);
    expect(ids).toContain('gemini-3.1-pro-preview');
    expect(ids).toContain('gemini-3.5-flash');
    expect(ids).toContain('gemini-3.1-flash-lite');
  });

  it('defaults to the documented default model', () => {
    expect(service.selectedModel()).toBe(DEFAULT_MODEL);
  });

  it('selectModel() updates the signal', () => {
    service.selectModel('gemini-3.1-pro-preview');
    expect(service.selectedModel()).toBe('gemini-3.1-pro-preview');
  });
});
