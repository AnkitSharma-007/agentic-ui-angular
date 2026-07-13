import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import type { GuideStep } from '../guide-content';

@Component({
  selector: 'app-guide-step-card',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './guide-step-card.html',
  styleUrl: './guide-step-card.scss',
})
export class GuideStepCardComponent {
  readonly step = input.required<GuideStep>();
}
