import { DestroyRef, effect, inject, signal, type Signal } from '@angular/core';

// rAF-coalesced mirror of a reactive source: the first emission is synchronous
// (so initial mount and tests settle immediately) and later changes collapse to
// one animation frame. Must be called in an injection context.
export function coalesceWithRaf<T>(source: () => T, initial: T): Signal<T> {
  const mirror = signal<T>(initial);
  let primed = false;
  let rafHandle: number | null = null;

  effect(() => {
    const value = source();
    if (!primed) {
      primed = true;
      mirror.set(value);
      return;
    }
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null;
      mirror.set(source());
    });
  });

  inject(DestroyRef).onDestroy(() => {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  });

  return mirror.asReadonly();
}
