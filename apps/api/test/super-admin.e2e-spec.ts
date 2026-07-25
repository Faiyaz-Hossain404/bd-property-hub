import request from 'supertest';
import type { PublicUser } from '@bdph/types';
import { API, resetData, startTestApp, stopTestApp, type TestContext } from './utils/test-app';
import { UsersService } from '../src/users/users.service';
import { AuthTokenService } from '../src/auth/auth-token.service';

// The email the app is configured to auto-elevate. Set on process.env BEFORE the
// app boots, because UsersService reads SUPER_ADMIN_EMAIL once in its constructor.
const SUPER_ADMIN_EMAIL = 'owner-e2e@example.com';

// End-to-end proof of SUPER_ADMIN_EMAIL auto-elevation against the real app + an
// in-memory Mongo. Elevation is deliberately gated on a VERIFIED account, so the
// suite proves both halves: an unverified registration is NOT elevated (the fix for
// the register-front-running takeover), and once the email is verified the owner is
// granted super_admin (via email verification AND via a later sign-in), with the
// default buyer role preserved. No other email is ever elevated.
describe('Super admin auto-elevation (e2e)', () => {
  let ctx: TestContext;
  const priorEnv = process.env.SUPER_ADMIN_EMAIL;

  beforeAll(async () => {
    process.env.SUPER_ADMIN_EMAIL = SUPER_ADMIN_EMAIL;
    ctx = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(ctx);
    // Restore so this file can't leak the setting into another suite.
    if (priorEnv === undefined) {
      delete process.env.SUPER_ADMIN_EMAIL;
    } else {
      process.env.SUPER_ADMIN_EMAIL = priorEnv;
    }
  });

  beforeEach(async () => {
    await resetData(ctx);
  });

  // Registers the given email and returns the session agent + created user.
  async function register(email: string): Promise<{ agent: ReturnType<typeof request.agent>; user: PublicUser }> {
    const agent = request.agent(ctx.server);
    const res = await agent
      .post(`${API}/auth/register`)
      .send({ email, password: 'password123', name: 'Owner' })
      .expect(201);
    return { agent, user: res.body.data as PublicUser };
  }

  it('does NOT elevate the configured email at registration (email not yet verified)', async () => {
    // The security-critical case: an unverified account — even the configured
    // owner's — must never receive super_admin, or anyone who knows the email could
    // self-register into it before the real owner.
    const { user } = await register(SUPER_ADMIN_EMAIL);
    expect(user.roles).toEqual(['buyer']);
  });

  it('grants super_admin when the owner verifies their email — no re-login needed', async () => {
    const { agent, user } = await register(SUPER_ADMIN_EMAIL);

    // Mint a real email-verify token and confirm it through the public endpoint,
    // exactly as clicking the emailed link would.
    const token = await ctx.app.get(AuthTokenService).issue(user.id, 'email_verify', 3600);
    await request(ctx.server).post(`${API}/auth/verify-email`).send({ token }).expect(200);

    // The original session re-resolves from the DB, so the freshly granted role is
    // visible immediately without signing in again.
    const me = await agent.get(`${API}/auth/me`).expect(200);
    expect((me.body.data as PublicUser).roles).toEqual(expect.arrayContaining(['buyer', 'super_admin']));
  });

  it('grants super_admin when a verified owner signs in on a new device', async () => {
    const { user } = await register(SUPER_ADMIN_EMAIL);
    // Simulate an already-verified account (as if the link was clicked earlier).
    await ctx.app.get(UsersService).markEmailVerified(user.id);

    const fresh = request.agent(ctx.server);
    const login = await fresh
      .post(`${API}/auth/login`)
      .send({ email: SUPER_ADMIN_EMAIL, password: 'password123' })
      .expect(200);
    expect((login.body.data as PublicUser).roles).toContain('super_admin');

    const me = await fresh.get(`${API}/auth/me`).expect(200);
    expect((me.body.data as PublicUser).roles).toContain('super_admin');
  });

  it('matches the configured email case-insensitively', async () => {
    const { user } = await register('Owner-E2E@Example.com');
    await ctx.app.get(UsersService).markEmailVerified(user.id);

    const fresh = request.agent(ctx.server);
    const login = await fresh
      .post(`${API}/auth/login`)
      .send({ email: 'owner-e2e@example.com', password: 'password123' })
      .expect(200);
    expect((login.body.data as PublicUser).roles).toContain('super_admin');
  });

  it('does NOT elevate any other email, even once verified (stays a plain buyer)', async () => {
    const { user } = await register('someone-else@example.com');
    await ctx.app.get(UsersService).markEmailVerified(user.id);

    const fresh = request.agent(ctx.server);
    const login = await fresh
      .post(`${API}/auth/login`)
      .send({ email: 'someone-else@example.com', password: 'password123' })
      .expect(200);
    expect((login.body.data as PublicUser).roles).toEqual(['buyer']);
  });
});
