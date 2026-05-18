import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { ObservabilityDrawerComponent } from './observability-drawer';
import { ObservabilityDrawerService } from '../../core/observability/observability-drawer.service';

describe('ObservabilityDrawerComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('marks the drawer as a modal dialog with aria-modal and focus trap wired to isOpen', async () => {
    const drawer = TestBed.inject(ObservabilityDrawerService);
    const fixture = TestBed.createComponent(ObservabilityDrawerComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const aside = (fixture.nativeElement as HTMLElement).querySelector(
      'aside.drawer',
    ) as HTMLElement | null;
    expect(aside).not.toBeNull();
    expect(aside?.getAttribute('role')).toBe('dialog');
    expect(aside?.getAttribute('aria-modal')).toBe('true');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');

    drawer.open();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(aside?.getAttribute('aria-hidden')).toBe('false');
  });

  it('returns focus to the previously-focused element when the drawer closes', async () => {
    const drawer = TestBed.inject(ObservabilityDrawerService);
    const fixture = TestBed.createComponent(ObservabilityDrawerComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    // Stand in for whichever element triggered the drawer (e.g. the cost-meter
    // pill). It must be in the DOM and focusable so .focus() works in jsdom.
    const trigger = document.createElement('button');
    trigger.textContent = 'open dashboard';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    try {
      drawer.open();
      fixture.detectChanges();
      await fixture.whenStable();

      drawer.close();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(trigger);
    } finally {
      trigger.remove();
    }
  });
});
