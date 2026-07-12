import { normalizeError } from './errors/normalize-error';

/**
 * @deprecated Legacy adapter — delegates to normalizeError(). New code should use ErrorService.handle / normalizeError.
 */
export function humanizeGeminiError(err: unknown): string {
  return normalizeError(err).userMessage;
}
