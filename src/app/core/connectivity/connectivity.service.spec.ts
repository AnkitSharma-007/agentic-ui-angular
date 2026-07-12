import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('initializes from navigator.onLine', () => {
    const svc = TestBed.inject(ConnectivityService);
    expect(svc.online()).toBe(navigator.onLine);
    expect(svc.offline()).toBe(!navigator.onLine);
  });

  it('flips to offline on the window offline event, and back on online', () => {
    const svc = TestBed.inject(ConnectivityService);

    window.dispatchEvent(new Event('offline'));
    expect(svc.online()).toBe(false);
    expect(svc.offline()).toBe(true);

    window.dispatchEvent(new Event('online'));
    expect(svc.online()).toBe(true);
    expect(svc.offline()).toBe(false);
  });

  it('stops reacting to events after it is destroyed', () => {
    const svc = TestBed.inject(ConnectivityService);
    expect(svc.online()).toBe(true);

    // Tearing down the injector must remove the window listeners.
    TestBed.resetTestingModule();
    window.dispatchEvent(new Event('offline'));

    // The destroyed instance's signal is untouched by the post-destroy event.
    expect(svc.online()).toBe(true);
  });
});
