import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import type { Connection } from 'mongoose';
import type { ListingLocationInput, PublicListing, PublicUser, Role } from '@bdph/types';

import { ResponseEnvelopeInterceptor } from '../../src/common/interceptors/response-envelope.interceptor';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { UsersService } from '../../src/users/users.service';
import { GeoService } from '../../src/geo/geo.service';
import { HealthModule } from '../../src/health/health.module';
import { UsersModule } from '../../src/users/users.module';
import { AuthModule } from '../../src/auth/auth.module';
import { ListingsModule } from '../../src/listings/listings.module';
import { SavedListingsModule } from '../../src/saved/saved-listings.module';
import { SellerVerificationModule } from '../../src/seller-verification/seller-verification.module';
import { GeoModule } from '../../src/geo/geo.module';
import { AdminModule } from '../../src/admin/admin.module';

// Every route resolves under /api/v1 (global prefix + URI versioning, see main.ts).
export const API = '/api/v1';

type Agent = ReturnType<typeof request.agent>;

export interface TestContext {
  app: NestExpressApplication;
  server: ReturnType<NestExpressApplication['getHttpServer']>;
  replset: MongoMemoryReplSet;
  connection: Connection;
}

// A registered user plus a supertest agent that carries their session cookie.
export interface TestActor {
  agent: Agent;
  user: PublicUser;
}

let emailCounter = 0;
function uniqueEmail(): string {
  emailCounter += 1;
  return `e2e_user_${emailCounter}@example.com`;
}

// Boots the real AppModule against an in-memory MongoDB replica set and applies
// the same global setup main.ts does, so requests behave exactly as in production.
export async function startTestApp(): Promise<TestContext> {
  // A single-node replica set (not a standalone) — the moderation and verification
  // flows use multi-document transactions, which Mongo only allows on a replica set.
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

  // Only NODE_ENV and the web base URL are read from the environment by the code
  // under test; everything else (Cloudinary, Resend) degrades gracefully when unset.
  process.env.NODE_ENV = 'test';
  process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

  const moduleRef = await Test.createTestingModule({
    imports: [
      // Mirror AppModule's feature graph, but WITHOUT the Redis-backed rate limiter
      // (registered there as a global APP_GUARD). That keeps the suite hermetic: no
      // Redis, and the auth routes' tight per-IP limit can't trip on supertest's
      // shared client IP. Keep this list in sync with app.module.ts as modules change.
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      MongooseModule.forRoot(replset.getUri(), { dbName: 'bdph_e2e' }),
      HealthModule,
      UsersModule,
      AuthModule,
      ListingsModule,
      SavedListingsModule,
      SellerVerificationModule,
      GeoModule,
      AdminModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();

  const connection = app.get<Connection>(getConnectionToken());
  // Seed the geo taxonomy so listings can be given a real area-level location.
  await app.get(GeoService).seed();

  return { app, server: app.getHttpServer(), replset, connection };
}

export async function stopTestApp(ctx: TestContext): Promise<void> {
  await ctx.app.close();
  await ctx.replset.stop();
}

// Clears mutable collections between tests while keeping the seeded geo taxonomy,
// so each test starts from a clean, isolated state.
export async function resetData(ctx: TestContext): Promise<void> {
  // Keep every seeded geo reference collection — they're seeded once in
  // startTestApp and shared across tests, not per-test mutable state.
  const keep = new Set([
    'divisions',
    'districts',
    'citiesUpazilas',
    'areasThanas',
    'cityCorporations',
  ]);
  for (const [name, collection] of Object.entries(ctx.connection.collections)) {
    if (!keep.has(name)) {
      await collection.deleteMany({});
    }
  }
}

// Registers a fresh user (a fresh agent carrying their session cookie) and, if
// asked, grants extra roles — roles take effect immediately because the session
// guard re-reads the user on every request.
export async function registerUser(ctx: TestContext, roles: Role[] = []): Promise<TestActor> {
  const agent = request.agent(ctx.server);
  const res = await agent
    .post(`${API}/auth/register`)
    .send({ email: uniqueEmail(), password: 'password123', name: 'E2E User' });
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  let user = res.body.data as PublicUser;
  if (roles.length > 0) {
    await grantRoles(ctx, user.id, roles);
    user = await getMe(agent);
  }
  return { agent, user };
}

export async function grantRoles(ctx: TestContext, userId: string, roles: Role[]): Promise<void> {
  const users = ctx.app.get(UsersService);
  for (const role of roles) {
    await users.addRole(userId, role);
  }
}

export async function getMe(agent: Agent): Promise<PublicUser> {
  const res = await agent.get(`${API}/auth/me`);
  return res.body.data as PublicUser;
}

export async function firstDistrictId(ctx: TestContext): Promise<string> {
  const districts = await ctx.app.get(GeoService).listDistricts();
  const first = districts[0];
  if (!first) {
    throw new Error('geo seed produced no districts');
  }
  return first.id;
}

// Returns the first N cities/upazilas seeded under a district — enough to pick one
// (or two, for a drill-down test) without hard-coding ids.
export async function citiesUpazilasIn(ctx: TestContext, districtId: string): Promise<string[]> {
  const rows = await ctx.app.get(GeoService).listCitiesUpazilas(districtId);
  return rows.map((row) => row.id);
}

export async function firstAreaThanaId(ctx: TestContext, cityUpazilaId: string): Promise<string> {
  const rows = await ctx.app.get(GeoService).listAreasThanas(cityUpazilaId);
  const first = rows[0];
  if (!first) {
    throw new Error('geo seed produced no areas/thanas for the city/upazila');
  }
  return first.id;
}

export async function firstCityCorporationId(ctx: TestContext): Promise<string> {
  const rows = await ctx.app.get(GeoService).listCityCorporations();
  const first = rows[0];
  if (!first) {
    throw new Error('geo seed produced no city corporations');
  }
  return first.id;
}

// A seller who has passed verification (KYC) and can therefore submit listings.
export async function createVerifiedSeller(ctx: TestContext, admin: TestActor): Promise<TestActor> {
  const seller = await registerUser(ctx, ['seller']);
  const requested = await seller.agent.post(`${API}/me/verification/request`).send({});
  expectOk(requested.status, 'verification request');
  const approved = await admin.agent
    .post(`${API}/admin/seller-verification/${seller.user.id}/approve`)
    .send({});
  expectOk(approved.status, 'verification approve');
  seller.user = await getMe(seller.agent);
  return seller;
}

// Builds an approved (publicly live) listing owned by a verified seller, taking it
// through the real create → submit → admin-approve pipeline.
export async function createApprovedListing(
  ctx: TestContext,
  seller: TestActor,
  admin: TestActor,
  location?: Partial<ListingLocationInput>,
): Promise<PublicListing> {
  const districtId = await firstDistrictId(ctx);
  const draft = await seller.agent.post(`${API}/listings`).send({
    titleEn: 'E2E Listing',
    assetType: 'apartment',
    transactionType: 'sale',
    // District is required; callers may override/extend with deeper levels.
    location: { districtId, ...location },
  });
  expectOk(draft.status, 'create draft');
  const listingId = (draft.body.data as PublicListing).id;

  const submitted = await seller.agent.post(`${API}/listings/${listingId}/submit`).send({});
  expectOk(submitted.status, 'submit listing');

  const approved = await admin.agent.post(`${API}/admin/moderation/${listingId}/approve`).send({});
  expectOk(approved.status, 'approve listing');
  return approved.body.data as PublicListing;
}

function expectOk(status: number, step: string): void {
  if (status < 200 || status >= 300) {
    throw new Error(`${step} failed with status ${status}`);
  }
}
