import { Service, signal } from '@angular/core';

// Kept separate so the eagerly-loaded cost meter does not pull @google/genai into the initial bundle.
export const GEMINI_MODELS = [
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (paid)', tier: 'pro' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (free tier)', tier: 'flash' },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite (free tier, lowest cost)',
    tier: 'flash-lite',
  },
] as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[number]['id'];

export const DEFAULT_MODEL: GeminiModelId = 'gemini-3.5-flash';

@Service()
export class ModelSelectionService {
  private readonly _selectedModel = signal<GeminiModelId>(DEFAULT_MODEL);
  readonly selectedModel = this._selectedModel.asReadonly();

  selectModel(model: GeminiModelId): void {
    this._selectedModel.set(model);
  }
}
