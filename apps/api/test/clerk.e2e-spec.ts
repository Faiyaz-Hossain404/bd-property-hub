import request from 'supertest';
import { Webhook } from 'svix';
import type { PublicUser } from '@bdph/types';

// Mock the Clerk Backend SDK so the bridge endpoint's token verification and
// profile fetch are deterministic (no network / no JWKS). Svix is left REAL so the
// webhook tests exercise genuine signature verification. `mockGetUser` is shared so
// changing its resolved value per test still reaches the (cached) Clerk client.
const mockGetUser = jest.fn();
jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
  createClerkClient: jest.fn(() => ({ users: { getUser: mockGetUser } })),
}));

import { verifyToken } from '@clerk/backend';
import { UsersService } from '../src/users/users.service';
import { API, registerUser, resetData, startTestApp, stopTestApp } from './utils/test-app';
import type { TestContext } from './utils/test-app';

const mockVerifyToken = verifyToken as jest.Mock;

// A valid Svix signing secret (whsec_ + base64) — used both by the app (via env)
// and to sign payloads in-test, so signatures verify end-to-end.
const WEBHOOK_SECRET = `whsec_${Buffer.from('bdph-clerk-e2e-signing-secret').toString('base64')}`;

// Post a Clerk webhook body with a real Svix signature over the exact bytes.
function postSignedWebhook(ctx: TestContext, payload: string) {
  const webhook = new Webhook(WEBHOOK_SECRET);
  const svixId = 'msg_e2e_1';
  const timestamp = new Date();
  const signature = webhook.sign(svixId, timestamp, payload);
  return request(ctx.server)
    .post(`${API}/webhooks/clerk`)
    .set('svix-id', svixId)
    .set('svix-timestamp', String(Math.floor(timestamp.getTime() / 1000)))
    .set('svix-signature', signature)
    .set('Content-Type', 'application/json')
    .send(payload);
}

describe('Clerk integration (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    // Must be set before the app boots: ClerkService reads these in its constructor.
    process.env.CLERK_SECRET_KEY = 'sk_test_e2e';
    process.env.CLERK_WEBHOOK_SECRET = WEBHOOK_SECRET;
    ctx = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(ctx);
  });

  beforeEach(async () => {
    await resetData(ctx);
    mockVerifyToken.mockReset();
    mockGetUser.mockReset();
  });

  describe('POST /webhooks/clerk', () => {
    it('creates a linked user from a signed user.created event', async () => {
      const payload = JSON.stringify({
        type: 'user.created',
        data: {
          id: 'user_clerk_hook',
          email_addresses: [{ id: 'idn_1', email_address: 'HookUser@Example.com' }],
          primary_email_address_id: 'idn_1',
          first_name: 'Hook',
          last_name: 'User',
        },
      });

      await postSignedWebhook(ctx, payload).expect(200);

      const users = ctx.app.get(UsersService);
      const created = await users.findByClerkUserId('user_clerk_hook');
      expect(created).not.toBeNull();
      expect(created?.email).toBe('hookuser@example.com'); // lower-cased
      expect(created?.name).toBe('Hook User');
      expect(created?.emailVerified).toBe(true);
      expect(created?.passwordHash ?? null).toBeNull(); // Clerk-only account
    });

    it('marks the linked account deleted on a user.deleted event', async () => {
      await postSignedWebhook(
        ctx,
        JSON.stringify({
          type: 'user.created',
          data: {
            id: 'user_clerk_del',
            email_addresses: [{ id: 'idn_1', email_address: 'del@example.com' }],
            primary_email_address_id: 'idn_1',
          },
        }),
      ).expect(200);

      await postSignedWebhook(
        ctx,
        JSON.stringify({ type: 'user.deleted', data: { id: 'user_clerk_del', deleted: true } }),
      ).expect(200);

      const users = ctx.app.get(UsersService);
      const deleted = await users.findByClerkUserId('user_clerk_del');
      expect(deleted?.status).toBe('deleted');
    });

    it('rejects an unsigned / tampered payload with 400', async () => {
      await request(ctx.server)
        .post(`${API}/webhooks/clerk`)
        .set('svix-id', 'msg_x')
        .set('svix-timestamp', String(Math.floor(Date.now() / 1000)))
        .set('svix-signature', 'v1,not-a-real-signature')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'user.created', data: { id: 'x' } }))
        .expect(400);
    });
  });

  describe('POST /auth/clerk/session (bridge)', () => {
    it('mints our session cookie for a Clerk-authenticated user', async () => {
      mockVerifyToken.mockResolvedValue({ data: { sub: 'user_bridge_new' } });
      mockGetUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: 'bridge@example.com' },
        emailAddresses: [{ id: 'idn_1', emailAddress: 'bridge@example.com' }],
        primaryEmailAddressId: 'idn_1',
        firstName: 'Bridge',
        lastName: 'User',
      });

      const agent = request.agent(ctx.server);
      const res = await agent
        .post(`${API}/auth/clerk/session`)
        .set('Authorization', 'Bearer clerk-token')
        .send();

      expect(res.status).toBe(200);
      const user = res.body.data as PublicUser;
      expect(user.email).toBe('bridge@example.com');
      expect(user.hasClerkLink).toBe(true);
      expect(user.hasPassword).toBe(false);

      // The cookie was set, so /auth/me now resolves the same canonical user.
      const me = await agent.get(`${API}/auth/me`).expect(200);
      expect((me.body.data as PublicUser).id).toBe(user.id);
    });

    it('links a VERIFIED local account and preserves its password', async () => {
      const local = await registerUser(ctx); // first-party account (unverified)
      // Simulate the owner verifying their email through the normal flow, so the
      // first-party credential is trusted at link time.
      await ctx.app.get(UsersService).markEmailVerified(local.user.id);

      mockVerifyToken.mockResolvedValue({ data: { sub: 'user_verified_link' } });
      mockGetUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: local.user.email },
        emailAddresses: [{ id: 'idn_1', emailAddress: local.user.email }],
        primaryEmailAddressId: 'idn_1',
        firstName: 'Verified',
        lastName: 'User',
      });

      const res = await request
        .agent(ctx.server)
        .post(`${API}/auth/clerk/session`)
        .set('Authorization', 'Bearer clerk-token')
        .send()
        .expect(200);

      const user = res.body.data as PublicUser;
      expect(user.id).toBe(local.user.id); // same account, now linked
      expect(user.hasClerkLink).toBe(true);
      expect(user.hasPassword).toBe(true); // preserved — the account was trusted

      // The original password still works.
      await request(ctx.server)
        .post(`${API}/auth/login`)
        .send({ email: local.user.email, password: 'password123' })
        .expect(200);
    });

    it('neutralizes an unverified email squat when Clerk links onto it', async () => {
      // Attacker registers the victim's email with their own password. Our register
      // flow issues a session before verification, so the squatter is "logged in".
      const squatEmail = 'victim@example.com';
      const attacker = request.agent(ctx.server);
      const reg = await attacker
        .post(`${API}/auth/register`)
        .send({ email: squatEmail, password: 'attackerpass1', name: 'Squatter' });
      expect(reg.status).toBe(201);
      const squatId = (reg.body.data as PublicUser).id;
      await attacker.get(`${API}/auth/me`).expect(200); // attacker has a live session

      // The real owner signs in with Clerk using the same, Clerk-verified email.
      mockVerifyToken.mockResolvedValue({ data: { sub: 'user_victim_clerk' } });
      mockGetUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: squatEmail },
        emailAddresses: [{ id: 'idn_1', emailAddress: squatEmail }],
        primaryEmailAddressId: 'idn_1',
        firstName: 'Real',
        lastName: 'Owner',
      });
      const victim = request.agent(ctx.server);
      const res = await victim
        .post(`${API}/auth/clerk/session`)
        .set('Authorization', 'Bearer clerk-token')
        .send()
        .expect(200);

      const user = res.body.data as PublicUser;
      expect(user.id).toBe(squatId); // linked onto the same record
      expect(user.hasClerkLink).toBe(true);
      expect(user.hasPassword).toBe(false); // squatter's password was cleared

      // The squatter can no longer log in with their password...
      await request(ctx.server)
        .post(`${API}/auth/login`)
        .send({ email: squatEmail, password: 'attackerpass1' })
        .expect(401);
      // ...and their pre-link session was revoked.
      await attacker.get(`${API}/auth/me`).expect(401);
      // The real owner's freshly-minted session works.
      await victim.get(`${API}/auth/me`).expect(200);
    });

    it('rejects a request with no bearer token (401)', async () => {
      await request(ctx.server).post(`${API}/auth/clerk/session`).send().expect(401);
    });

    it('rejects a token Clerk fails to verify (401)', async () => {
      mockVerifyToken.mockResolvedValue({ errors: [new Error('invalid')] });
      await request(ctx.server)
        .post(`${API}/auth/clerk/session`)
        .set('Authorization', 'Bearer bad-token')
        .send()
        .expect(401);
    });
  });
});
