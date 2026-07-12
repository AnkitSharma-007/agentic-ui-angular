import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsComponent } from './settings';
import { BudgetService } from '../../core/observability/budget.service';
import { GeminiService } from '../../core/services/gemini.service';
import { ThemeService, type ThemePreference } from '../../core/services/theme.service';

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
  onThemeChange(values: readonly ThemePreference[]): void;
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
    // Bootstrap under real timers first — fake timers before whenStable() deadlocks zoneless CD.
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;

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
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;

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

    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;
    // Zero/negative caps coerce to null (number inputs yield null for junk like "abc").
    inst.budgetModel.set({ maxTokens: -1, maxRounds: 0, maxCost: null });

    inst.saveBudget();
    expect(update).toHaveBeenCalledWith({
      maxTokens: null,
      maxRounds: null,
      maxCostUsd: null,
    });
  });

  it('renders the theme picker as an Angular Aria listbox with an option per theme', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    // @angular/aria ngListbox/ngOption supply ARIA roles + keyboard model.
    expect(el.querySelector('[role="listbox"]')).not.toBeNull();
    expect(el.querySelectorAll('[role="option"]')).toHaveLength(3);
  });

  it('selecting a theme flows through the Aria listbox into ThemeService', async () => {
    const theme = TestBed.inject(ThemeService);
    theme.set('light');

    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as SettingsInternals;

    inst.onThemeChange(['dark']);
    await fixture.whenStable();
    expect(theme.preference()).toBe('dark');

    const selected = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="option"][aria-selected="true"]',
    );
    expect(selected?.textContent).toContain('Dark');
  });

  it('clicking an option selects it via the Aria listbox click handling', async () => {
    const theme = TestBed.inject(ThemeService);
    theme.set('system');

    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const options = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[role="option"]'),
    ) as HTMLElement[];
    const darkOption = options.find((o) => o.textContent?.includes('Dark'));

    darkOption?.click();
    await fixture.whenStable();
    expect(theme.preference()).toBe('dark');
  });
});
