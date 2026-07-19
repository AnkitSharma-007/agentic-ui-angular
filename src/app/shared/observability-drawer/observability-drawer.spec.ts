import { TestBed } from '@angular/core/testing';
import { ElementRef, provideZonelessChangeDetection } from '@angular/core';
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

  it('resolves the #closeBtn query to the button ElementRef, not the MatIconButton instance', async () => {
    const fixture = TestBed.createComponent(ObservabilityDrawerComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    // #closeBtn sits on a mat-icon-button (a component). Without an explicit
    // `read: ElementRef`, the query returns the MatIconButton instance, whose
    // `.nativeElement` is undefined — so the open-time focus() threw
    // "Cannot read properties of undefined (reading 'focus')".
    const ref = (
      fixture.componentInstance as unknown as {
        closeBtn: () => ElementRef<HTMLButtonElement> | undefined;
      }
    ).closeBtn();

    expect(ref).toBeInstanceOf(ElementRef);
    expect(ref?.nativeElement).toBeInstanceOf(HTMLButtonElement);
  });

  it('returns focus to the previously-focused element when the drawer closes', async () => {
    const drawer = TestBed.inject(ObservabilityDrawerService);
    const fixture = TestBed.createComponent(ObservabilityDrawerComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    // Focusable trigger stand-in for jsdom focus-restore test.
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
