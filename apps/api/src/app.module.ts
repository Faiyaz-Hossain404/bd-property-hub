import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ListingsModule } from './listings/listings.module';
import { SavedListingsModule } from './saved/saved-listings.module';
import { GeoModule } from './geo/geo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Root .env shared by the whole monorepo; a local .env can override.
      envFilePath: ['../../.env', '.env'],
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB_NAME,
      }),
    }),
    // Global per-IP rate limit. The default store is in-memory, which has two
    // consequences to revisit before scaling horizontally:
    //   1. Limits are per API instance — on N instances the real budget is
    //      N × limit. Move to a shared store for one global budget.
    //   2. The store has no entry cap, so a flood of distinct IPs grows memory
    //      until entries expire (bounded by ttl, but a reason to move sooner).
    // Both are fixed by the Redis store (@nest-lab/throttler-storage-redis),
    // reusing the already-required REDIS_URL. Values come from the validated env.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL_SECONDS', 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT', 120),
          },
        ],
      }),
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    ListingsModule,
    SavedListingsModule,
    GeoModule,
  ],
  // Apply the rate limiter to every route by default. Individual routes opt out
  // with @SkipThrottle() (health checks) or tighten with @Throttle() (auth).
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
