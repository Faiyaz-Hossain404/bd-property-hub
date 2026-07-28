import type { PublicListing } from '@bdph/types';
import {
  API,
  createVerifiedSeller,
  firstDistrictId,
  registerUser,
  resetData,
  startTestApp,
  stopTestApp,
  type TestContext,
} from './utils/test-app';

// Pins the exact request sequence the dashboard's "Submit for review" button now
// performs: PATCH the location, then POST the submit. It used to POST the submit
// on its own, because the location sat in React state that only the editor's own
// Save button ever flushed — so the server saw a listing with no location and
// answered 400, on a form that visibly had a district selected.
//
// The first test reproduces that 400 (so the message the client surfaces stays
// accurate), and the second proves the save-then-submit order clears it.
describe('Submit for review (e2e)', () => {
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

  async function locationlessDraft(
    seller: Awaited<ReturnType<typeof createVerifiedSeller>>,
  ): Promise<string> {
    const draft = await seller.agent
      .post(`${API}/listings`)
      .send({ titleEn: 'Draft with no location', assetType: 'apartment', transactionType: 'sale' })
      .expect(201);
    return (draft.body.data as PublicListing).id;
  }

  it('400s a submit when the listing has no location, naming the missing field', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listingId = await locationlessDraft(seller);

    const res = await seller.agent.post(`${API}/listings/${listingId}/submit`).send({}).expect(400);
    // The client puts this message straight into its toast, so it has to keep
    // saying which field is missing rather than collapsing to "bad request".
    expect(JSON.stringify(res.body)).toContain('location');
  });

  it('accepts the submit once the location has been PATCHed first', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listingId = await locationlessDraft(seller);
    const districtId = await firstDistrictId(ctx);

    // Step one: what the editor's save now does on the seller's behalf.
    await seller.agent
      .patch(`${API}/listings/${listingId}`)
      .send({ location: { districtId } })
      .expect(200);

    // Step two: the submit that used to run on its own.
    const submitted = await seller.agent
      .post(`${API}/listings/${listingId}/submit`)
      .send({})
      .expect(201);
    expect((submitted.body.data as PublicListing).publicationStatus).toBe('pending_review');
  });

  it('still refuses an unverified seller even with the location saved (FR-S8)', async () => {
    // The Submit button is no longer disabled client-side, so this gate is now
    // reached by a real click rather than being pre-empted by a grey button.
    // It has to hold.
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listingId = await locationlessDraft(seller);
    const districtId = await firstDistrictId(ctx);
    await seller.agent
      .patch(`${API}/listings/${listingId}`)
      .send({ location: { districtId } })
      .expect(200);

    await ctx.connection
      .collection('users')
      .updateOne({ email: seller.user.email }, { $set: { kycStatus: 'unverified' } });

    await seller.agent.post(`${API}/listings/${listingId}/submit`).send({}).expect(403);
  });
});
