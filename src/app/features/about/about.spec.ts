import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { AboutComponent } from './about';

describe('AboutComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('renders without throwing', async () => {
    const fixture = TestBed.createComponent(AboutComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeDefined();
  });
});
