import { z } from 'zod';
import type { AgentEvent } from '../streaming/agent-event';
import type { HistoryContent } from '../streaming/raw-history.reducer';
import type { CustomToolSpec } from '../custom-tools/custom-tool.types';

export interface ReplayPayload {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly savedAt: string;
  readonly prompt: string;
  readonly model: string;
  readonly events: readonly AgentEvent[];
  readonly rawHistory: readonly HistoryContent[];
  // Embedded custom tool specs so replay cards render after deletion or on another device.
  readonly customToolSpecs?: readonly CustomToolSpec[];
  readonly durationMs: number;
  readonly eventCount: number;
  // Encoded size at save time so the Library can flag heavy replays without loading payloads.
  readonly sizeBytes?: number;
  readonly stats: {
    readonly chunks: number;
    readonly parts: number;
    readonly signedParts: number;
  };
}

export interface ReplaySummary {
  readonly id: string;
  readonly title: string;
  readonly savedAt: string;
  readonly prompt: string;
  readonly model: string;
  readonly durationMs: number;
  readonly eventCount: number;
  readonly sizeBytes?: number;
}

export function toSummary(p: ReplayPayload): ReplaySummary {
  return {
    id: p.id,
    title: p.title,
    savedAt: p.savedAt,
    prompt: p.prompt,
    model: p.model,
    durationMs: p.durationMs,
    eventCount: p.eventCount,
    sizeBytes: p.sizeBytes,
  };
}

// Light structural validation for events/history — enough to survive corrupt rows without re-declaring the full schema.
const eventShape = z.object({ type: z.string() });
const historyShape = z.object({ parts: z.array(z.unknown()) });

const replaySummarySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  savedAt: z.string().min(1),
  prompt: z.string(),
  model: z.string(),
  durationMs: z.number(),
  eventCount: z.number(),
  sizeBytes: z.number().optional(),
});

// Validate summary rows on read — IndexedDB is user-controlled and tampered `savedAt` can crash `byDateDesc`.
export function isValidReplaySummary(value: unknown): value is ReplaySummary {
  return replaySummarySchema.safeParse(value).success;
}

const replayPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string(),
  savedAt: z.string().min(1),
  prompt: z.string(),
  model: z.string(),
  events: z.array(eventShape),
  rawHistory: z.array(historyShape),
  customToolSpecs: z.array(z.unknown()).optional(),
  durationMs: z.number(),
  eventCount: z.number(),
  sizeBytes: z.number().optional(),
  stats: z.object({
    chunks: z.number(),
    parts: z.number(),
    signedParts: z.number(),
  }),
});

// Validate untrusted payloads; return the original object narrowed (not a Zod clone) so event/history internals stay intact.
export function isValidReplayPayload(value: unknown): value is ReplayPayload {
  return replayPayloadSchema.safeParse(value).success;
}

export function parseReplayPayload(value: unknown): ReplayPayload | null {
  return isValidReplayPayload(value) ? value : null;
}
