import type { HistoryContent } from '../streaming/raw-history.reducer';

// Base64-inlined media (images/audio) lands in a saved replay's `rawHistory`
// and inflates IndexedDB. We still save — self-contained, replayable runs are
// the whole point — but warn past this soft cap so the user knows the run is
// heavy and may load slowly.
export const REPLAY_WARN_BYTES = 3 * 1024 * 1024; // ~3 MB of encoded payload

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
