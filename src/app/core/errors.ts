/**
 * Map raw errors thrown by the Gemini SDK or fetch into short, user-facing
 * strings. Keeps every error surface in the UI consistent.
 */
export function humanizeGeminiError(err: unknown): string {
  const message = extractMessage(err);

  if (/401|unauthorized|api key/i.test(message)) {
    return 'Authentication failed. Your API key may be invalid or expired. Open Settings to update it.';
  }
  if (/429|rate.?limit|quota/i.test(message)) {
    return 'Gemini rate-limited the request. Wait a moment and try again, or switch models in Settings.';
  }
  if (/network|fetch|failed to fetch/i.test(message)) {
    return 'Network error reaching Gemini. Check your connection and try again.';
  }
  if (/cors/i.test(message)) {
    return 'Browser blocked the request (CORS). Reload the page and try again.';
  }
  return message || 'Unknown error.';
}

// Plain-object rejections (e.g. `{ code: 401, message: 'unauthorized' }`)
// would otherwise collapse to "[object Object]", so we dig out `.message`
// (or JSON-stringify) before the regex pass.
function extractMessage(err: unknown): string {
  if (err == null) return '';
  if (err instanceof Error) return err.message ?? '';
  if (typeof err === 'string') return err;
  if (typeof err === 'number' || typeof err === 'boolean') return String(err);
  if (typeof err === 'object') {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
    try {
      return JSON.stringify(err);
    } catch {
      return '[unprintable error]';
    }
  }
  return String(err);
}
