import type { GeminiChunk } from './to-agent-event.operator';

export function summarizeChunk(chunk: GeminiChunk): {
  readonly parts: number;
  readonly signedParts: number;
} {
  let parts = 0;
  let signedParts = 0;
  for (const candidate of chunk.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      parts++;
      if (typeof part.thoughtSignature === 'string' && part.thoughtSignature.length > 0) {
        signedParts++;
      }
    }
  }
  return { parts, signedParts };
}
