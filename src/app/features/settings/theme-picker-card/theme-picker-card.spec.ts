import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemePickerCardComponent } from './theme-picker-card';
import { ThemeService, type ThemePreference } from '../../../core/services/theme.service';

interface ThemePickerInternals {
  onThemeChange(values: readonly ThemePreference[]): void;
}

describe('ThemePickerCardComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('renders the theme picker as an Angular Aria listbox with an option per theme', async () => {
    const fixture = TestBed.createComponent(ThemePickerCardComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    // @angular/aria ngListbox/ngOption supply ARIA roles + keyboard model.
    expect(el.querySelector('[role="listbox"]')).not.toBeNull();
    expect(el.querySelectorAll('[role="option"]')).toHaveLength(3);
  });

  it('selecting a theme flows through the Aria listbox into ThemeService', async () => {
    const theme = TestBed.inject(ThemeService);
    theme.set('light');

    const fixture = TestBed.createComponent(ThemePickerCardComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ThemePickerInternals;

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

    const fixture = TestBed.createComponent(ThemePickerCardComponent);
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
