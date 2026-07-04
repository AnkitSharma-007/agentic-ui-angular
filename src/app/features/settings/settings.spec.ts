import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsComponent } from './settings';
import { BudgetService } from '../../core/observability/budget.service';
import { GeminiService } from '../../core/services/gemini.service';

interface BudgetForm {
  maxTokens: number | null;
  maxRounds: number | null;
  maxCost: number | null;
}

interface SettingsInternals {
  readonly budgetModel: {
    (): BudgetForm;
    set: (v: BudgetForm) => void;
    update: (fn: (m: BudgetForm) => BudgetForm) => void;
  };
  readonly budgetSaveStatus: () => 'idle' | 'saved';
  saveBudget(): void;
  resetBudget(): void;
  applyPreset(preset: 'demo' | 'tight' | 'generous'): void;
  selectModel(id: 'gemini-3-flash-preview' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite-preview'): void;
}

describe('SettingsComponent', () => {
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

    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;

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

    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;
    inst.budgetModel.update((m) => ({ ...m, maxTokens: 1234 }));

    inst.resetBudget();
    expect(reset).toHaveBeenCalledOnce();
    expect(inst.budgetModel()).toEqual({ maxTokens: null, maxRounds: null, maxCost: null });
  });

  it('selectModel delegates to GeminiService', async () => {
    const gemini = TestBed.inject(GeminiService);
    const select = vi.spyOn(gemini, 'selectModel');

    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;
    inst.selectModel('gemini-3.1-pro-preview');
    expect(select).toHaveBeenCalledWith('gemini-3.1-pro-preview');
  });

  it('cancels the pending "saved → idle" timer when the component is destroyed', async () => {
    // Bootstrap the fixture under real timers first — Angular's zoneless
    // change detection schedules its own work via setTimeout, and freezing
    // those before the component is stable deadlocks whenStable().
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;

    vi.useFakeTimers();
    try {
      inst.saveBudget();
      expect(inst.budgetSaveStatus()).toBe('saved');

      fixture.destroy();

      // After destroy the timer must be cancelled — advancing past 1800ms
      // should NOT touch the (now destroyed) component's signal.
      vi.advanceTimersByTime(5000);
      expect(inst.budgetSaveStatus()).toBe('saved');
    } finally {
      vi.useRealTimers();
    }
  });

  it('coalesces back-to-back saves so only the latest timer resets the pill', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;

    vi.useFakeTimers();
    try {
      inst.saveBudget();
      vi.advanceTimersByTime(1000);
      // Second save before the first timer fires — pill should stay "saved"
      // until 1800ms AFTER the second save (not the first).
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

    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;
    // -1 and 0 are not valid caps; null models the "couldn't parse" case a
    // number input yields for junk like "abc".
    inst.budgetModel.set({ maxTokens: -1, maxRounds: 0, maxCost: null });

    inst.saveBudget();
    expect(update).toHaveBeenCalledWith({
      maxTokens: null,
      maxRounds: null,
      maxCostUsd: null,
    });
  });
});
