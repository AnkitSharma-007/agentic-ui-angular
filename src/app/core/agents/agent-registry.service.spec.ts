import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AgentRegistry } from './agent-registry.service';
import { DEFAULT_AGENT_ID } from './agent-definitions';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    registry = TestBed.inject(AgentRegistry);
  });

  it('starts with the default agent active and no transitions', () => {
    expect(registry.activeAgentId()).toBe(DEFAULT_AGENT_ID);
    expect(registry.transitions()).toHaveLength(0);
    expect(registry.activeAgent().id).toBe(DEFAULT_AGENT_ID);
  });

  it('exposes all built-in agents through definitions()', () => {
    const defs = registry.definitions();
    expect(defs.length).toBeGreaterThanOrEqual(2);
    const ids = defs.map((a) => a.id);
    expect(ids).toContain('tripPlanner');
    expect(ids).toContain('experienceCurator');
  });

  it('get() returns the matching definition or undefined', () => {
    expect(registry.get('tripPlanner')?.id).toBe('tripPlanner');
    expect(registry.get('nope')).toBeUndefined();
  });

  it('switchActive() records a transition and updates active id', () => {
    const transition = registry.switchActive({
      turnId: 'turn-1',
      toAgentId: 'experienceCurator',
      reason: 'User asked for activities',
    });
    expect(transition).not.toBeNull();
    expect(transition?.fromAgentId).toBe('tripPlanner');
    expect(transition?.toAgentId).toBe('experienceCurator');
    expect(registry.activeAgentId()).toBe('experienceCurator');
    expect(registry.transitions()).toHaveLength(1);
  });

  it('switchActive() to the same agent is a no-op', () => {
    const transition = registry.switchActive({
      turnId: 'turn-1',
      toAgentId: DEFAULT_AGENT_ID,
      reason: 'self',
    });
    expect(transition).toBeNull();
    expect(registry.transitions()).toHaveLength(0);
  });

  it('switchActive() to an unknown agent is a no-op', () => {
    const transition = registry.switchActive({
      turnId: 'turn-1',
      toAgentId: 'unknown',
      reason: 'nope',
    });
    expect(transition).toBeNull();
    expect(registry.activeAgentId()).toBe(DEFAULT_AGENT_ID);
  });

  it('resetForNewTurn() returns to the default agent and clears transitions', () => {
    registry.switchActive({
      turnId: 'turn-1',
      toAgentId: 'experienceCurator',
      reason: 'first',
    });
    expect(registry.transitions()).toHaveLength(1);

    registry.resetForNewTurn();
    expect(registry.activeAgentId()).toBe(DEFAULT_AGENT_ID);
    expect(registry.transitions()).toHaveLength(0);
  });

  it('preserves transition order on multiple handoffs', () => {
    registry.switchActive({
      turnId: 'turn-1',
      toAgentId: 'experienceCurator',
      reason: 'first',
    });
    registry.switchActive({
      turnId: 'turn-1',
      toAgentId: 'tripPlanner',
      reason: 'back to logistics',
    });
    const transitions = registry.transitions();
    expect(transitions).toHaveLength(2);
    expect(transitions[0].toAgentId).toBe('experienceCurator');
    expect(transitions[1].toAgentId).toBe('tripPlanner');
    expect(registry.activeAgentId()).toBe('tripPlanner');
  });
});
