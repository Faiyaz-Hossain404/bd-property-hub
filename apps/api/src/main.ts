import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

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
  // rawBody keeps the unparsed request bytes on req.rawBody (alongside the parsed
  // body) so the Clerk webhook can verify its Svix signature over the exact
  // payload. Harmless for every other route.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

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
