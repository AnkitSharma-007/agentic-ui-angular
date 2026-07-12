import { inject } from '@angular/core';
import { Router, type CanActivateFn, type UrlTree } from '@angular/router';
import { ApiKeyService } from '../services/api-key.service';

// Example guard, not wired in app.routes (onboarding is in-component). Ready pattern for future hard key gates.
// Guards never throw — missing key returns UrlTree redirect per error-handling convention.
export const apiKeyGuard: CanActivateFn = (): boolean | UrlTree => {
  const apiKey = inject(ApiKeyService);
  if (apiKey.hasKey()) return true;
  return inject(Router).createUrlTree(['/'], {
    queryParams: { onboarding: 'required' },
  });
};
