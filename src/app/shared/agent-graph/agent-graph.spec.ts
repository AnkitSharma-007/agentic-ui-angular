import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { AgentGraphComponent } from './agent-graph';
import { AgentRegistry } from '../../core/agents/agent-registry.service';

describe('AgentGraphComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('renders one chip per built-in agent', async () => {
    const fixture = TestBed.createComponent(AgentGraphComponent);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Trip Planner');
    expect(text).toContain('Experience Curator');
  });

  it('reflects a handoff transition after switchActive', async () => {
    const agents = TestBed.inject(AgentRegistry);
    agents.switchActive({
      turnId: 't1',
      toAgentId: 'experienceCurator',
      reason: 'demo',
    });

    const fixture = TestBed.createComponent(AgentGraphComponent);
    await fixture.whenStable();

    const inst = fixture.componentInstance as unknown as {
      isActive: (id: string) => boolean;
    };
    expect(inst.isActive('experienceCurator')).toBe(true);
    expect(inst.isActive('tripPlanner')).toBe(false);
  });
});
