import type { HistoryContent } from '../streaming/raw-history.reducer';

// Base64-inlined media (images/audio) lands in a saved replay's `rawHistory`
// and inflates IndexedDB. We still save — self-contained, replayable runs are
// the whole point — but warn past this soft cap so the user knows the run is
// heavy and may load slowly.
export const REPLAY_WARN_BYTES = 3 * 1024 * 1024; // ~3 MB of encoded payload

// Hard cap: above this we refuse to persist the run rather than push a huge
// blob at IndexedDB (which risks a quota failure that would surface as a
// generic "save failed"). Keeps a single run from monopolising the origin's
// storage budget.
export const REPLAY_MAX_BYTES = 12 * 1024 * 1024; // ~12 MB of encoded payload

// Library-wide caps (N7). Without a ceiling the replay store grows unbounded
// across a long-lived demo profile until it trips IndexedDB's origin quota and
// saves start failing. On save we evict the oldest runs (LRU by savedAt) until
// both the count and the total encoded size are back under budget.
export const MAX_REPLAY_COUNT = 50;
export const MAX_TOTAL_REPLAY_BYTES = 60 * 1024 * 1024; // ~60 MB across all runs

// Approximate the encoded size of a run by summing text and inline-media
// payloads. base64 chars map ~1:1 to bytes for this rough purpose.
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

// Non-null message when a run is too large to persist at all. Callers should
// block the save and surface this instead of attempting a doomed write.
export function replaySizeError(rawHistory: readonly HistoryContent[]): string | null {
  const bytes = estimateReplayBytes(rawHistory);
  if (bytes <= REPLAY_MAX_BYTES) return null;
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  const limit = Math.round(REPLAY_MAX_BYTES / (1024 * 1024));
  return `This run is too large to save (~${mb} MB, limit ${limit} MB). Try a shorter run or one with fewer inline images.`;
}
