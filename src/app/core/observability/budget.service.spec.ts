import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BudgetService } from './budget.service';

describe('BudgetService', () => {
  let service: BudgetService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(BudgetService);
    service.reset();
  });

  it('defaults to no caps and returns null evaluate()', () => {
    expect(service.config()).toEqual({
      maxTokens: null,
      maxRounds: null,
      maxCostUsd: null,
    });
    expect(service.evaluate({ tokensUsed: 999999, roundsUsed: 99, costUsd: 99 })).toBeNull();
    expect(service.hasAnyLimit()).toBe(false);
  });

  it('update() persists individual caps and hasAnyLimit reflects the change', () => {
    service.update({ maxTokens: 10000 });
    expect(service.config().maxTokens).toBe(10000);
    expect(service.hasAnyLimit()).toBe(true);

    service.update({ maxRounds: 4, maxCostUsd: 0.1 });
    expect(service.config().maxRounds).toBe(4);
    expect(service.config().maxCostUsd).toBe(0.1);
  });

  it('evaluate() reports rounds breach before tokens or cost', () => {
    service.update({ maxTokens: 10000, maxRounds: 3, maxCostUsd: 1.0 });
    const breach = service.evaluate({
      tokensUsed: 50000,
      roundsUsed: 3,
      costUsd: 5.0,
    });
    expect(breach?.kind).toBe('rounds');
    expect(breach?.limit).toBe(3);
    expect(breach?.used).toBe(3);
  });

  it('evaluate() flags a tokens breach when only token cap is exceeded', () => {
    service.update({ maxTokens: 1000 });
    const breach = service.evaluate({
      tokensUsed: 1500,
      roundsUsed: 1,
      costUsd: 0.001,
    });
    expect(breach?.kind).toBe('tokens');
  });

  it('evaluate() flags a cost breach when only cost cap is exceeded', () => {
    service.update({ maxCostUsd: 0.01 });
    const breach = service.evaluate({
      tokensUsed: 100,
      roundsUsed: 1,
      costUsd: 0.05,
    });
    expect(breach?.kind).toBe('cost');
    expect(breach?.limit).toBe(0.01);
  });

  it('utilisation() returns null for unset caps and clamped fractions otherwise', () => {
    service.update({ maxTokens: 1000, maxRounds: 4 });
    const u = service.utilisation({ tokensUsed: 500, roundsUsed: 2, costUsd: 0.0 });
    expect(u.tokens).toBe(0.5);
    expect(u.rounds).toBe(0.5);
    expect(u.cost).toBeNull();
  });

  it('utilisation() clamps to 1.5 for visual overflow', () => {
    service.update({ maxTokens: 100 });
    const u = service.utilisation({ tokensUsed: 1000, roundsUsed: 0, costUsd: 0 });
    expect(u.tokens).toBe(1.5);
  });

  it('reset() returns to defaults', () => {
    service.update({ maxTokens: 1000, maxRounds: 3, maxCostUsd: 0.5 });
    expect(service.hasAnyLimit()).toBe(true);
    service.reset();
    expect(service.config()).toEqual({ maxTokens: null, maxRounds: null, maxCostUsd: null });
    expect(service.hasAnyLimit()).toBe(false);
  });
});
