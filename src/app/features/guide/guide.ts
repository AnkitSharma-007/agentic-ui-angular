import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

import { APP_CONFIG } from '../../core/app-config';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { GUIDE_STEPS, GUIDE_DEEP_DIVES } from './guide-content';
import { GuideStepCardComponent } from './guide-step-card/guide-step-card';
import { DeepDiveCardComponent } from './deep-dive-card/deep-dive-card';

@Component({
  selector: 'app-guide',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    PageHeaderComponent,
    GuideStepCardComponent,
    DeepDiveCardComponent,
  ],
  templateUrl: './guide.html',
  styleUrl: './guide.scss',
})
export class GuideComponent {
  protected readonly config = APP_CONFIG;
  protected readonly steps = GUIDE_STEPS;
  protected readonly deepDives = GUIDE_DEEP_DIVES;
}
