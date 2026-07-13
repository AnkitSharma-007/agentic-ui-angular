import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import type { DeepDive } from '../guide-content';

@Component({
  selector: 'app-deep-dive-card',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './deep-dive-card.html',
  styleUrl: './deep-dive-card.scss',
})
export class DeepDiveCardComponent {
  readonly dive = input.required<DeepDive>();
}
