import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-storage-state-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './storage-state-card.html',
  styleUrl: './storage-state-card.scss',
})
export class StorageStateCardComponent {
  readonly icon = input.required<string>();
  readonly heading = input.required<string>();
  readonly variant = input.required<'error' | 'empty'>();
  readonly detail = input<string | null>(null);
}
