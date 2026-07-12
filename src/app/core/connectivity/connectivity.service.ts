import { DestroyRef, Service, computed, inject, signal } from '@angular/core';

// navigator.onLine + online/offline events as signals for zoneless templates/send gating.
// Coarse signal only — gates obviously-offline case; real failures still go through error pipeline.
@Service()
export class ConnectivityService {
  private readonly _online = signal(readInitialOnline());
  readonly online = this._online.asReadonly();
  readonly offline = computed(() => !this._online());

  constructor() {
    if (typeof window === 'undefined') return;
    const onOnline = () => this._online.set(true);
    const onOffline = () => this._online.set(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    });
  }
}

function readInitialOnline(): boolean {
  // Default to online when the API is unavailable — never falsely block sending.
  return typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean'
    ? true
    : navigator.onLine;
}
