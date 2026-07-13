import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SettingsComponent } from './settings';

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

  it('composes the five settings cards', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('app-model-picker-card')).not.toBeNull();
    expect(el.querySelector('app-api-key-status-card')).not.toBeNull();
    expect(el.querySelector('app-budget-controls-card')).not.toBeNull();
    expect(el.querySelector('app-tool-synthesis-card')).not.toBeNull();
    expect(el.querySelector('app-theme-picker-card')).not.toBeNull();
  });

  it('renders each card heading', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Model');
    expect(text).toContain('API key');
    expect(text).toContain('Budget controls');
    expect(text).toContain('Agent tool synthesis');
    expect(text).toContain('Theme');
  });
});
