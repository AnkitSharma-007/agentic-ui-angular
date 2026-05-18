import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ObservabilityService } from './observability.service';
import { TokenAccountantService } from './token-accountant.service';
import { AgentEventStore } from '../streaming/agent-event.store';

describe('ObservabilityService', () => {
  let observability: ObservabilityService;
  let tokens: TokenAccountantService;
  let store: AgentEventStore;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    observability = TestBed.inject(ObservabilityService);
    tokens = TestBed.inject(TokenAccountantService);
    store = TestBed.inject(AgentEventStore);
  });

  it('starts with an empty timeline and zero bounds', () => {
    expect(observability.timeline()).toEqual([]);
    expect(observability.bounds()).toEqual({ startedAt: 0, endedAt: 0, durationMs: 0 });
    expect(observability.selectedRow()).toBeNull();
  });

  it('builds one row per recorded round, sorted by startedAt', () => {
    tokens.beginTurn('t1');
    tokens.recordRound({
      turnId: 't1',
      roundIndex: 0,
      startedAt: 100,
      completedAt: 250,
      usage: { inputTokens: 10, outputTokens: 5, thoughtTokens: 2, totalTokens: 17 },
      model: 'gemini-3-flash-preview',
      finishReason: 'STOP',
    });
    tokens.recordRound({
      turnId: 't1',
      roundIndex: 1,
      startedAt: 260,
      completedAt: 320,
      usage: { inputTokens: 4, outputTokens: 3, thoughtTokens: 1, totalTokens: 8 },
      model: 'gemini-3-flash-preview',
      finishReason: 'STOP',
    });

    const rows = observability.timeline();
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe('round');
    expect(rows[0].label).toBe('Round 1');
    expect(rows[1].label).toBe('Round 2');
  });

  it('includes a row per completed tool call', () => {
    store.beginTurn('t1');
    store.pushEvent({
      type: 'tool_call',
      ts: 200,
      turnId: 't1',
      callId: 'c1',
      name: 'searchFlights',
      args: {},
    });
    store.pushEvent({
      type: 'tool_result',
      ts: 250,
      turnId: 't1',
      callId: 'c1',
      result: { ok: true },
    });

    const rows = observability.timeline();
    const toolRow = rows.find((r) => r.kind === 'tool');
    expect(toolRow).toBeDefined();
    expect(toolRow?.label).toBe('searchFlights');
    expect(toolRow?.toolStatus).toBe('complete');
  });

  it('selectRow() updates the selectedRow signal', () => {
    tokens.beginTurn('t1');
    tokens.recordRound({
      turnId: 't1',
      roundIndex: 0,
      startedAt: 100,
      completedAt: 200,
      usage: { inputTokens: 1, outputTokens: 1, thoughtTokens: 0, totalTokens: 2 },
      model: 'gemini-3-flash-preview',
      finishReason: 'STOP',
    });

    observability.selectRow('round:0');
    expect(observability.selectedRow()?.id).toBe('round:0');

    observability.clearSelection();
    expect(observability.selectedRow()).toBeNull();
  });

  it('bounds() spans from earliest start to latest completion', () => {
    tokens.beginTurn('t1');
    tokens.recordRound({
      turnId: 't1',
      roundIndex: 0,
      startedAt: 1000,
      completedAt: 1500,
      usage: { inputTokens: 0, outputTokens: 0, thoughtTokens: 0, totalTokens: 0 },
      model: 'gemini-3-flash-preview',
      finishReason: 'STOP',
    });
    tokens.recordRound({
      turnId: 't1',
      roundIndex: 1,
      startedAt: 1600,
      completedAt: 2000,
      usage: { inputTokens: 0, outputTokens: 0, thoughtTokens: 0, totalTokens: 0 },
      model: 'gemini-3-flash-preview',
      finishReason: 'STOP',
    });

    const bounds = observability.bounds();
    expect(bounds.startedAt).toBe(1000);
    expect(bounds.endedAt).toBe(2000);
    expect(bounds.durationMs).toBe(1000);
  });
});
