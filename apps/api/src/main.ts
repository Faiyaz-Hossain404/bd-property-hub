import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { installProcessGuards } from './common/bootstrap/process-guards';

/** How long a fatal shutdown may take to drain before the process is forced out. */
const FORCED_EXIT_TIMEOUT_MS = 5_000;

// Translate the TRUST_PROXY env string into the value Express expects. Unset →
// false (trust nothing: req.ip is the socket peer). 'false' → false; a bare
// number → that many proxy hops; anything else (e.g. a subnet) is passed through
// verbatim. Behind a proxy set TRUST_PROXY=1 so req.ip is the real client — leave
// it unset and every client shares the proxy's IP (one rate-limit bucket for all).
//
// `true` is refused in production: it makes Express trust ANY X-Forwarded-For,
// so a client could spoof a fresh IP per request and bypass the rate limit
// entirely. A real deployment always knows its hop count — use that instead.
function resolveTrustProxy(raw: string | undefined): boolean | number | string {
  if (!raw) return false;
  if (raw === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'TRUST_PROXY=true is unsafe in production: clients can spoof X-Forwarded-For to bypass rate limiting. Set it to the number of proxies in front of the API (e.g. TRUST_PROXY=1).',
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      '[security] TRUST_PROXY=true trusts any X-Forwarded-For (rate-limit bypass). Use a hop count like TRUST_PROXY=1 in production.',
    );
    return true;
  }
  if (raw === 'false') return false;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Held in a mutable binding because the guards are installed BEFORE the app
  // exists — an error thrown while Nest is still wiring itself up has to be
  // caught too, and at that point there is nothing to close yet.
  let app: NestExpressApplication | undefined;
  let shuttingDown = false;

  // Last resort for errors that escape Nest: a driver socket error raised
  // outside any request would otherwise reach Node's default handler and kill
  // the process. Transient network/database faults are logged and survived;
  // anything else drains and exits so the orchestrator starts a clean process.
  installProcessGuards({
    logger: new Logger('ProcessGuard'),
    onFatal: () => {
      if (shuttingDown) return;
      shuttingDown = true;

      // Unref'd so it cannot itself hold the process open, and it fires only if
      // the graceful close hangs — a wedged shutdown is worse than a hard exit.
      const forcedExit = setTimeout(() => process.exit(1), FORCED_EXIT_TIMEOUT_MS);
      forcedExit.unref();

      void (async () => {
        try {
          await app?.close();
        } catch (error) {
          logger.error(`Failed to close the application cleanly: ${String(error)}`);
        } finally {
          process.exit(1);
        }
      })();
    },
  });

  // rawBody keeps the unparsed request bytes on req.rawBody (alongside the parsed
  // body) so the Clerk webhook can verify its Svix signature over the exact
  // payload. Harmless for every other route.
  app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Lets SIGTERM (how Render and Docker stop a container) close the Mongo and
  // Redis connections through Nest's shutdown hooks instead of severing them.
  app.enableShutdownHooks();

  // Must be set for IP rate limiting to see the real client IP behind a proxy.
  app.set('trust proxy', resolveTrustProxy(process.env.TRUST_PROXY));

  app.use(helmet());
  app.use(cookieParser());

  // Routes resolve to /api/v1/* (API_DESIGN.md): global prefix + URI versioning.
  app.setGlobalPrefix(process.env.API_GLOBAL_PREFIX ?? 'api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(Number(process.env.API_PORT ?? 4000));
}

void bootstrap();
