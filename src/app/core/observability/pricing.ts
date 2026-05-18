import type { TokenUsage } from './usage.types';

export interface ModelPricing {
  readonly inputPerMTok: number;
  readonly outputPerMTok: number;
  readonly thoughtPerMTok: number;
  readonly contextWindow: number;
}

// Per-million-token pricing in USD. Source: https://ai.google.dev/gemini-api/docs/pricing
export const PRICING: Readonly<Record<string, ModelPricing>> = {
  'gemini-3.1-pro-preview': {
    inputPerMTok: 2.0,
    outputPerMTok: 12.0,
    thoughtPerMTok: 12.0,
    contextWindow: 1_000_000,
  },
  'gemini-3-flash-preview': {
    inputPerMTok: 0.3,
    outputPerMTok: 2.5,
    thoughtPerMTok: 2.5,
    contextWindow: 1_000_000,
  },
  'gemini-3.1-flash-lite-preview': {
    inputPerMTok: 0.1,
    outputPerMTok: 0.4,
    thoughtPerMTok: 0.4,
    contextWindow: 1_000_000,
  },
} as const;

// Defensive fallback for unrecognised model ids — prefer overcount to undercount.
const FALLBACK_PRICING: ModelPricing = {
  inputPerMTok: 2.0,
  outputPerMTok: 12.0,
  thoughtPerMTok: 12.0,
  contextWindow: 1_000_000,
};

export function pricingFor(model: string): ModelPricing {
  return PRICING[model] ?? FALLBACK_PRICING;
}

export function costUsd(usage: TokenUsage, model: string): number {
  const p = pricingFor(model);
  return (
    (usage.inputTokens / 1_000_000) * p.inputPerMTok +
    (usage.outputTokens / 1_000_000) * p.outputPerMTok +
    (usage.thoughtTokens / 1_000_000) * p.thoughtPerMTok
  );
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
