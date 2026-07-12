import type { HistoryContent } from '../streaming/raw-history.reducer';

// Soft cap: warn when inline media inflates a replay — still save for self-contained playback.
export const REPLAY_WARN_BYTES = 3 * 1024 * 1024;

// Hard cap: refuse persist above this to avoid quota failures and monopolising origin storage.
export const REPLAY_MAX_BYTES = 12 * 1024 * 1024;

// Library-wide caps: evict oldest runs (LRU) on save until count and total bytes are under budget.
export const MAX_REPLAY_COUNT = 50;
export const MAX_TOTAL_REPLAY_BYTES = 60 * 1024 * 1024;

// Rough encoded-size estimate: sum text and inline-media payload lengths.
export function estimateReplayBytes(rawHistory: readonly HistoryContent[]): number {
  let total = 0;
  for (const content of rawHistory) {
    for (const part of content.parts) {
      const text = (part as { readonly text?: string }).text;
      if (typeof text === 'string') total += text.length;
      const data = (part as { readonly inlineData?: { readonly data?: string } }).inlineData
        ?.data;
      if (typeof data === 'string') total += data.length;
    }
  }
  return total;
}

export function replaySizeWarning(rawHistory: readonly HistoryContent[]): string | null {
  const bytes = estimateReplayBytes(rawHistory);
  if (bytes <= REPLAY_WARN_BYTES) return null;
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `Saved with media inline (~${mb} MB). Replays stay self-contained but may load slowly.`;
}

// Non-null when a run exceeds the hard cap — block save and surface this instead of a doomed write.
export function replaySizeError(rawHistory: readonly HistoryContent[]): string | null {
  const bytes = estimateReplayBytes(rawHistory);
  if (bytes <= REPLAY_MAX_BYTES) return null;
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  const limit = Math.round(REPLAY_MAX_BYTES / (1024 * 1024));
  return `This run is too large to save (~${mb} MB, limit ${limit} MB). Try a shorter run or one with fewer inline images.`;
}
