import { Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { validateEnv } from './config/env.validation';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler-storage';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ListingsModule } from './listings/listings.module';
import { SavedListingsModule } from './saved/saved-listings.module';
import { SellerVerificationModule } from './seller-verification/seller-verification.module';
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
    // Global per-IP rate limit, counted in Redis so every API instance shares one
    // budget (an in-memory store would give N instances N × the limit). Reuses the
    // already-required REDIS_URL. A dedicated client is used, with an 'error'
    // listener so a Redis blip logs instead of crashing the process, and offline
    // queueing disabled so counter reads fail fast (the storage wrapper then
    // degrades open) rather than hanging requests during an outage. Limits come
    // from the validated env.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const logger = new Logger('ThrottlerRedis');
        const client = new Redis(redisUrl!, {
          // Namespace throttler keys so they can't collide with the other
          // consumers of this same Redis (chat-gateway's socket.io adapter,
          // workers' BullMQ queues).
          keyPrefix: 'bdph:throttle:',
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          // Keep reconnecting on outage, with a capped backoff.
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });
        client.on('error', (error: Error) => {
          logger.error(`Redis connection error: ${error.message}`);
        });
        return {
          throttlers: [
            {
              ttl: config.get<number>('THROTTLE_TTL_SECONDS', 60) * 1000,
              limit: config.get<number>('THROTTLE_LIMIT', 120),
            },
          ],
          storage: new RedisThrottlerStorage(new ThrottlerStorageRedisService(client)),
        };
      },
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    ListingsModule,
    SavedListingsModule,
    SellerVerificationModule,
    GeoModule,
  ],
  // Apply the rate limiter to every route by default. Individual routes opt out
  // with @SkipThrottle() (health checks) or tighten with @Throttle() (auth).
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
