import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { EMPTY, Observable, Subject, of } from 'rxjs';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeComponent } from './home';
import { GeminiService } from '../../core/services/gemini.service';
import { ApiKeyService } from '../../core/services/api-key.service';
import { AgentEventStore } from '../../core/streaming/agent-event.store';
import type { AgentEvent } from '../../core/streaming/agent-event';
import type { InlineAttachment } from '../../core/media/attachment.types';

// Narrow view over the component's protected surface used by these tests.
type HomeAccess = {
  prompt: { set: (v: string) => void };
  attachments: (() => readonly InlineAttachment[]) & {
    set: (v: readonly InlineAttachment[]) => void;
  };
  lastPrompt: () => string;
  canSend: () => boolean;
  send: () => void;
  retryLast: () => void;
  cancel: () => void;
};

function makeAttachment(id: string): InlineAttachment {
  return {
    id,
    kind: 'image',
    mimeType: 'image/png',
    dataBase64: 'AAAA',
    name: `${id}.png`,
    sizeBytes: 3,
  };
}

async function createHome(): Promise<{
  instance: HomeAccess;
  gemini: GeminiService;
  store: AgentEventStore;
  apiKey: ApiKeyService;
}> {
  const fixture = TestBed.createComponent(HomeComponent);
  await fixture.whenStable();
  return {
    instance: fixture.componentInstance as unknown as HomeAccess,
    gemini: TestBed.inject(GeminiService),
    store: TestBed.inject(AgentEventStore),
    apiKey: TestBed.inject(ApiKeyService),
  };
}

describe('HomeComponent.send()', () => {
  beforeEach(() => {
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    });
    TestBed.inject(ApiKeyService).setForSession('test-key');
  });

  it('passes { text, attachments } + a turnId, records lastPrompt, and clears one-shot attachments', async () => {
    const { instance, gemini } = await createHome();
    const spy = vi
      .spyOn(gemini, 'streamAgentTurn')
      .mockReturnValue(EMPTY as Observable<AgentEvent>);

    const attachment = makeAttachment('a1');
    instance.prompt.set('Plan a weekend');
    instance.attachments.set([attachment]);

    instance.send();

    expect(spy).toHaveBeenCalledTimes(1);
    const [input, turnId] = spy.mock.calls[0];
    expect(input).toEqual({ text: 'Plan a weekend', attachments: [attachment] });
    expect(typeof turnId).toBe('string');
    expect((turnId as string).length).toBeGreaterThan(0);

    expect(instance.lastPrompt()).toBe('Plan a weekend');
    expect(instance.attachments()).toEqual([]);
  });

  it('pushes streamed events into the store', async () => {
    const { instance, gemini, store } = await createHome();
    const stream = new Subject<AgentEvent>();
    vi.spyOn(gemini, 'streamAgentTurn').mockReturnValue(stream.asObservable());
    const pushSpy = vi.spyOn(store, 'pushEvent');

    instance.prompt.set('hi');
    instance.send();

    const event: AgentEvent = { type: 'text_delta', ts: 1, turnId: 't', chunk: 'hello' };
    stream.next(event);

    expect(pushSpy).toHaveBeenCalledWith(event);
  });

  it('marks the store as errored when the stream fails', async () => {
    const { instance, gemini, store } = await createHome();
    const stream = new Subject<AgentEvent>();
    vi.spyOn(gemini, 'streamAgentTurn').mockReturnValue(stream.asObservable());

    instance.prompt.set('hi');
    instance.send();
    stream.error(new Error('kaboom'));

    expect(store.phase()).toBe('error');
    expect(store.error()).toBeTruthy();
  });

  it('does not send without an API key', async () => {
    const { instance, gemini, apiKey } = await createHome();
    apiKey.clear();
    const spy = vi.spyOn(gemini, 'streamAgentTurn');

    instance.prompt.set('hi');

    expect(instance.canSend()).toBe(false);
    instance.send();
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not send when there is no text and no attachments', async () => {
    const { instance, gemini } = await createHome();
    const spy = vi.spyOn(gemini, 'streamAgentTurn');

    instance.prompt.set('   ');

    expect(instance.canSend()).toBe(false);
    instance.send();
    expect(spy).not.toHaveBeenCalled();
  });

  it('can send with an attachment and no text', async () => {
    const { instance, gemini } = await createHome();
    const spy = vi
      .spyOn(gemini, 'streamAgentTurn')
      .mockReturnValue(EMPTY as Observable<AgentEvent>);

    instance.attachments.set([makeAttachment('only')]);

    expect(instance.canSend()).toBe(true);
    instance.send();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cancel() stops events from reaching the store and marks it cancelled', async () => {
    const { instance, gemini, store } = await createHome();
    const stream = new Subject<AgentEvent>();
    vi.spyOn(gemini, 'streamAgentTurn').mockReturnValue(stream.asObservable());
    const pushSpy = vi.spyOn(store, 'pushEvent');

    instance.prompt.set('hi');
    instance.send();

    instance.cancel();
    expect(store.phase()).toBe('cancelled');

    stream.next({ type: 'text_delta', ts: 1, turnId: 't', chunk: 'late' });
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('retryLast() re-sends the last prompt after a failure', async () => {
    const { instance, gemini } = await createHome();
    const spy = vi
      .spyOn(gemini, 'streamAgentTurn')
      .mockImplementation(() => of() as Observable<AgentEvent>);

    instance.prompt.set('road trip');
    instance.send();
    expect(spy).toHaveBeenCalledTimes(1);

    instance.retryLast();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0]).toEqual({ text: 'road trip', attachments: [] });
  });

  it('retryLast() is a no-op when there is no previous prompt', async () => {
    const { instance, gemini } = await createHome();
    const spy = vi.spyOn(gemini, 'streamAgentTurn');

    instance.retryLast();

    expect(spy).not.toHaveBeenCalled();
  });
});
