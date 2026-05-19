import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeService } from './theme.service';

const STORAGE_KEY = 'agentic-ui.theme-preference';

interface FakeMediaQueryList {
  matches: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: Array<(event: { matches: boolean }) => void>;
  addEventListener: (
    name: 'change',
    cb: (event: { matches: boolean }) => void,
  ) => void;
  removeEventListener: (
    name: 'change',
    cb: (event: { matches: boolean }) => void,
  ) => void;
}

function installFakeMatchMedia(initialDark: boolean): FakeMediaQueryList {
  const mql: FakeMediaQueryList = {
    matches: initialDark,
    listeners: [],
    addEventListener(_name, cb) {
      this.listeners.push(cb);
    },
    removeEventListener(_name, cb) {
      this.listeners = this.listeners.filter((l) => l !== cb);
    },
  };
  (window as unknown as { matchMedia: (q: string) => FakeMediaQueryList }).matchMedia =
    () => mql;
  return mql;
}

describe('ThemeService', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    if (originalMatchMedia) {
      (window as unknown as { matchMedia: typeof originalMatchMedia }).matchMedia =
        originalMatchMedia;
    }
    vi.restoreAllMocks();
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

  it('updates resolvedTheme when the OS prefers-color-scheme changes under "system"', () => {
    const mql = installFakeMatchMedia(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);

    expect(service.preference()).toBe('system');
    expect(service.resolvedTheme()).toBe('light');

    for (const listener of mql.listeners) listener({ matches: true });
    mql.matches = true;

    expect(service.resolvedTheme()).toBe('dark');

    for (const listener of mql.listeners) listener({ matches: false });
    mql.matches = false;

    expect(service.resolvedTheme()).toBe('light');
  });

  it('does not flip resolvedTheme when the user picked an explicit mode', () => {
    const mql = installFakeMatchMedia(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);

    service.set('light');
    expect(service.resolvedTheme()).toBe('light');

    for (const listener of mql.listeners) listener({ matches: true });
    mql.matches = true;

    expect(service.resolvedTheme()).toBe('light');
  });
});
