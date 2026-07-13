import { computed, signal, type Signal } from '@angular/core';

export interface TwoStepConfirm<K = true> {
  readonly armed: Signal<boolean>;
  isArmed(key?: K): boolean;
  arm(key?: K): void;
  cancel(): void;
  // Returns true when this call commits (was already armed for `key`), false when it only arms.
  confirm(key?: K): boolean;
}

export function createTwoStepConfirm<K = true>(): TwoStepConfirm<K> {
  const armedKey = signal<K | null>(null);
  const defaultKey = true as unknown as K;
  return {
    armed: computed(() => armedKey() !== null),
    isArmed: (key: K = defaultKey) => armedKey() === key,
    arm: (key: K = defaultKey) => armedKey.set(key),
    cancel: () => armedKey.set(null),
    confirm: (key: K = defaultKey): boolean => {
      if (armedKey() === key) {
        armedKey.set(null);
        return true;
      }
      armedKey.set(key);
      return false;
    },
  };
}
