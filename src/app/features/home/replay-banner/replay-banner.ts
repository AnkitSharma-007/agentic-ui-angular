import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import type { ReplaySpeed } from '../../../core/replay/replay-player';

const REPLAY_SPEEDS: readonly ReplaySpeed[] = [0.5, 1, 2, 4];

@Component({
  selector: 'app-replay-banner',
  imports: [MatButtonModule],
  templateUrl: './replay-banner.html',
  styleUrl: './replay-banner.scss',
})
export class ReplayBannerComponent {
  readonly replaying = input.required<boolean>();
  readonly complete = input(false);
  readonly speed = input.required<ReplaySpeed>();

  readonly speedChange = output<ReplaySpeed>();
  readonly stop = output<void>();
  readonly restart = output<void>();

  protected readonly speedOptions = REPLAY_SPEEDS;
}
