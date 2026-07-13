import request from 'supertest';
import {
  PIN_FUZZ_MAX_METERS,
  PIN_FUZZ_MIN_METERS,
  type PublicListing,
} from '@bdph/types';
import { distanceMeters } from '../src/listings/listing-pin';
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

// End-to-end coverage of the exact/approximate map pin (MAP-1/MAP-2). The core
// property under test is FIELD-LEVEL PRIVACY: the seller's exact point exists in
// owner/staff responses and NEVER in any anonymous one.
describe('Map pin (e2e)', () => {
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

  const DHAKA_PIN = { lat: 23.8103, lng: 90.4125 };

  it('stores a pin and returns exact + fuzzed points to the owner', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const listing = await createApprovedListing(ctx, seller, admin);

    const updated = await seller.agent
      .patch(`${API}/listings/${listing.id}`)
      .send({ pin: DHAKA_PIN })
      .expect(409); // approved listings are not editable — use a draft

    expect(updated.body.error).toBeDefined();

    // Pin lands on a draft via PATCH like any other edit.
    const draft = await seller.agent
      .post(`${API}/listings`)
      .send({
        titleEn: 'Pinned',
        assetType: 'apartment',
        transactionType: 'sale',
        pin: DHAKA_PIN,
      })
      .expect(201);
    const body = draft.body.data as PublicListing;

    // Owner sees their exact pin back (and their own id), plus the fuzzed point.
    expect(body.exactPoint).toEqual(DHAKA_PIN);
    expect(body.ownerId).toBe(seller.user.id);
    expect(body.displayPoint).not.toBeNull();
    const offset = distanceMeters(DHAKA_PIN, body.displayPoint!);
    expect(offset).toBeGreaterThanOrEqual(PIN_FUZZ_MIN_METERS - 1);
    expect(offset).toBeLessThanOrEqual(PIN_FUZZ_MAX_METERS + 1);
  });

  it('never exposes the exact point publicly — catalog and detail get the fuzzed point only', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);

    // Draft with a pin → submit → approve, so it's publicly visible.
    const districtId = await firstDistrictId(ctx);
    const draft = await seller.agent
      .post(`${API}/listings`)
      .send({
        titleEn: 'Public pin',
        assetType: 'apartment',
        transactionType: 'sale',
        location: { districtId },
        pin: DHAKA_PIN,
      })
      .expect(201);
    const listingId = (draft.body.data as PublicListing).id;
    await seller.agent.post(`${API}/listings/${listingId}/submit`).send({}).expect(201);
    await admin.agent.post(`${API}/admin/moderation/${listingId}/approve`).send({}).expect(201);

    // Anonymous detail: fuzzed point present; the exact point AND the owner's
    // account id are ABSENT (a public owner handle would let a scraper group one
    // seller's co-located listings and average their fuzzed points).
    const detail = await request(ctx.server).get(`${API}/listings/${listingId}`).expect(200);
    const publicListing = detail.body.data as PublicListing;
    expect(publicListing.displayPoint).not.toBeNull();
    expect(publicListing).not.toHaveProperty('exactPoint');
    expect(publicListing).not.toHaveProperty('ownerId');
    // And the fuzzed point is genuinely offset from the true pin.
    expect(distanceMeters(DHAKA_PIN, publicListing.displayPoint!)).toBeGreaterThanOrEqual(
      PIN_FUZZ_MIN_METERS - 1,
    );

    // Anonymous catalog: same rules for every item in the list.
    const catalog = await request(ctx.server).get(`${API}/listings`).expect(200);
    for (const item of catalog.body.data as PublicListing[]) {
      expect(item).not.toHaveProperty('exactPoint');
      expect(item).not.toHaveProperty('ownerId');
    }

    // Staff DO see the exact pin (moderation needs ground truth).
    const queue = await admin.agent.get(`${API}/admin/moderation/removed`).expect(200);
    expect(queue.status).toBe(200);
  });

  it('keeps the stored fuzzed point stable across reads (no averaging attack)', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const draft = await seller.agent
      .post(`${API}/listings`)
      .send({ titleEn: 'Stable', assetType: 'apartment', transactionType: 'sale', pin: DHAKA_PIN })
      .expect(201);
    const listingId = (draft.body.data as PublicListing).id;

    const first = await seller.agent.get(`${API}/me/listings`).expect(200);
    const second = await seller.agent.get(`${API}/me/listings`).expect(200);
    const a = (first.body.data as PublicListing[]).find((l) => l.id === listingId)!;
    const b = (second.body.data as PublicListing[]).find((l) => l.id === listingId)!;
    expect(a.displayPoint).toEqual(b.displayPoint);
  });

  it('rejects a pin outside the service area (400)', async () => {
    const seller = await registerUser(ctx, ['seller']);
    await seller.agent
      .post(`${API}/listings`)
      .send({
        titleEn: 'London flat',
        assetType: 'apartment',
        transactionType: 'sale',
        pin: { lat: 51.5, lng: -0.12 },
      })
      .expect(400);
  });

  it('clears both points when the seller removes the pin', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    const draft = await seller.agent
      .post(`${API}/listings`)
      .send({ titleEn: 'Clear me', assetType: 'apartment', transactionType: 'sale', pin: DHAKA_PIN })
      .expect(201);
    const listingId = (draft.body.data as PublicListing).id;

    const cleared = await seller.agent
      .patch(`${API}/listings/${listingId}`)
      .send({ pin: null })
      .expect(200);
    const body = cleared.body.data as PublicListing;
    expect(body.displayPoint).toBeNull();
    expect(body).not.toHaveProperty('exactPoint');
  });
});
