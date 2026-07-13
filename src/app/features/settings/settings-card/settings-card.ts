import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-settings-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './settings-card.html',
  styleUrl: './settings-card.scss',
})
export class SettingsCardComponent {
  readonly icon = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input<string>('');
  readonly accent = input(false);
}
