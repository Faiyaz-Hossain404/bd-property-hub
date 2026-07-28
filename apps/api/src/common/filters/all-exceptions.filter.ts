import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { describeError } from '../errors/describe-error';
import { isTransientInfrastructureError } from '../errors/transient-error';

/** Advertised on a 503 so well-behaved clients back off rather than hammer. */
const RETRY_AFTER_SECONDS = 5;

const TRANSIENT_MESSAGE = 'Service temporarily unavailable, please retry.';

/** Renders every failure as the `{ error: { code, message } }` envelope. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // A query that failed because the pool was torn down mid-restart is not a
    // server bug — Mongoose already buffered it while the driver reconnected,
    // and it ran out of patience. 503 tells the caller the request is worth
    // repeating, where a 500 tells them it never will be.
    const isTransient =
      !(exception instanceof HttpException) && isTransientInfrastructureError(exception);

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : isTransient
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof payload === 'string'
        ? payload
        : ((payload as { message?: string | string[] })?.message ??
          (isTransient ? TRANSIENT_MESSAGE : 'Internal server error'));

    if (isTransient) {
      response.setHeader('Retry-After', String(RETRY_AFTER_SECONDS));
      // Warn, not error, and without a stack: an outage produces one of these
      // per in-flight request, and burying the real cause under duplicated
      // stacks helps nobody. The connection listeners log the outage itself.
      this.logger.warn(
        `${request.method} ${request.url} — transient infrastructure failure: ${describeError(exception).message}`,
      );
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // 5xx are unexpected — log the stack; 4xx are client errors and stay quiet.
      // Falls back to the message so a non-Error throw still leaves a trace.
      const described = describeError(exception);
      this.logger.error(`${request.method} ${request.url}`, described.stack ?? described.message);
    }

    response.status(status).json({ error: { code: status, message } });
  }
}
