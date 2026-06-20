import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { GeoService } from './geo.service';

// Standalone, idempotent geography seeder (MAP-5).
//
// Run with:  pnpm --filter @bdph/api seed:geo
// Prerequisite: workspace deps must be built first (`pnpm build`) so the
// `@bdph/types` value imports pulled in by AppModule resolve at runtime.
//
// Boots a Nest application context (no HTTP listener) to reuse the app's Mongoose
// connection + env validation, runs the upsert, then exits.
async function run(): Promise<void> {
  const logger = new Logger('GeoSeed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const result = await app.get(GeoService).seed();
    logger.log(
      `Geo seed complete: ${result.divisions} divisions, ${result.districts} districts.`,
    );
  } finally {
    await app.close();
  }
}

run().catch((error) => {
  new Logger('GeoSeed').error('Geo seed failed', error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
