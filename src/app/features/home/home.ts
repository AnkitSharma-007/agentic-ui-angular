import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ApiKeyService } from '../../core/services/api-key.service';
import { GeminiService } from '../../core/services/gemini.service';
import { humanizeGeminiError } from '../../core/errors';
import { AgentEventStore, type ToolCallState } from '../../core/streaming/agent-event.store';
import { ToolRegistry } from '../../core/registry/tool-registry';
import { ReplayService } from '../../core/replay/replay.service';
import { TokenAccountantService } from '../../core/observability/token-accountant.service';
import { AgentRegistry } from '../../core/agents/agent-registry.service';
import { play, type ReplaySpeed } from '../../core/replay/replay-player';
import type { AgentEvent } from '../../core/streaming/agent-event';
import type { HistoryContent } from '../../core/streaming/raw-history.reducer';
import { OnboardingComponent } from '../onboarding/onboarding';
import { ThoughtComponent } from '../../shared/thought/thought';
import { MarkdownComponent } from '../../shared/markdown/markdown';
import { AgentGraphComponent } from '../../shared/agent-graph/agent-graph';

const REPLAY_SPEEDS: readonly ReplaySpeed[] = [0.5, 1, 2, 4];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SamplePrompt {
  readonly icon: string;
  readonly label: string;
  readonly text: string;
}

@Component({
  selector: 'app-home',
  imports: [
    FormsModule,
    RouterLink,
    NgComponentOutlet,
    OnboardingComponent,
    ThoughtComponent,
    MarkdownComponent,
    AgentGraphComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  protected readonly apiKey = inject(ApiKeyService);
  protected readonly gemini = inject(GeminiService);
  protected readonly store = inject(AgentEventStore);
  protected readonly registry = inject(ToolRegistry);
  protected readonly replays = inject(ReplayService);
  private readonly tokenAccountant = inject(TokenAccountantService);
  private readonly agents = inject(AgentRegistry);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly promptArea = viewChild<ElementRef<HTMLTextAreaElement>>('promptArea');

  protected readonly prompt = signal('');
  protected readonly lastPrompt = signal('');
  protected readonly showTourBanner = signal(false);
  protected readonly phase = this.store.phase;
  protected readonly responseText = this.store.responseText;
  protected readonly toolCalls = this.store.toolCalls;
  protected readonly displayedToolCalls = computed(() =>
    dedupeIdempotent(this.toolCalls(), 'renderItinerary'),
  );
  protected readonly errorMessage = this.store.error;
  protected readonly stats = this.store.stats;
  protected readonly hasOutput = this.store.hasOutput;
  protected readonly isStreaming = this.store.isStreaming;
  protected readonly isReplaying = this.store.isReplaying;
  protected readonly budgetBreachKind = computed(() => {
    const turn = this.store.currentTurn();
    if (!turn.finishReason?.startsWith('BUDGET_EXCEEDED:')) return null;
    return turn.finishReason.slice('BUDGET_EXCEEDED:'.length);
  });

  protected readonly saveStatus = signal<SaveStatus>('idle');
  protected readonly replaySpeed = signal<ReplaySpeed>(1);
  protected readonly speedOptions = REPLAY_SPEEDS;
  protected readonly activeReplayId = signal<string | null>(null);
  protected readonly canSave = computed(() => {
    return (
      this.phase() === 'complete' &&
      this.hasOutput() &&
      this.lastPrompt().length > 0 &&
      this.activeReplayId() === null
    );
  });

  protected readonly sendShortcutModifier = isMacPlatform() ? '⌘' : 'Ctrl';

  protected readonly samplePrompts: readonly SamplePrompt[] = [
    {
      icon: 'travel',
      label: 'Plan a weekend',
      text: 'Plan a weekend in Goa for 2 vegetarian travellers leaving Bengaluru on 2026-06-13 and returning 2026-06-15. Suggest flights, a hotel, recommend a few must-do activities, and render the itinerary on a map.',
    },
    {
      icon: 'explore',
      label: 'Activities only',
      text: 'I am already in Goa. Suggest 5 activities for foodies and culture lovers over a 2-day stay.',
    },
    {
      icon: 'compare_arrows',
      label: 'Let me choose',
      text: 'Find flights from Bengaluru to Goa on 2026-06-13 for 1 passenger. Show me the options and let me pick one, then book it for Ankit Sharma and show the trip on a map.',
    },
    {
      icon: 'route',
      label: 'Road trip',
      text: 'Plot a long-weekend road trip from Bengaluru to Coorg via Mysuru and back. Render the route on a map with stops for lunch and a coffee-estate stay.',
    },
  ];

  protected readonly canSend = computed(() => {
    return this.apiKey.hasKey() && this.prompt().trim().length > 0 && !this.isStreaming();
  });

  private readonly cancel$ = new Subject<void>();

  ngOnInit(): void {
    this.showTourBanner.set(!hasTourBeenDismissed());

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const replayId = params.get('replay');
        if (replayId) {
          void this.loadAndReplay(replayId);
          return;
        }
        const prefill = params.get('prompt');
        if (prefill && prefill.trim().length > 0) {
          this.applyPromptPrefill(prefill);
        }
      });
  }

  protected dismissTourBanner(): void {
    this.showTourBanner.set(false);
    markTourDismissed();
  }

  private applyPromptPrefill(text: string): void {
    this.prompt.set(text);
    void this.router.navigate([], {
      queryParams: { prompt: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.focusPromptArea();
  }

  protected onOnboardingReady(): void {
    this.focusPromptArea();
  }

  protected useSamplePrompt(prompt: string): void {
    this.prompt.set(prompt);
    this.focusPromptArea();
  }

  // `afterNextRender` waits for the textarea to actually exist in the DOM —
  // a `queueMicrotask` fires before zoneless CD has flushed and silently misses.
  private focusPromptArea(): void {
    afterNextRender(
      () => this.promptArea()?.nativeElement.focus(),
      { injector: this.injector },
    );
  }

  protected cancel(): void {
    this.cancel$.next();
    this.store.markCancelled();
  }

  protected reset(): void {
    this.cancel$.next();
    this.store.reset();
    this.agents.resetForNewTurn();
    this.tokenAccountant.clearLifetime();
    this.tokenAccountant.resetTurn();
    this.saveStatus.set('idle');
    this.lastPrompt.set('');
    this.activeReplayId.set(null);
    if (this.route.snapshot.queryParamMap.has('replay')) {
      void this.router.navigate([], { queryParams: {} });
    }
  }

  protected componentFor(call: ToolCallState) {
    // Touch `loadedNames` so the template re-renders when lazy descriptors
    // finish loading and the tool's component class becomes available.
    void this.registry.loadedNames();
    return this.registry.componentFor(call.name);
  }

  protected inputsFor(call: ToolCallState): Record<string, unknown> {
    return {
      callId: call.callId,
      args: call.args,
      result: call.result,
      status: call.status,
      errorMessage: call.errorMessage,
      interruptReason: call.interruptReason ?? null,
    };
  }

  protected send(): void {
    if (!this.canSend()) return;
    this.cancel$.next();
    const prompt = this.prompt().trim();
    const turnId = newTurnId();

    this.lastPrompt.set(prompt);
    this.saveStatus.set('idle');
    if (this.activeReplayId() !== null) {
      this.activeReplayId.set(null);
      if (this.route.snapshot.queryParamMap.has('replay')) {
        void this.router.navigate([], { queryParams: {} });
      }
    }

    this.gemini
      .streamAgentTurn(prompt, turnId)
      .pipe(takeUntil(this.cancel$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.store.pushEvent(event),
        error: (err) => this.store.markError(humanizeGeminiError(err)),
      });
  }

  protected setSpeed(speed: ReplaySpeed): void {
    this.replaySpeed.set(speed);
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saveStatus.set('saving');
    try {
      // A "saved run" is one prompt + response, so we snapshot only the
      // latest turn from the (potentially multi-turn) store.
      const turnId = this.store.currentTurn().id;
      const allEvents = this.store.events();
      const events = turnId
        ? allEvents.filter((e) => e.turnId === turnId)
        : allEvents;

      const allHistory = this.store.rawHistory();
      const rawHistory = sliceCurrentTurnHistory(allHistory);

      const firstTs = events.at(0)?.ts ?? Date.now();
      const lastTs = events.at(-1)?.ts ?? firstTs;

      await this.replays.save({
        schemaVersion: 1,
        id: newReplayId(),
        title: deriveTitle(this.lastPrompt()),
        savedAt: new Date().toISOString(),
        prompt: this.lastPrompt(),
        model: this.gemini.selectedModel(),
        events,
        rawHistory,
        durationMs: Math.max(0, lastTs - firstTs),
        eventCount: events.length,
        stats: this.stats(),
      });
      this.saveStatus.set('saved');
    } catch {
      this.saveStatus.set('error');
    }
  }

  protected async restart(): Promise<void> {
    const id = this.activeReplayId();
    if (!id) return;
    await this.loadAndReplay(id);
  }

  private async loadAndReplay(id: string): Promise<void> {
    try {
      const payload = await this.replays.load(id);
      if (!payload) {
        this.store.markError(`Replay "${id}" not found.`);
        return;
      }

      this.cancel$.next();
      this.store.reset();
      this.agents.resetForNewTurn();
      this.tokenAccountant.resetTurn();
      this.lastPrompt.set(payload.prompt);
      this.saveStatus.set('idle');
      this.activeReplayId.set(id);

      // Replay never calls `registry.execute()`, so lazy tool descriptors
      // must be pre-warmed or the cards stick on "Loading module…".
      await this.preloadToolDescriptors(payload.events);

      const turnId = newTurnId();
      this.store.beginTurn(turnId, 'replaying');
      this.store.loadRawHistory(payload.rawHistory);

      play(payload.events, { speed: () => this.replaySpeed() })
        .pipe(takeUntil(this.cancel$), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (event) => this.handleReplayEvent(event),
          error: (err) => this.store.markError(humanizeGeminiError(err)),
        });
    } catch (err) {
      this.store.markError(humanizeGeminiError(err));
    }
  }

  private async preloadToolDescriptors(
    events: readonly AgentEvent[],
  ): Promise<void> {
    const toolNames = new Set<string>();
    for (const event of events) {
      if (event.type === 'tool_call' && this.registry.get(event.name)) {
        toolNames.add(event.name);
      }
    }
    if (toolNames.size === 0) return;
    const names = [...toolNames];
    // allSettled so one failure doesn't block siblings — failures land in
    // `registry.failedNames` for the template's "Failed to load" affordance.
    const results = await Promise.allSettled(
      names.map((name) => this.registry.loadImpl(name)),
    );
    for (const [i, result] of results.entries()) {
      if (result.status === 'rejected') {
        console.warn(
          `[replay] Failed to preload tool descriptor "${names[i]}":`,
          result.reason,
        );
      }
    }
  }

  private handleReplayEvent(event: AgentEvent): void {
    this.store.pushEvent(event);
    // Live runs call `agents.switchActive` directly; the saved log only
    // carries the resulting event, so replay re-issues it for the graph.
    if (event.type === 'agent_handoff') {
      this.agents.switchActive({
        turnId: event.turnId,
        toAgentId: event.toAgentId,
        reason: event.reason,
      });
    }
  }
}

function newTurnId(): string {
  return `turn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function newReplayId(): string {
  return `replay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function deriveTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, ' ');
  return trimmed.length <= 60 ? trimmed : trimmed.slice(0, 57).trimEnd() + '…';
}

// Slice of raw history from the last `role: 'user'` entry onwards — the
// current turn's Content[] view. Falls back to the full history if absent.
function sliceCurrentTurnHistory(
  history: readonly HistoryContent[],
): readonly HistoryContent[] {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') return history.slice(i);
  }
  return history;
}

function dedupeIdempotent(
  calls: readonly ToolCallState[],
  idempotentName: string,
): readonly ToolCallState[] {
  let keep: ToolCallState | null = null;
  for (const call of calls) {
    if (call.name !== idempotentName) continue;
    if (!keep) {
      keep = call;
      continue;
    }
    const keepFailed = keep.status === 'error' || keep.status === 'rejected';
    const candFailed = call.status === 'error' || call.status === 'rejected';
    if (keepFailed && !candFailed) keep = call;
    else if (keepFailed === candFailed) keep = call;
  }
  if (!keep) return calls;
  const droppedKeep = keep;
  return calls.filter((c) => c.name !== idempotentName || c.callId === droppedKeep.callId);
}

const TOUR_DISMISSED_KEY = 'atlas.tour.dismissed';

function hasTourBeenDismissed(): boolean {
  try {
    return localStorage.getItem(TOUR_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function markTourDismissed(): void {
  try {
    localStorage.setItem(TOUR_DISMISSED_KEY, '1');
  } catch {
    // ignore — banner will simply reappear next visit
  }
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}
