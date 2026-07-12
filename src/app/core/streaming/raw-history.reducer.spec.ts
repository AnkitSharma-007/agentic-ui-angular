import { describe, expect, it } from 'vitest';
import { appendChunkToContent, type HistoryContent } from './raw-history.reducer';
import type { GeminiChunk } from './to-agent-event.operator';

// Folds a chunk stream into a single content via the public reducer.
function reduce(chunks: readonly GeminiChunk[]): HistoryContent {
  let acc: HistoryContent = { role: 'model', parts: [] };
  for (const chunk of chunks) {
    acc = appendChunkToContent(chunk, acc);
  }
  return acc;
}

describe('appendChunkToContent', () => {
  it('returns the same content (no new parts ref) when chunk has no parts', () => {
    const initial = { role: 'model' as const, parts: [{ text: 'hi' }] };
    const out = appendChunkToContent({ candidates: [] }, initial);
    expect(out).toBe(initial);
  });

  it('appends parts in order without mutating the input', () => {
    const initial = { role: 'model' as const, parts: [{ text: 'a' }] };
    const out = appendChunkToContent(
      { candidates: [{ content: { parts: [{ text: 'b' }, { text: 'c' }] } }] },
      initial,
    );
    expect(initial.parts).toEqual([{ text: 'a' }]);
    expect(out.parts).toEqual([{ text: 'a' }, { text: 'b' }, { text: 'c' }]);
  });

  it('ignores non-model candidates (defensive)', () => {
    const initial = { role: 'model' as const, parts: [] };
    const out = appendChunkToContent(
      {
        candidates: [
          { content: { role: 'user', parts: [{ text: 'should-not-appear' }] } },
          { content: { role: 'model', parts: [{ text: 'kept' }] } },
        ],
      },
      initial,
    );
    expect(out.parts).toEqual([{ text: 'kept' }]);
  });
});

describe('signature placement — Scenario A (thinking-only, signature on trailing empty-text)', () => {
  // Scenario A: 3 thought + visible text parts; trailing empty-text carries thoughtSignature (load-bearing in raw history).
  const thoughtSignature = 'A'.repeat(5784);
  const scenarioA: readonly GeminiChunk[] = [
    { candidates: [{ content: { parts: [{ text: '**T1**', thought: true }] } }] },
    { candidates: [{ content: { parts: [{ text: '**T2**', thought: true }] } }] },
    { candidates: [{ content: { parts: [{ text: '**T3**', thought: true }] } }] },
    { candidates: [{ content: { parts: [{ text: 'There is no missing dollar' }] } }] },
    { candidates: [{ content: { parts: [{ text: '. Final word.' }] } }] },
    { candidates: [{ content: { parts: [{ text: '', thoughtSignature }] }, finishReason: 'STOP' }] },
  ];

  it('preserves the empty-text part as the signature carrier', () => {
    const out = reduce(scenarioA);
    const last = out.parts.at(-1);
    expect(last).toBeDefined();
    expect(last?.text).toBe('');
    expect(last?.thoughtSignature).toBe(thoughtSignature);
  });

  it('keeps thought, visible-text, and empty-text parts in order', () => {
    const out = reduce(scenarioA);
    expect(out.parts).toHaveLength(6);
    expect(out.parts[0]).toMatchObject({ thought: true, text: '**T1**' });
    expect(out.parts[3]).toMatchObject({ text: 'There is no missing dollar' });
    expect(out.parts[5]).toMatchObject({ text: '', thoughtSignature });
  });
});

describe('signature placement — Scenario B (thinking + tools, signature on first functionCall)', () => {
  // Scenario B: signature on first parallel functionCall only; later calls and empty-text have none.
  const thoughtSignature = 'B'.repeat(2800);
  const scenarioB: readonly GeminiChunk[] = [
    { candidates: [{ content: { parts: [{ text: '**Defining**', thought: true }] } }] },
    { candidates: [{ content: { parts: [{ text: '**Pinpointing**', thought: true }] } }] },
    {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: { name: 'searchFlights', args: { from: 'BLR', to: 'GOI' } },
                thoughtSignature,
              },
            ],
          },
        },
      ],
    },
    {
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name: 'searchFlights', args: { from: 'GOI', to: 'BLR' } } }],
          },
        },
      ],
    },
    {
      candidates: [
        {
          content: { parts: [{ functionCall: { name: 'searchHotels', args: { city: 'Goa' } } }] },
        },
      ],
    },
    { candidates: [{ content: { parts: [{ text: '' }] }, finishReason: 'STOP' }] },
  ];

  it('puts the signature on the first functionCall part and nowhere else', () => {
    const out = reduce(scenarioB);
    const signed = out.parts.filter((p) => typeof p.thoughtSignature === 'string');
    expect(signed).toHaveLength(1);
    expect(signed[0].functionCall?.name).toBe('searchFlights');
    expect(signed[0].thoughtSignature).toBe(thoughtSignature);
  });

  it('keeps all 6 streamed parts in arrival order', () => {
    const out = reduce(scenarioB);
    expect(out.parts).toHaveLength(6);
    expect(out.parts.map((p) => kind(p))).toEqual([
      'thought',
      'thought',
      'tool:searchFlights',
      'tool:searchFlights',
      'tool:searchHotels',
      'empty-text',
    ]);
  });
});

function kind(part: { text?: string; thought?: boolean; functionCall?: { name?: string } }): string {
  if (part.functionCall) return `tool:${part.functionCall.name ?? '?'}`;
  if (part.thought) return 'thought';
  if (typeof part.text === 'string') return part.text.length === 0 ? 'empty-text' : 'text';
  return 'unknown';
}
