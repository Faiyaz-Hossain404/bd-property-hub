import request from 'supertest';
import type {
  GeoAreaThana,
  GeoCityCorporation,
  GeoCityUpazila,
  GeoDistrict,
  GeoDivision,
  PublicListing,
} from '@bdph/types';
import {
  API,
  citiesUpazilasIn,
  createApprovedListing,
  createVerifiedSeller,
  firstAreaThanaId,
  firstCityCorporationId,
  firstDistrictId,
  registerUser,
  resetData,
  startTestApp,
  stopTestApp,
  type TestContext,
} from './utils/test-app';
import { GeoService } from '../src/geo/geo.service';

// End-to-end coverage of the deeper geo taxonomy: the public cascade endpoints
// (division → district → city/upazila → area/thana, plus the city-corporation tag),
// resolving a full location chain onto a listing, the parent-chain validation, and
// the city/upazila catalog drill-down.
describe('Geo depth & location (e2e)', () => {
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

  it('serves the public geography cascade anonymously', async () => {
    const divisions = await request(ctx.server).get(`${API}/geo/divisions`).expect(200);
    expect((divisions.body.data as GeoDivision[]).length).toBe(8);

    const districtId = await firstDistrictId(ctx);
    const districts = await request(ctx.server).get(`${API}/geo/districts`).expect(200);
    expect((districts.body.data as GeoDistrict[]).length).toBe(64);

    const upazilas = await request(ctx.server)
      .get(`${API}/geo/cities-upazilas?district_id=${districtId}`)
      .expect(200);
    const upazilaList = upazilas.body.data as GeoCityUpazila[];
    expect(upazilaList.length).toBeGreaterThan(0);
    // Every returned upazila belongs to the requested district.
    for (const row of upazilaList) {
      expect(row.districtId).toBe(districtId);
    }

    const areas = await request(ctx.server)
      .get(`${API}/geo/areas-thanas?city_upazila_id=${upazilaList[0]!.id}`)
      .expect(200);
    const areaList = areas.body.data as GeoAreaThana[];
    expect(areaList.length).toBeGreaterThan(0);
    for (const row of areaList) {
      expect(row.cityUpazilaId).toBe(upazilaList[0]!.id);
    }

    const corporations = await request(ctx.server).get(`${API}/geo/city-corporations`).expect(200);
    expect((corporations.body.data as GeoCityCorporation[]).length).toBe(12);
  });

  it('rejects a malformed cascade query id (400)', async () => {
    await request(ctx.server).get(`${API}/geo/cities-upazilas?district_id=nope`).expect(400);
    await request(ctx.server).get(`${API}/geo/areas-thanas?city_upazila_id=nope`).expect(400);
  });

  it('resolves a full location chain and exposes it on the public projection', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);

    const districtId = await firstDistrictId(ctx);
    const [cityUpazilaId] = await citiesUpazilasIn(ctx, districtId);
    const areaThanaId = await firstAreaThanaId(ctx, cityUpazilaId!);
    const cityCorporationId = await firstCityCorporationId(ctx);

    const listing = await createApprovedListing(ctx, seller, admin, {
      cityUpazilaId: cityUpazilaId!,
      areaThanaId,
      cityCorporationId,
    });

    // The public detail carries the full administrative chain, names and all.
    const detail = await request(ctx.server).get(`${API}/listings/${listing.id}`).expect(200);
    const location = (detail.body.data as PublicListing).location;
    expect(location).not.toBeNull();
    expect((location?.divisionNameEn ?? '').length).toBeGreaterThan(0);
    expect((location?.districtNameEn ?? '').length).toBeGreaterThan(0);
    expect(location?.cityUpazilaId).toBe(cityUpazilaId);
    expect((location?.cityUpazilaNameEn ?? '').length).toBeGreaterThan(0);
    expect(location?.areaThanaId).toBe(areaThanaId);
    expect((location?.areaThanaNameEn ?? '').length).toBeGreaterThan(0);
    expect(location?.cityCorporationId).toBe(cityCorporationId);

    // A5/MAP-2: no precise-location fields ever leak into the public projection.
    expect(location).not.toHaveProperty('addressLine');
    expect(location).not.toHaveProperty('exactPoint');
    expect(location).not.toHaveProperty('displayPoint');
  });

  it('rejects a city/upazila that does not belong to the chosen district (400)', async () => {
    const seller = await registerUser(ctx, ['seller']);
    const districts = await ctx.app.get(GeoService).listDistricts();
    const districtA = districts[0]!.id;
    const districtB = districts[1]!.id;
    const [upazilaOfB] = await citiesUpazilasIn(ctx, districtB);

    await seller.agent
      .post(`${API}/listings`)
      .send({
        titleEn: 'Mismatch',
        assetType: 'apartment',
        transactionType: 'sale',
        location: { districtId: districtA, cityUpazilaId: upazilaOfB },
      })
      .expect(400);
  });

  it('rejects an area/thana that does not belong to the chosen city/upazila (400)', async () => {
    const seller = await registerUser(ctx, ['seller']);
    const districtId = await firstDistrictId(ctx);
    const upazilas = await citiesUpazilasIn(ctx, districtId);
    const areaOfSecond = await firstAreaThanaId(ctx, upazilas[1]!);

    await seller.agent
      .post(`${API}/listings`)
      .send({
        titleEn: 'Mismatch area',
        assetType: 'apartment',
        transactionType: 'sale',
        // area belongs to the second upazila, but we claim the first.
        location: { districtId, cityUpazilaId: upazilas[0]!, areaThanaId: areaOfSecond },
      })
      .expect(400);
  });

  it('rejects an area/thana sent without its parent city/upazila (400)', async () => {
    const seller = await registerUser(ctx, ['seller']);
    const districtId = await firstDistrictId(ctx);
    const [upazilaId] = await citiesUpazilasIn(ctx, districtId);
    const areaThanaId = await firstAreaThanaId(ctx, upazilaId!);

    await seller.agent
      .post(`${API}/listings`)
      .send({
        titleEn: 'Orphan area',
        assetType: 'apartment',
        transactionType: 'sale',
        location: { districtId, areaThanaId },
      })
      .expect(400);
  });

  it('narrows the catalog to one city/upazila via the drill-down filter', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);

    const districtId = await firstDistrictId(ctx);
    const upazilas = await citiesUpazilasIn(ctx, districtId);
    const [upazilaA, upazilaB] = upazilas;

    const inA = await createApprovedListing(ctx, seller, admin, { cityUpazilaId: upazilaA! });
    await createApprovedListing(ctx, seller, admin, { cityUpazilaId: upazilaB! });

    // Both share the district; the drill-down returns only the upazila-A listing.
    const filtered = await request(ctx.server)
      .get(`${API}/listings?district_id=${districtId}&city_upazila_id=${upazilaA}`)
      .expect(200);
    const ids = (filtered.body.data as PublicListing[]).map((listing) => listing.id);
    expect(ids).toContain(inA.id);
    expect(ids).toHaveLength(1);
  });
});
