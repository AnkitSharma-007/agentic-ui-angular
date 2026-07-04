import { describe, expect, it } from 'vitest';
import type { ReplayPayload } from './replay.types';
import { isValidReplayPayload, parseReplayPayload, toSummary } from './replay.types';

function makePayload(partial: Partial<ReplayPayload> = {}): ReplayPayload {
  return {
    schemaVersion: 1,
    id: partial.id ?? 'r-1',
    title: partial.title ?? 'Test run',
    savedAt: partial.savedAt ?? '2026-05-10T10:00:00.000Z',
    prompt: partial.prompt ?? 'Plan a weekend in Goa.',
    model: partial.model ?? 'gemini-3-flash-preview',
    events:
      partial.events ?? [
        { type: 'turn_start', ts: 0, turnId: 't1' } as unknown as ReplayPayload['events'][number],
      ],
    rawHistory: partial.rawHistory ?? [],
    durationMs: partial.durationMs ?? 100,
    eventCount: partial.eventCount ?? 1,
    stats: partial.stats ?? { chunks: 1, parts: 1, signedParts: 0 },
  };
}

describe('parseReplayPayload / isValidReplayPayload (C2)', () => {
  it('accepts a well-formed payload and returns it unchanged', () => {
    const payload = makePayload();
    expect(parseReplayPayload(payload)).toBe(payload);
    expect(isValidReplayPayload(payload)).toBe(true);
  });

  it('preserves rich event internals (no stripping) on a valid payload', () => {
    const payload = makePayload({
      events: [
        {
          type: 'tool_call',
          ts: 5,
          turnId: 't1',
          name: 'searchFlights',
          callId: 'c1',
          args: { from: 'DEL' },
        } as unknown as ReplayPayload['events'][number],
      ],
    });
    const parsed = parseReplayPayload(payload);
    expect(parsed).not.toBeNull();
    // Same reference back — the original object with all fields intact.
    expect(parsed).toBe(payload);
    expect((parsed!.events[0] as unknown as { name: string }).name).toBe('searchFlights');
  });

  it('rejects non-objects and missing payloads', () => {
    expect(parseReplayPayload(null)).toBeNull();
    expect(parseReplayPayload(undefined)).toBeNull();
    expect(parseReplayPayload('nope')).toBeNull();
    expect(parseReplayPayload({})).toBeNull();
  });

  it('rejects an incompatible schemaVersion', () => {
    // makePayload() hardcodes schemaVersion: 1, so override it directly.
    expect(parseReplayPayload({ ...makePayload(), schemaVersion: 2 })).toBeNull();
  });

  it('rejects missing/empty id and non-string core fields', () => {
    expect(parseReplayPayload(makePayload({ id: '' }))).toBeNull();
    expect(parseReplayPayload(makePayload({ savedAt: '' }))).toBeNull();
    expect(parseReplayPayload(makePayload({ prompt: 123 as unknown as string }))).toBeNull();
  });

  it('rejects malformed events / rawHistory / stats', () => {
    expect(
      parseReplayPayload(makePayload({ events: [{} as unknown as ReplayPayload['events'][number]] })),
    ).toBeNull();
    expect(
      parseReplayPayload(
        makePayload({ rawHistory: [{} as unknown as ReplayPayload['rawHistory'][number]] }),
      ),
    ).toBeNull();
    expect(
      parseReplayPayload(
        makePayload({ stats: { chunks: 1 } as unknown as ReplayPayload['stats'] }),
      ),
    ).toBeNull();
  });

  it('accepts a payload without the optional customToolSpecs field', () => {
    const payload = makePayload();
    delete (payload as { customToolSpecs?: unknown }).customToolSpecs;
    expect(isValidReplayPayload(payload)).toBe(true);
  });

  it('toSummary drops the heavy fields', () => {
    const summary = toSummary(makePayload({ id: 'thin' }));
    expect(summary).not.toHaveProperty('events');
    expect(summary).not.toHaveProperty('rawHistory');
    expect(summary.id).toBe('thin');
  });
});
