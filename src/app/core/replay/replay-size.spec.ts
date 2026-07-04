import { describe, expect, it } from 'vitest';
import type { HistoryContent } from '../streaming/raw-history.reducer';
import { REPLAY_WARN_BYTES, estimateReplayBytes, replaySizeWarning } from './replay-size';

describe('estimateReplayBytes', () => {
  it('sums text and inline-media payload lengths', () => {
    const history: readonly HistoryContent[] = [
      { role: 'user', parts: [{ text: 'hello' }, { inlineData: { mimeType: 'image/jpeg', data: 'ABCD' } }] },
      { role: 'model', parts: [{ text: 'hi' }] },
    ];
    expect(estimateReplayBytes(history)).toBe('hello'.length + 'ABCD'.length + 'hi'.length);
  });

  it('is zero for empty history', () => {
    expect(estimateReplayBytes([])).toBe(0);
  });
});

describe('replaySizeWarning', () => {
  it('returns null when under the soft cap', () => {
    const history: readonly HistoryContent[] = [{ role: 'user', parts: [{ text: 'tiny' }] }];
    expect(replaySizeWarning(history)).toBeNull();
  });

  it('warns (without blocking) when media pushes the run over the cap', () => {
    const big = 'x'.repeat(REPLAY_WARN_BYTES + 1);
    const history: readonly HistoryContent[] = [
      { role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: big } }] },
    ];
    const warning = replaySizeWarning(history);
    expect(warning).toMatch(/inline/i);
    expect(warning).toMatch(/MB/);
  });
});
