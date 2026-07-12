import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { redactError } from './app/core/logging/redact';

bootstrapApplication(App, appConfig).catch((err: unknown) => reportBootstrapFailure(err));

// Bootstrap failure leaves no DI/logger — log a redacted error and paint a minimal fallback with reload.
function reportBootstrapFailure(err: unknown): void {
  const safe = redactError(err);
  console.error('[atlas] Application failed to start.', safe);
  renderFallback();
}

function renderFallback(): void {
  const host = document.querySelector('app-root') ?? document.body;
  if (!host) return;
  host.textContent = '';

  const panel = document.createElement('div');
  panel.setAttribute('role', 'alert');
  panel.style.cssText = [
    'max-width:32rem',
    'margin:12vh auto 0',
    'padding:1.5rem',
    'border-radius:14px',
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
    'text-align:center',
    'color:#e7e7ea',
    'background:#1a1a1f',
    'border:1px solid #35353d',
  ].join(';');

  const heading = document.createElement('h1');
  heading.textContent = "Atlas couldn't start";
  heading.style.cssText = 'margin:0 0 .5rem;font-size:1.25rem;font-weight:700';

  const body = document.createElement('p');
  body.textContent =
    'Something went wrong while loading the app. Reloading usually fixes it.';
  body.style.cssText = 'margin:0 0 1.25rem;font-size:.95rem;line-height:1.5;color:#b5b5bd';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Reload';
  button.style.cssText = [
    'appearance:none',
    'cursor:pointer',
    'padding:.55rem 1.25rem',
    'border-radius:9px',
    'border:0',
    'font-size:.95rem',
    'font-weight:600',
    'color:#fff',
    'background:#7C5CFF',
  ].join(';');
  button.addEventListener('click', () => location.reload());

  panel.append(heading, body, button);
  host.append(panel);
}
