import { describe, expect, it } from 'vitest';
import { summarizeChunk } from './agent-stream';
import type { GeminiChunk } from './to-agent-event.operator';

describe('summarizeChunk', () => {
  it('returns 0/0 for an empty chunk', () => {
    expect(summarizeChunk({} as GeminiChunk)).toEqual({ parts: 0, signedParts: 0 });
    expect(summarizeChunk({ candidates: [] })).toEqual({ parts: 0, signedParts: 0 });
  });

  it('counts every part across every candidate', () => {
    const chunk: GeminiChunk = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'a' }, { text: 'b' }],
          },
        },
        {
          content: {
            role: 'model',
            parts: [{ text: 'c' }],
          },
        },
      ],
    };
    expect(summarizeChunk(chunk)).toEqual({ parts: 3, signedParts: 0 });
  });

  it('flags parts that carry a non-empty thoughtSignature', () => {
    const chunk: GeminiChunk = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              { text: 'plain' },
              { text: 'signed', thoughtSignature: 'sig-123' },
              { text: 'blank-sig', thoughtSignature: '' },
            ],
          },
        },
      ],
    };
    expect(summarizeChunk(chunk)).toEqual({ parts: 3, signedParts: 1 });
  });

  it('handles function-call parts (which have no text)', () => {
    const chunk: GeminiChunk = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ functionCall: { name: 'tool', args: {} } }],
          },
        },
      ],
    };
    expect(summarizeChunk(chunk)).toEqual({ parts: 1, signedParts: 0 });
  });
});
