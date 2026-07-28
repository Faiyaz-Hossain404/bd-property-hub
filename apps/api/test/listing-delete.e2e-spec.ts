import request from 'supertest';
import type { PublicListing } from '@bdph/types';
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
  type TestActor,
} from './utils/test-app';

// DELETE /listings/:id is the only destructive, non-recoverable route a seller
// can reach, so its two gates are pinned here: ownership (you cannot delete
// someone else's draft, staff included) and "never been submitted" (you cannot
// delete a listing that carries a moderation record).
//
// That second gate is subtler than "status is draft", which is why it has its own
// test: restore() puts an archived listing BACK into draft, so status alone would
// let a seller erase the history of a listing that had been reviewed, approved,
// and publicly live.
describe('Draft deletion (e2e)', () => {
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

  async function draftFor(seller: TestActor, title = 'Draft to delete'): Promise<string> {
    const districtId = await firstDistrictId(ctx);
    const draft = await seller.agent
      .post(`${API}/listings`)
      .send({
        titleEn: title,
        assetType: 'apartment',
        transactionType: 'sale',
        location: { districtId },
      })
      .expect(201);
    return (draft.body.data as PublicListing).id;
  }

  it('deletes the owner’s own never-submitted draft and drops it from their listings', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listingId = await draftFor(seller);

    await seller.agent.delete(`${API}/listings/${listingId}`).expect(204);

    const mine = await seller.agent.get(`${API}/me/listings`).expect(200);
    expect((mine.body.data as PublicListing[]).map((listing) => listing.id)).not.toContain(
      listingId,
    );
  });

  it('404s a second delete of the same draft', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listingId = await draftFor(seller);

    await seller.agent.delete(`${API}/listings/${listingId}`).expect(204);
    await seller.agent.delete(`${API}/listings/${listingId}`).expect(404);
  });

  it('does NOT let another seller delete a draft they do not own', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const owner = await createVerifiedSeller(ctx, admin);
    const stranger = await createVerifiedSeller(ctx, admin);
    const listingId = await draftFor(owner);

    await stranger.agent.delete(`${API}/listings/${listingId}`).expect(403);
  });

  it('does NOT let an admin delete another seller’s draft (ownership still enforced)', async () => {
    // An admin inherits seller capability, so it clears the @Roles gate — but
    // deleteDraft checks ownership against the caller's own id, same as
    // withdraw/restore. Staff removal of someone else's listing is the
    // moderation takedown, not this route.
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listingId = await draftFor(seller);

    await admin.agent.delete(`${API}/listings/${listingId}`).expect(403);
  });

  it('409s on a listing that is live rather than a draft', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listing = await createApprovedListing(ctx, seller, admin);

    await seller.agent.delete(`${API}/listings/${listing.id}`).expect(409);
  });

  it('409s on a withdrawn-then-restored draft, which still carries its review history', async () => {
    // The regression this exists for: after restore() the status reads 'draft',
    // so a bare status check would delete this — and with it the audit trail of a
    // listing that was approved and publicly visible.
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listing = await createApprovedListing(ctx, seller, admin);

    await seller.agent.post(`${API}/listings/${listing.id}/withdraw`).send({}).expect(201);
    const restored = await seller.agent
      .post(`${API}/listings/${listing.id}/restore`)
      .send({})
      .expect(201);
    expect((restored.body.data as PublicListing).publicationStatus).toBe('draft');

    await seller.agent.delete(`${API}/listings/${listing.id}`).expect(409);
  });

  it('requires a session', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listingId = await draftFor(seller);

    // A fresh agent, so no session cookie rides along.
    await request(ctx.server).delete(`${API}/listings/${listingId}`).expect(401);
  });
});
