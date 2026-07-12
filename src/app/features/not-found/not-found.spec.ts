import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundComponent } from './not-found';

describe('NotFoundComponent', () => {
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

  it('renders a 404 with a route back to chat', async () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('404');
    const back = el.querySelector('a[href="/"]');
    expect(back).not.toBeNull();
  });
});
