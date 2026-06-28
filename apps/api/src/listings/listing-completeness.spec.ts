import { LISTING_REQUIREMENTS, isListingComplete, listingCompletenessGaps } from '@bdph/types';

// Pure logic behind the submit gate (FR-S8). The API service and the web
// dashboard both call this, so pin its rules here: a draft is submittable once
// it has an area-level location. Price is intentionally optional — a listing
// with no price renders as "Price on request" in the catalog.
describe('listing completeness gate', () => {
  const location = { districtId: 'a1b2c3d4e5f6a1b2c3d4e5f6' };

  it('requires only a location (price is not required)', () => {
    expect(LISTING_REQUIREMENTS).toEqual(['location']);
  });

  it('flags a missing location on a bare draft', () => {
    expect(listingCompletenessGaps({ location: null })).toEqual(['location']);
  });

  it('treats an undefined location as missing', () => {
    expect(listingCompletenessGaps({ location: undefined })).toEqual(['location']);
  });

  it('is complete with a location even when no price is set', () => {
    expect(isListingComplete({ location })).toBe(true);
  });

  it('reports no gaps once a location is present', () => {
    expect(listingCompletenessGaps({ location })).toEqual([]);
  });
});
