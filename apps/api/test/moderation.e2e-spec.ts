import request from 'supertest';
import { Types } from 'mongoose';
import type { PublicListing } from '@bdph/types';
import {
  API,
  createApprovedListing,
  createVerifiedSeller,
  registerUser,
  resetData,
  startTestApp,
  stopTestApp,
  type TestContext,
} from './utils/test-app';

// End-to-end coverage of staff listing takedown/reinstate: the class-level role
// gate, the state transitions, and public-catalog visibility.
describe('Moderation takedown (e2e)', () => {
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

  it('blocks non-staff and anonymous callers from the admin moderation routes', async () => {
    const buyer = await registerUser(ctx);
    const someId = new Types.ObjectId().toHexString();

    // A logged-in buyer is authenticated but lacks the admin role → 403 (this is
    // the class-level @Roles gate that the guard fix made effective).
    await buyer.agent
      .post(`${API}/admin/moderation/${someId}/takedown`)
      .send({ reason: 'nope' })
      .expect(403);
    await buyer.agent.get(`${API}/admin/moderation/queue`).expect(403);

    // No session at all → 401.
    await request(ctx.server).get(`${API}/admin/moderation/removed`).expect(401);
  });

  it('takes a live listing down and drops it from the public catalog', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listing = await createApprovedListing(ctx, seller, admin);

    // Visible in the public catalog while approved.
    await request(ctx.server).get(`${API}/listings/${listing.id}`).expect(200);

    const removed = await admin.agent
      .post(`${API}/admin/moderation/${listing.id}/takedown`)
      .send({ reason: 'Violates listing policy' })
      .expect(201);
    expect((removed.body.data as PublicListing).publicationStatus).toBe('removed');

    // Gone from the public detail route and the browse list.
    await request(ctx.server).get(`${API}/listings/${listing.id}`).expect(404);
    const browse = await request(ctx.server).get(`${API}/listings`).expect(200);
    const ids = (browse.body.data as PublicListing[]).map((item) => item.id);
    expect(ids).not.toContain(listing.id);

    // It shows up in the admin removed queue.
    const removedQueue = await admin.agent.get(`${API}/admin/moderation/removed`).expect(200);
    expect((removedQueue.body.data as PublicListing[]).map((item) => item.id)).toContain(listing.id);
  });

  it('reinstates a removed listing back into the public catalog', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listing = await createApprovedListing(ctx, seller, admin);
    await admin.agent
      .post(`${API}/admin/moderation/${listing.id}/takedown`)
      .send({ reason: 'Taken down by mistake' })
      .expect(201);

    const reinstated = await admin.agent
      .post(`${API}/admin/moderation/${listing.id}/reinstate`)
      .send({})
      .expect(201);
    expect((reinstated.body.data as PublicListing).publicationStatus).toBe('approved');
    await request(ctx.server).get(`${API}/listings/${listing.id}`).expect(200);
  });

  it('requires a reason to take a listing down', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listing = await createApprovedListing(ctx, seller, admin);
    await admin.agent.post(`${API}/admin/moderation/${listing.id}/takedown`).send({}).expect(400);
  });

  it('cannot take down a listing that is not live (409)', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listing = await createApprovedListing(ctx, seller, admin);
    await admin.agent
      .post(`${API}/admin/moderation/${listing.id}/takedown`)
      .send({ reason: 'first' })
      .expect(201);
    // Already removed → a second takedown is a state-machine conflict.
    await admin.agent
      .post(`${API}/admin/moderation/${listing.id}/takedown`)
      .send({ reason: 'again' })
      .expect(409);
  });

  it('returns 404 for a malformed or unknown listing id', async () => {
    const admin = await registerUser(ctx, ['admin']);
    await admin.agent
      .post(`${API}/admin/moderation/not-a-valid-id/takedown`)
      .send({ reason: 'x' })
      .expect(404);
    const unknownId = new Types.ObjectId().toHexString();
    await admin.agent
      .post(`${API}/admin/moderation/${unknownId}/takedown`)
      .send({ reason: 'x' })
      .expect(404);
  });
});
