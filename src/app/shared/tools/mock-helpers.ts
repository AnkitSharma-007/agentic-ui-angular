/** Shared mock-executor helpers; all respect the abort signal from the agent loop. */

import { abortableSleep } from '../../core/async/abortable-delay';

export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return abortableSleep(ms, signal);
}

export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function deterministicJitter(seed: string, max: number): number {
  return hashString(seed) % max;
}
