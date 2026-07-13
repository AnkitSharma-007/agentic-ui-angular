import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Listbox, Option } from '@angular/aria/listbox';

import { ThemeService, type ThemePreference } from '../../../core/services/theme.service';
import { SettingsCardComponent } from '../settings-card/settings-card';

interface ThemeOption {
  readonly value: ThemePreference;
  readonly label: string;
  readonly icon: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: 'system', label: 'System', icon: 'routine' },
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
];

@Component({
  selector: 'app-theme-picker-card',
  imports: [SettingsCardComponent, MatIconModule, Listbox, Option],
  templateUrl: './theme-picker-card.html',
  styleUrl: './theme-picker-card.scss',
})
export class ThemePickerCardComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly themeOptions = THEME_OPTIONS;

  // Aria Listbox for v22 single-selection; adapt ThemeService's single preference via a 1-element array.
  protected readonly themeSelection = computed<ThemePreference[]>(() => [this.theme.preference()]);

  protected onThemeChange(values: readonly ThemePreference[]): void {
    const next = values[0];
    if (next && next !== this.theme.preference()) {
      this.theme.set(next);
    }
  }
}
