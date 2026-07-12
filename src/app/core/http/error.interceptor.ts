import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from '../errors/error.service';

// Forward-looking seam (inert today — no HttpClient consumer). First HTTP feature inherits normalize+log via ErrorService.
// Re-throws typed AppError; surfacing left to caller (surface: 'none'), mirroring agent stream handling.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errors = inject(ErrorService);
  return next(req).pipe(
    catchError((err: unknown) => {
      const appError = errors.handle(err, {
        surface: 'none',
        context: { source: 'http', method: req.method, url: req.url },
      });
      return throwError(() => appError);
    }),
  );
};
