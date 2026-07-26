import type { PublicListing, PublicUser } from '@bdph/types';
import {
  API,
  createApprovedListing,
  createVerifiedSeller,
  firstDistrictId,
  registerUser,
  resetData,
  startTestApp,
  stopTestApp,
  type TestContext,
} from './utils/test-app';

// Guards the implied-capability boundaries of the single-role model: admin and
// admin_prime inherit seller (and buyer) capability, but that inheritance must
// NOT (a) let become-seller overwrite a staff role, (b) let an admin act on
// someone else's listing (ownership still scopes withdraw/restore), or (c) bypass
// the KYC gate on submit. The source comments call these out as invariants not to
// break; these tests are the regression net.
describe('Role capability boundaries (e2e)', () => {
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

  async function draftFor(admin: Awaited<ReturnType<typeof registerUser>>): Promise<string> {
    const districtId = await firstDistrictId(ctx);
    const draft = await admin.agent
      .post(`${API}/listings`)
      .send({
        titleEn: 'Admin draft',
        assetType: 'apartment',
        transactionType: 'sale',
        location: { districtId },
      })
      .expect(201);
    return (draft.body.data as PublicListing).id;
  }

  it('never demotes an admin via become-seller (no-op, stays admin)', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const res = await admin.agent.post(`${API}/me/become-seller`).send({}).expect(201);
    expect((res.body.data as PublicUser).role).toBe('admin');
  });

  it('promotes a plain buyer to seller via become-seller', async () => {
    const buyer = await registerUser(ctx);
    expect(buyer.user.role).toBe('buyer');
    const res = await buyer.agent.post(`${API}/me/become-seller`).send({}).expect(201);
    expect((res.body.data as PublicUser).role).toBe('seller');
  });

  it('lets an admin create a draft through inherited seller capability', async () => {
    const admin = await registerUser(ctx, ['admin']);
    await draftFor(admin); // 201 asserted inside
  });

  it('does NOT let an admin withdraw another seller’s listing (ownership still enforced)', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listing = await createApprovedListing(ctx, seller, admin);

    // Admin passes the @Roles('seller') gate via inheritance, but ownership 403s
    // them on a listing they don't own.
    await admin.agent.post(`${API}/listings/${listing.id}/withdraw`).send({}).expect(403);
  });

  it('does NOT let inherited seller capability bypass the KYC gate on submit', async () => {
    // A fresh admin's kycStatus defaults to 'unverified'.
    const admin = await registerUser(ctx, ['admin']);
    const listingId = await draftFor(admin);
    await admin.agent.post(`${API}/listings/${listingId}/submit`).send({}).expect(403);
  });
});
