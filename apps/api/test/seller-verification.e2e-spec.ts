import request from 'supertest';
import type { PublicListing, PublicUser } from '@bdph/types';
import {
  API,
  firstDistrictId,
  registerUser,
  resetData,
  startTestApp,
  stopTestApp,
  type TestActor,
  type TestContext,
} from './utils/test-app';

// End-to-end coverage of the seller verification (KYC) gate: the role gate on the
// admin review routes, the block on submitting listings until verified, and the
// request → approve/reject state machine.
describe('Seller verification (e2e)', () => {
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

  // Approves `seller` through the real request → approve flow.
  async function verify(seller: TestActor, admin: TestActor): Promise<void> {
    await seller.agent.post(`${API}/me/verification/request`).send({}).expect(201);
    await admin.agent
      .post(`${API}/admin/seller-verification/${seller.user.id}/approve`)
      .send({})
      .expect(201);
  }

  it('blocks an unverified seller from creating a draft, then allows it once verified', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await registerUser(ctx, ['seller']);
    const districtId = await firstDistrictId(ctx);
    const body = {
      titleEn: 'Gated Listing',
      assetType: 'apartment',
      transactionType: 'sale',
      location: { districtId },
    };

    // The gate now sits on creation, not just submission: an unverified seller
    // cannot start a listing at all.
    await seller.agent.post(`${API}/listings`).send(body).expect(403);

    await verify(seller, admin);

    const draft = await seller.agent.post(`${API}/listings`).send(body).expect(201);
    expect((draft.body.data as PublicListing).publicationStatus).toBe('draft');
  });

  it('blocks submitting a draft whose owner is no longer verified', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await registerUser(ctx, ['seller']);
    const districtId = await firstDistrictId(ctx);

    await verify(seller, admin);
    const draft = await seller.agent
      .post(`${API}/listings`)
      .send({
        titleEn: 'Gated Listing',
        assetType: 'apartment',
        transactionType: 'sale',
        location: { districtId },
      })
      .expect(201);
    const listingId = (draft.body.data as PublicListing).id;

    // Now that creation is gated too, the only way to hold a draft while
    // unverified is to lose verification after drafting — a seller who is later
    // rejected or reset. Written straight to the DB because no API route revokes
    // an approved seller yet; the point is to prove the submit gate still stands
    // on its own rather than relying on the creation gate to have caught it.
    await ctx.connection
      .collection('users')
      .updateOne({ email: seller.user.email }, { $set: { kycStatus: 'unverified' } });

    await seller.agent.post(`${API}/listings/${listingId}/submit`).send({}).expect(403);

    // Restored: the same listing goes through to the review queue.
    await ctx.connection
      .collection('users')
      .updateOne({ email: seller.user.email }, { $set: { kycStatus: 'verified' } });

    const submitted = await seller.agent
      .post(`${API}/listings/${listingId}/submit`)
      .send({})
      .expect(201);
    expect((submitted.body.data as PublicListing).publicationStatus).toBe('pending_review');
  });

  it('restricts the verification review routes to staff', async () => {
    const seller = await registerUser(ctx, ['seller']);
    await seller.agent.get(`${API}/admin/seller-verification/queue`).expect(403);
    await request(ctx.server).get(`${API}/admin/seller-verification/queue`).expect(401);
  });

  it('does not let a seller approve their own verification', async () => {
    const seller = await registerUser(ctx, ['seller']);
    await seller.agent.post(`${API}/me/verification/request`).send({}).expect(201);

    // The approve route is admin-only, so a seller hitting it for their own id is 403.
    await seller.agent
      .post(`${API}/admin/seller-verification/${seller.user.id}/approve`)
      .send({})
      .expect(403);

    // And they are still only 'pending' — never self-elevated to 'verified'.
    const me = await seller.agent.get(`${API}/auth/me`).expect(200);
    expect((me.body.data as PublicUser).kycStatus).toBe('pending');
  });

  it('does not let a plain buyer request seller verification', async () => {
    const buyer = await registerUser(ctx);
    await buyer.agent.post(`${API}/me/verification/request`).send({}).expect(403);
  });

  it('rejects a duplicate verification request while one is pending (409)', async () => {
    const seller = await registerUser(ctx, ['seller']);
    await seller.agent.post(`${API}/me/verification/request`).send({}).expect(201);
    await seller.agent.post(`${API}/me/verification/request`).send({}).expect(409);
  });

  it('records a rejection reason and lets the seller re-apply', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await registerUser(ctx, ['seller']);
    await seller.agent.post(`${API}/me/verification/request`).send({}).expect(201);

    await admin.agent
      .post(`${API}/admin/seller-verification/${seller.user.id}/reject`)
      .send({ reason: 'Document was unreadable' })
      .expect(201);

    const rejected = await seller.agent.get(`${API}/auth/me`).expect(200);
    expect((rejected.body.data as PublicUser).kycStatus).toBe('rejected');
    expect((rejected.body.data as PublicUser).kycReason).toBe('Document was unreadable');

    // A rejected seller may request again.
    await seller.agent.post(`${API}/me/verification/request`).send({}).expect(201);
  });

  it('lists a pending seller in the admin verification queue', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await registerUser(ctx, ['seller']);
    await seller.agent.post(`${API}/me/verification/request`).send({}).expect(201);

    const queue = await admin.agent.get(`${API}/admin/seller-verification/queue`).expect(200);
    const ids = (queue.body.data as PublicUser[]).map((user) => user.id);
    expect(ids).toContain(seller.user.id);
  });
});
