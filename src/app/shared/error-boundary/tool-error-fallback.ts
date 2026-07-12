import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

// Fallback card shown when a tool's lazily-loaded module fails to load, so a
// single broken tool degrades to a retryable placeholder instead of an empty
// slot. Kept as a small, self-contained presentational component.
//
// This is the *interim* tool-card boundary. Angular has no first-class render
// error boundary yet: a runtime throw *inside* a rendered tool component still
// propagates to the global ErrorHandler (logged + toast) rather than being
// caught here. When Angular ships a template-level boundary (`@boundary`), this
// component becomes its fallback slot and can also cover render-time throws.
@Component({
  selector: 'app-tool-error-fallback',
  imports: [MatButtonModule],
  templateUrl: './tool-error-fallback.html',
  styleUrl: './tool-error-fallback.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolErrorFallbackComponent {
  readonly toolName = input.required<string>();
  readonly retrying = input(false);
  readonly retry = output<void>();
}
