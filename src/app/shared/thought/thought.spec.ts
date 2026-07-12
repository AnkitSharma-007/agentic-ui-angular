import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThoughtComponent } from './thought';
import { AgentEventStore } from '../../core/streaming/agent-event.store';

describe('ThoughtComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('renders nothing meaningful when no thought has streamed', async () => {
    const fixture = TestBed.createComponent(ThoughtComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeDefined();
  });

  it('exposes the thoughtText through the store', async () => {
    const store = TestBed.inject(AgentEventStore);
    store.beginTurn('t1');
    store.pushEvent({ type: 'thought_delta', ts: 1, turnId: 't1', chunk: 'planning the route' });

    const fixture = TestBed.createComponent(ThoughtComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('planning the route');
  });
});
