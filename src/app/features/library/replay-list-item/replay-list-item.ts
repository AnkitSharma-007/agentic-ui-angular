import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import type { ReplaySummary } from '../../../core/replay/replay.types';
import { REPLAY_WARN_BYTES } from '../../../core/replay/replay-size';
import { formatBytes, formatElapsedMs } from '../../../shared/formatting/format';

@Component({
  selector: 'app-replay-list-item',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './replay-list-item.html',
  styleUrl: './replay-list-item.scss',
})
export class ReplayListItemComponent {
  readonly summary = input.required<ReplaySummary>();
  readonly confirming = input(false);

  readonly play = output<void>();
  readonly delete = output<void>();
  readonly cancelDelete = output<void>();

  protected readonly formatDuration = formatElapsedMs;
  protected readonly formatSize = formatBytes;

  // Flag runs past the soft save cap so users know replay may load slowly.
  protected readonly large = computed(() => {
    const bytes = this.summary().sizeBytes;
    return bytes !== undefined && bytes > REPLAY_WARN_BYTES;
  });

  protected formatSavedAt(iso: string): string {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }
}
