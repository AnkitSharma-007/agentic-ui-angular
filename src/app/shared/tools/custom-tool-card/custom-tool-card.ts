import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { ToolCallStatus } from '../../../core/streaming/agent-event.store';

@Component({
  selector: 'app-custom-tool-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './custom-tool-card.html',
  styleUrl: './custom-tool-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomToolCardComponent {
  readonly callId = input<string>('');
  readonly args = input<Record<string, unknown>>({});
  readonly result = input<Record<string, unknown> | null>(null);
  readonly status = input<ToolCallStatus>('running');
  readonly errorMessage = input<string | null>(null);
  readonly interruptReason = input<string | null>(null);

  protected readonly toolName = computed(() => {
    const r = this.result();
    if (r && typeof r['toolName'] === 'string') return r['toolName'] as string;
    return 'Custom tool';
  });

  protected readonly toolDescription = computed(() => {
    const r = this.result();
    if (r && typeof r['toolDescription'] === 'string') return r['toolDescription'] as string;
    return null;
  });

  protected readonly argEntries = computed(() => Object.entries(this.args()));

  protected readonly responseJson = computed(() => {
    const r = this.result();
    if (!r) return null;
    const payload = 'response' in r ? r['response'] : r;
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  });

  protected formatValue(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
