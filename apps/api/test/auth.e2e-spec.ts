import request from 'supertest';
import type { PublicUser } from '@bdph/types';
import {
  API,
  registerUser,
  resetData,
  startTestApp,
  stopTestApp,
  type TestContext,
} from './utils/test-app';

// End-to-end auth flow against the real app + in-memory Mongo: registration,
// session cookie issuance, the session guard, and logout.
describe('Auth (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(ctx);
  });

  beforeEach(async () => {
    await resetData(ctx);
  });

  it('registers a new user as an unverified buyer and issues a session', async () => {
    const { agent, user } = await registerUser(ctx);
    expect(user.roles).toEqual(['buyer']);
    expect(user.kycStatus).toBe('unverified');
    expect(user.emailVerified).toBe(false);

    // The agent now carries the session cookie, so /me resolves the same user.
    const meRes = await agent.get(`${API}/auth/me`).expect(200);
    expect((meRes.body.data as PublicUser).id).toBe(user.id);
  });

  it('rejects an unauthenticated request to /me with 401', async () => {
    await request(ctx.server).get(`${API}/auth/me`).expect(401);
  });

  it('logs in an existing user and clears the session on logout', async () => {
    const { agent, user } = await registerUser(ctx);

    // A second agent logs in with the same credentials — login issues its own cookie.
    const fresh = request.agent(ctx.server);
    await fresh
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: 'password123' })
      .expect(200);
    await fresh.get(`${API}/auth/me`).expect(200);

    await agent.post(`${API}/auth/logout`).send({}).expect(200);
    await agent.get(`${API}/auth/me`).expect(401);
  });

  it('rejects a duplicate email registration with 409', async () => {
    const { user } = await registerUser(ctx);
    await request(ctx.server)
      .post(`${API}/auth/register`)
      .send({ email: user.email, password: 'password123', name: 'Dupe' })
      .expect(409);
  });

  it('rejects a malformed registration body with 400', async () => {
    await request(ctx.server)
      .post(`${API}/auth/register`)
      .send({ email: 'not-an-email', password: 'x', name: '' })
      .expect(400);
  });
});
