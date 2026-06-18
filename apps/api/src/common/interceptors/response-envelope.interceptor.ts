import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Wraps successful payloads in the `{ data }` envelope from API_DESIGN.md.
 * Handlers that already return an enveloped shape (`{ data }` / `{ page }` /
 * `{ error }`) are passed through unchanged.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          ('data' in payload || 'page' in payload || 'error' in payload)
        ) {
          return payload;
        }
        return { data: payload };
      }),
    );
  }
}
