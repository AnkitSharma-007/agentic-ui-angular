import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-operation-error-banner',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './operation-error-banner.html',
  styleUrl: './operation-error-banner.scss',
})
export class OperationErrorBannerComponent {
  readonly message = input.required<string>();
  readonly dismiss = output<void>();
}
