import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetControlsCardComponent } from './budget-controls-card';
import { BudgetService } from '../../../core/observability/budget.service';
import type { BudgetForm } from './budget-form';

interface BudgetInternals {
  readonly budgetModel: {
    (): BudgetForm;
    set: (v: BudgetForm) => void;
    update: (fn: (m: BudgetForm) => BudgetForm) => void;
  };
  readonly budgetSaveStatus: () => 'idle' | 'saved';
  saveBudget(): void;
  resetBudget(): void;
  applyPreset(preset: 'demo' | 'tight' | 'generous'): void;
}

describe('BudgetControlsCardComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('applyPreset("tight") populates inputs and persists via BudgetService', async () => {
    const budget = TestBed.inject(BudgetService);
    const update = vi.spyOn(budget, 'update');

    const fixture = TestBed.createComponent(BudgetControlsCardComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as BudgetInternals;

    inst.applyPreset('tight');
    expect(inst.budgetModel()).toEqual({ maxTokens: 10000, maxRounds: 3, maxCost: 0.02 });
    expect(update).toHaveBeenCalledWith({
      maxTokens: 10000,
      maxRounds: 3,
      maxCostUsd: 0.02,
    });
  });

  it('resetBudget() clears inputs and resets the service', async () => {
    const budget = TestBed.inject(BudgetService);
    const reset = vi.spyOn(budget, 'reset');

    const fixture = TestBed.createComponent(BudgetControlsCardComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as BudgetInternals;
    inst.budgetModel.update((m) => ({ ...m, maxTokens: 1234 }));

    inst.resetBudget();
    expect(reset).toHaveBeenCalledOnce();
    expect(inst.budgetModel()).toEqual({ maxTokens: null, maxRounds: null, maxCost: null });
  });

  it('cancels the pending "saved → idle" timer when the component is destroyed', async () => {
    // Bootstrap under real timers first — fake timers before whenStable() deadlocks zoneless CD.
    const fixture = TestBed.createComponent(BudgetControlsCardComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as BudgetInternals;

    vi.useFakeTimers();
    try {
      inst.saveBudget();
      expect(inst.budgetSaveStatus()).toBe('saved');

      fixture.destroy();

      // Destroyed component's timer must not fire after 1800ms.
      vi.advanceTimersByTime(5000);
      expect(inst.budgetSaveStatus()).toBe('saved');
    } finally {
      vi.useRealTimers();
    }
  });

  it('coalesces back-to-back saves so only the latest timer resets the pill', async () => {
    const fixture = TestBed.createComponent(BudgetControlsCardComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as BudgetInternals;

    vi.useFakeTimers();
    try {
      inst.saveBudget();
      vi.advanceTimersByTime(1000);
      // Second save resets the 1800ms idle timer from the latest save, not the first.
      inst.saveBudget();
      vi.advanceTimersByTime(1000);
      expect(inst.budgetSaveStatus()).toBe('saved');

      vi.advanceTimersByTime(900);
      expect(inst.budgetSaveStatus()).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('saveBudget() ignores zero/negative inputs', async () => {
    const budget = TestBed.inject(BudgetService);
    const update = vi.spyOn(budget, 'update');

    const fixture = TestBed.createComponent(BudgetControlsCardComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as BudgetInternals;
    // Zero/negative caps coerce to null (number inputs yield null for junk like "abc").
    inst.budgetModel.set({ maxTokens: -1, maxRounds: 0, maxCost: null });

    inst.saveBudget();
    expect(update).toHaveBeenCalledWith({
      maxTokens: null,
      maxRounds: null,
      maxCostUsd: null,
    });
  });
});
