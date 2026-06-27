import {
  createListingInputSchema,
  listingLocationInputSchema,
  updateListingInputSchema,
} from '@bdph/types';

// Pure boundary-contract guards for the listing location selector (MAP-5). No DB:
// these pin the shape the API accepts before GeoService ever resolves the id, so a
// regression in the schema (a dropped field, a loosened id check, location made
// required) fails fast in CI rather than at runtime.
describe('listing location input contract', () => {
  const VALID_DISTRICT_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6';
  const MINIMAL_LISTING = {
    titleEn: 'Sunny 3-bed apartment',
    assetType: 'apartment',
    transactionType: 'sale',
  } as const;

  describe('listingLocationInputSchema', () => {
    it('accepts a valid 24-hex districtId', () => {
      expect(listingLocationInputSchema.parse({ districtId: VALID_DISTRICT_ID })).toEqual({
        districtId: VALID_DISTRICT_ID,
      });
    });

    it('rejects a malformed districtId', () => {
      expect(() => listingLocationInputSchema.parse({ districtId: 'dhaka' })).toThrow();
    });

    it('rejects a missing districtId', () => {
      expect(() => listingLocationInputSchema.parse({})).toThrow();
    });
  });

  describe('createListingInputSchema', () => {
    it('accepts a draft with no location (location is optional at draft time)', () => {
      const parsed = createListingInputSchema.parse(MINIMAL_LISTING);
      expect(parsed.location).toBeUndefined();
    });

    it('accepts a draft that includes a valid location', () => {
      const parsed = createListingInputSchema.parse({
        ...MINIMAL_LISTING,
        location: { districtId: VALID_DISTRICT_ID },
      });
      expect(parsed.location).toEqual({ districtId: VALID_DISTRICT_ID });
    });

    it('rejects a draft whose location.districtId is malformed', () => {
      expect(() =>
        createListingInputSchema.parse({
          ...MINIMAL_LISTING,
          location: { districtId: 'not-an-id' },
        }),
      ).toThrow();
    });
  });

  describe('updateListingInputSchema', () => {
    it('accepts a partial update that only sets location', () => {
      const parsed = updateListingInputSchema.parse({
        location: { districtId: VALID_DISTRICT_ID },
      });
      expect(parsed.location).toEqual({ districtId: VALID_DISTRICT_ID });
    });

    it('accepts an empty update (every field is optional)', () => {
      expect(updateListingInputSchema.parse({})).toEqual({});
    });
  });
});
