import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/header/header';
import { CostMeterComponent } from './shared/cost-meter/cost-meter';
import { ObservabilityDrawerComponent } from './shared/observability-drawer/observability-drawer';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    CostMeterComponent,
    ObservabilityDrawerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
