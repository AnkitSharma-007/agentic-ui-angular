import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderComponent } from './header';
import { ThemeService } from '../../core/services/theme.service';

describe('HeaderComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    });
  });

  it('renders the toolbar without throwing', async () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeDefined();
  });

  it('setTheme() delegates to ThemeService.set', async () => {
    const theme = TestBed.inject(ThemeService);
    const set = vi.spyOn(theme, 'set');

    const fixture = TestBed.createComponent(HeaderComponent);
    await fixture.whenStable();

    (fixture.componentInstance as unknown as {
      setTheme: (pref: 'light' | 'dark' | 'system') => void;
    }).setTheme('dark');

    expect(set).toHaveBeenCalledWith('dark');
  });
});
