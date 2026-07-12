import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TokenAccountantService, toTokenUsage } from './token-accountant.service';
import { ZERO_USAGE } from './usage.types';

const MODEL = 'gemini-3-flash-preview';

describe('TokenAccountantService', () => {
  let service: TokenAccountantService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenAccountantService);
  });

  it('starts with empty current-turn aggregates and zero lifetime totals', () => {
    expect(service.currentTurn().rounds).toHaveLength(0);
    expect(service.currentTurn().costUsd).toBe(0);
    expect(service.lifetimeTotals()).toEqual(ZERO_USAGE);
    expect(service.lifetimeCostUsd()).toBe(0);
  });

  it('records a round and updates both per-turn and lifetime aggregates', () => {
    service.beginTurn('turn-1');
    const round = service.recordRound({
      turnId: 'turn-1',
      roundIndex: 0,
      startedAt: 1000,
      completedAt: 1800,
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
        thoughtTokens: 200,
        totalTokens: 1700,
      },
      model: MODEL,
      finishReason: 'STOP',
    });

    expect(round.latencyMs).toBe(800);
    expect(round.costUsd).toBeGreaterThan(0);
    expect(service.currentTurn().rounds).toHaveLength(1);
    expect(service.currentTurn().totals.totalTokens).toBe(1700);
    expect(service.lifetimeRounds()).toBe(1);
    expect(service.lifetimeCostUsd()).toBe(round.costUsd);
  });

  it('aggregates multiple rounds correctly', () => {
    service.beginTurn('turn-1');
    service.recordRound({
      turnId: 'turn-1',
      roundIndex: 0,
      startedAt: 1000,
      completedAt: 1500,
      usage: { inputTokens: 100, outputTokens: 50, thoughtTokens: 0, totalTokens: 150 },
      model: MODEL,
      finishReason: 'STOP',
    });
    service.recordRound({
      turnId: 'turn-1',
      roundIndex: 1,
      startedAt: 1600,
      completedAt: 2000,
      usage: { inputTokens: 200, outputTokens: 80, thoughtTokens: 20, totalTokens: 300 },
      model: MODEL,
      finishReason: 'STOP',
    });

    const turn = service.currentTurn();
    expect(turn.rounds).toHaveLength(2);
    expect(turn.totals.totalTokens).toBe(450);
    expect(turn.totals.inputTokens).toBe(300);
    expect(turn.totalLatencyMs).toBe(900);
  });

  it('beginTurn resets the per-turn aggregates without touching lifetime totals', () => {
    service.beginTurn('turn-1');
    service.recordRound({
      turnId: 'turn-1',
      roundIndex: 0,
      startedAt: 0,
      completedAt: 100,
      usage: { inputTokens: 100, outputTokens: 100, thoughtTokens: 0, totalTokens: 200 },
      model: MODEL,
      finishReason: 'STOP',
    });
    const lifetimeBefore = service.lifetimeCostUsd();

    service.beginTurn('turn-2');
    expect(service.currentTurn().rounds).toHaveLength(0);
    expect(service.currentTurn().turnId).toBe('turn-2');
    expect(service.lifetimeCostUsd()).toBe(lifetimeBefore);
  });

  it('clearLifetime wipes only the lifetime totals', () => {
    service.beginTurn('turn-1');
    service.recordRound({
      turnId: 'turn-1',
      roundIndex: 0,
      startedAt: 0,
      completedAt: 100,
      usage: { inputTokens: 100, outputTokens: 100, thoughtTokens: 0, totalTokens: 200 },
      model: MODEL,
      finishReason: 'STOP',
    });

    service.clearLifetime();
    expect(service.lifetimeTotals()).toEqual(ZERO_USAGE);
    expect(service.lifetimeRounds()).toBe(0);
    expect(service.currentTurn().rounds).toHaveLength(1);
  });

  it('toTokenUsage coerces SDK metadata defensively', () => {
    expect(toTokenUsage(undefined)).toEqual(ZERO_USAGE);
    expect(
      toTokenUsage({
        promptTokenCount: 100,
        candidatesTokenCount: 200,
        thoughtsTokenCount: 50,
        totalTokenCount: 350,
      }),
    ).toEqual({
      inputTokens: 100,
      outputTokens: 200,
      thoughtTokens: 50,
      totalTokens: 350,
    });

    // Missing total → sum the parts.
    expect(
      toTokenUsage({
        promptTokenCount: 10,
        candidatesTokenCount: 20,
      }),
    ).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      thoughtTokens: 0,
      totalTokens: 30,
    });
  });
});
