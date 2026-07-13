import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ReplayService } from '../../core/replay/replay.service';
import type { ReplaySummary } from '../../core/replay/replay.types';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ReplayListItemComponent } from './replay-list-item/replay-list-item';
import { StorageStateCardComponent } from './storage-state-card/storage-state-card';
import { OperationErrorBannerComponent } from './operation-error-banner/operation-error-banner';

@Component({
  selector: 'app-library',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    PageHeaderComponent,
    ReplayListItemComponent,
    StorageStateCardComponent,
    OperationErrorBannerComponent,
  ],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class LibraryComponent implements OnInit {
  private readonly replays = inject(ReplayService);
  private readonly router = inject(Router);

  protected readonly summaries = this.replays.summaries;
  protected readonly loaded = this.replays.loaded;
  protected readonly unavailable = this.replays.unavailable;
  protected readonly lastError = this.replays.lastError;
  protected readonly refreshFailed = computed(
    () =>
      this.loaded() &&
      this.summaries().length === 0 &&
      !this.unavailable() &&
      this.lastError() !== null,
  );
  protected readonly isEmpty = computed(
    () =>
      this.loaded() &&
      this.summaries().length === 0 &&
      !this.unavailable() &&
      !this.refreshFailed(),
  );
  protected readonly operationError = computed(
    () => this.lastError() !== null && !this.unavailable() && !this.refreshFailed(),
  );

  protected readonly confirmingClear = signal(false);
  protected readonly confirmingDelete = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.replays.refresh();
  }

  protected play(summary: ReplaySummary): void {
    void this.router.navigate(['/'], { queryParams: { replay: summary.id } });
  }

  protected async deleteOne(summary: ReplaySummary, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.confirmingDelete() !== summary.id) {
      this.confirmingDelete.set(summary.id);
      return;
    }
    // Swallow rethrows so the confirm flag still resets; lastError surfaces via operationError.
    try {
      await this.replays.delete(summary.id);
    } catch {
      /* surfaced via operationError banner */
    } finally {
      this.confirmingDelete.set(null);
    }
  }

  protected cancelDelete(event?: Event): void {
    event?.stopPropagation();
    this.confirmingDelete.set(null);
  }

  protected async clearAll(): Promise<void> {
    if (!this.confirmingClear()) {
      this.confirmingClear.set(true);
      return;
    }
    try {
      await this.replays.clear();
    } catch {
      /* surfaced via operationError banner */
    } finally {
      this.confirmingClear.set(false);
    }
  }

  protected cancelClear(): void {
    this.confirmingClear.set(false);
  }

  protected dismissError(): void {
    this.replays.clearError();
  }
}
