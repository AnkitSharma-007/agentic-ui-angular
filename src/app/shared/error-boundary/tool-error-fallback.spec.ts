import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolErrorFallbackComponent } from './tool-error-fallback';

describe('ToolErrorFallbackComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('shows the failed tool name and a retry affordance', async () => {
    const fixture = TestBed.createComponent(ToolErrorFallbackComponent);
    fixture.componentRef.setInput('toolName', 'searchFlights');
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('searchFlights');
    expect(text).toContain('Retry load');
  });

  it('emits retry when the button is clicked', async () => {
    const fixture = TestBed.createComponent(ToolErrorFallbackComponent);
    fixture.componentRef.setInput('toolName', 'searchFlights');
    const spy = vi.fn();
    fixture.componentInstance.retry.subscribe(spy);
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    button!.click();

    expect(spy).toHaveBeenCalledOnce();
  });

  it('disables the button and shows a retrying state while retrying', async () => {
    const fixture = TestBed.createComponent(ToolErrorFallbackComponent);
    fixture.componentRef.setInput('toolName', 'searchFlights');
    fixture.componentRef.setInput('retrying', true);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
    expect(el.textContent).toContain('Retrying');
  });
});
