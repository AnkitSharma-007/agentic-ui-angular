export interface BudgetForm {
  maxTokens: number | null;
  maxRounds: number | null;
  maxCost: number | null;
}

export type BudgetPreset = 'demo' | 'tight' | 'generous';

export const BUDGET_PRESETS: Record<BudgetPreset, BudgetForm> = {
  demo: { maxTokens: 40000, maxRounds: 6, maxCost: 0.1 },
  tight: { maxTokens: 10000, maxRounds: 3, maxCost: 0.02 },
  generous: { maxTokens: 200000, maxRounds: 8, maxCost: 1.0 },
};

// Budget cap: null = no cap; zero/negative values surface inline error and coerce to null on save.
export function coercePositive(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

export function positiveCapError(
  value: number | null,
): { kind: string; message: string } | null {
  if (value === null) return null;
  return Number.isFinite(value) && value > 0
    ? null
    : {
        kind: 'positiveCap',
        message: 'Enter a value greater than 0, or leave it empty for no cap.',
      };
}
