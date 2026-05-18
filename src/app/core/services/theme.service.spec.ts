import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeService } from './theme.service';

const STORAGE_KEY = 'agentic-ui.theme-preference';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    document.documentElement.classList.remove('theme-light', 'theme-dark');
  });

  it('defaults to "system" when nothing is persisted', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('system');
  });

  it('hydrates from localStorage on construction', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('dark');
  });

  it('set("dark") applies the dark class to <html> and persists', () => {
    const service = TestBed.inject(ThemeService);
    service.set('dark');
    TestBed.tick();
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('set("light") applies the light class', () => {
    const service = TestBed.inject(ThemeService);
    service.set('light');
    TestBed.tick();
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('cycle() rotates system → light → dark → system', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('system');
    service.cycle();
    expect(service.preference()).toBe('light');
    service.cycle();
    expect(service.preference()).toBe('dark');
    service.cycle();
    expect(service.preference()).toBe('system');
  });

  it('ignores invalid persisted values', () => {
    localStorage.setItem(STORAGE_KEY, 'pink');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('system');
  });
});
