import type { GeminiChunk, GeminiPart } from './to-agent-event.operator';

export interface HistoryContent {
  readonly role: 'user' | 'model' | 'tool';
  readonly parts: readonly GeminiPart[];
}

// Preserves empty-text parts verbatim — in thinking-only turns Gemini 3
// hangs the trailing thoughtSignature off the empty-text EOS part.
export function appendChunkToContent(
  chunk: GeminiChunk,
  modelContent: HistoryContent,
): HistoryContent {
  const incoming = collectModelParts(chunk);
  if (incoming.length === 0) return modelContent;
  return { ...modelContent, parts: [...modelContent.parts, ...incoming] };
}

function collectModelParts(chunk: GeminiChunk): readonly GeminiPart[] {
  const parts: GeminiPart[] = [];
  for (const candidate of chunk.candidates ?? []) {
    const role = candidate.content?.role ?? 'model';
    if (role !== 'model') continue;
    for (const part of candidate.content?.parts ?? []) {
      parts.push(part);
    }
  }
  return parts;
}
