import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { GuideComponent } from './guide';

describe('GuideComponent', () => {
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

  it('renders the eight tour steps with their titles', async () => {
    const fixture = TestBed.createComponent(GuideComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Plan a weekend');
    expect(text).toContain('Open the Observability dashboard');
    expect(text).toContain('Build a custom tool');
    expect(text).toContain('Set a budget');
    const stepNodes = (fixture.nativeElement as HTMLElement).querySelectorAll('.step');
    expect(stepNodes.length).toBe(8);
  });

  it('renders deeper-dive shortcuts', async () => {
    const fixture = TestBed.createComponent(GuideComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.dive-card');
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('mentions only budget presets that actually exist in Settings', async () => {
    const fixture = TestBed.createComponent(GuideComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    // The Settings page exposes Tight / Demo / Generous presets — the older
    // copy referenced a "Loose" preset that never shipped.
    expect(text).toMatch(/Tight\s*\/\s*Demo\s*\/\s*Generous/);
    expect(text).not.toContain('Loose');
  });
});
