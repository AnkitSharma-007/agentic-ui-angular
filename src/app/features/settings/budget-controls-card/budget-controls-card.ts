import { Component, DestroyRef, inject, signal } from '@angular/core';
import { form, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { BudgetService } from '../../../core/observability/budget.service';
import { SettingsCardComponent } from '../settings-card/settings-card';
import { BudgetCapFieldComponent } from '../budget-cap-field/budget-cap-field';
import {
  BUDGET_PRESETS,
  coercePositive,
  positiveCapError,
  type BudgetForm,
  type BudgetPreset,
} from './budget-form';

@Component({
  selector: 'app-budget-controls-card',
  imports: [SettingsCardComponent, BudgetCapFieldComponent, MatButtonModule, MatIconModule],
  templateUrl: './budget-controls-card.html',
  styleUrl: './budget-controls-card.scss',
})
export class BudgetControlsCardComponent {
  protected readonly budget = inject(BudgetService);

  // Budget caps as Signal Forms: number | null; validates empty or > 0 so bad values surface inline.
  protected readonly budgetModel = signal<BudgetForm>({
    maxTokens: this.budget.config().maxTokens ?? null,
    maxRounds: this.budget.config().maxRounds ?? null,
    maxCost: this.budget.config().maxCostUsd ?? null,
  });

  protected readonly budgetForm = form(this.budgetModel, (p) => {
    validate(p.maxTokens, ({ value }) => positiveCapError(value()));
    validate(p.maxRounds, ({ value }) => positiveCapError(value()));
    validate(p.maxCost, ({ value }) => positiveCapError(value()));
  });

  protected readonly budgetSaveStatus = signal<'idle' | 'saved'>('idle');

  // Tracked so the timer is cancelled on destroy and coalesced across saves.
  private saveStatusTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearSaveStatusTimer());
  }

  protected saveBudget(): void {
    const m = this.budgetModel();
    this.budget.update({
      maxTokens: coercePositive(m.maxTokens),
      maxRounds: coercePositive(m.maxRounds),
      maxCostUsd: coercePositive(m.maxCost),
    });
    this.flashSaved();
  }

  protected resetBudget(): void {
    this.budget.reset();
    this.budgetModel.set({ maxTokens: null, maxRounds: null, maxCost: null });
    this.flashSaved();
  }

  protected applyPreset(preset: BudgetPreset): void {
    this.budgetModel.set({ ...BUDGET_PRESETS[preset] });
    this.saveBudget();
  }

  private flashSaved(): void {
    this.clearSaveStatusTimer();
    this.budgetSaveStatus.set('saved');
    this.saveStatusTimer = setTimeout(() => {
      this.budgetSaveStatus.set('idle');
      this.saveStatusTimer = null;
    }, 1800);
  }

  private clearSaveStatusTimer(): void {
    if (this.saveStatusTimer !== null) {
      clearTimeout(this.saveStatusTimer);
      this.saveStatusTimer = null;
    }
  }
}
