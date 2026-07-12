import { DestroyRef, Service, computed, inject, signal } from '@angular/core';

// Reactive view of browser connectivity, backed by `navigator.onLine` and the
// window `online`/`offline` events. Exposed as signals so templates and the
// send path can gate on it under zoneless change detection.
//
// `navigator.onLine` is a coarse signal (true can still mean "connected to a
// LAN with no internet"), so this gates the *obviously* offline case rather
// than promising full reachability — real request failures still flow through
// the normal error pipeline.
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
