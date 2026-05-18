import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AgentRegistry } from '../../../core/agents/agent-registry.service';
import type { ToolCallStatus } from '../../../core/streaming/agent-event.store';

@Component({
  selector: 'app-handoff-notice',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './handoff-notice.html',
  styleUrl: './handoff-notice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HandoffNoticeComponent {
  private readonly agents = inject(AgentRegistry);

  // Tool-render contract: every tool component accepts the same inputs blob
  // from `inputsFor()` in HomeComponent so NgComponentOutlet can wire them
  // uniformly. Declare the full shape even if the template only reads args /
  // result / status — dropping the unused ones makes setInput() throw.
  readonly callId = input<string>('');
  readonly args = input<Record<string, unknown>>({});
  readonly result = input<Record<string, unknown> | null>(null);
  readonly status = input<ToolCallStatus>('running');
  readonly errorMessage = input<string | null>(null);
  readonly interruptReason = input<string | null>(null);

  protected readonly toAgentId = computed<string>(() => {
    const r = this.result();
    if (r && typeof r['toAgentId'] === 'string') return r['toAgentId'] as string;
    const a = this.args();
    return typeof a['specialist'] === 'string' ? (a['specialist'] as string) : 'unknown';
  });

  protected readonly reason = computed<string>(() => {
    const r = this.result();
    if (r && typeof r['reason'] === 'string') return r['reason'] as string;
    const a = this.args();
    return typeof a['reason'] === 'string' ? (a['reason'] as string) : '';
  });

  protected readonly toAgent = computed(() => this.agents.get(this.toAgentId()));

  protected readonly fromAgent = computed(() => {
    const match = [...this.agents.transitions()].reverse().find((t) => t.toAgentId === this.toAgentId());
    return match ? this.agents.get(match.fromAgentId) : undefined;
  });
}
