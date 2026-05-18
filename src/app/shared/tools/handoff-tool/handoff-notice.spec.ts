import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { HandoffNoticeComponent } from './handoff-notice';
import { AgentRegistry } from '../../../core/agents/agent-registry.service';

describe('HandoffNoticeComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('shows the target agent name when the registry knows it', async () => {
    const fixture = TestBed.createComponent(HandoffNoticeComponent);
    fixture.componentRef.setInput('args', {
      specialist: 'experienceCurator',
      reason: 'User wants activities.',
    });
    fixture.componentRef.setInput('status', 'complete');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Experience Curator');
    expect(fixture.nativeElement.textContent).toContain('User wants activities');
  });

  it('shows the from-agent name when a transition is recorded', async () => {
    const agents = TestBed.inject(AgentRegistry);
    agents.switchActive({
      turnId: 't1',
      toAgentId: 'experienceCurator',
      reason: 'demo',
    });

    const fixture = TestBed.createComponent(HandoffNoticeComponent);
    fixture.componentRef.setInput('args', {
      specialist: 'experienceCurator',
      reason: 'demo',
    });
    fixture.componentRef.setInput('status', 'complete');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Trip Planner');
  });

  it('falls back to a placeholder when the target agent is unknown', async () => {
    const fixture = TestBed.createComponent(HandoffNoticeComponent);
    fixture.componentRef.setInput('args', { specialist: 'unknown-agent', reason: '' });
    fixture.componentRef.setInput('status', 'complete');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('unknown-agent');
  });

  it('accepts the full tool-render inputs contract from HomeComponent.inputsFor()', async () => {
    const fixture = TestBed.createComponent(HandoffNoticeComponent);
    // `inputsFor()` in home.ts sends this exact shape to every tool component
    // via NgComponentOutlet. Each key MUST resolve to a declared input or
    // setInput throws at runtime.
    expect(() => {
      fixture.componentRef.setInput('callId', 'c1');
      fixture.componentRef.setInput('args', { specialist: 'experienceCurator' });
      fixture.componentRef.setInput('result', null);
      fixture.componentRef.setInput('status', 'running');
      fixture.componentRef.setInput('errorMessage', null);
      fixture.componentRef.setInput('interruptReason', null);
    }).not.toThrow();
  });
});
