import { isListingComplete, listingCompletenessGaps } from '@bdph/types';

// Pure logic behind the submit gate (FR-S8). The API service and the web
// dashboard both call this, so pin its rules here: a draft is submittable only
// once it has an area-level location and a usable price.
describe('listing completeness gate', () => {
  const location = { districtId: 'a1b2c3d4e5f6a1b2c3d4e5f6' };

  it('reports both gaps for a bare draft (no location, no price)', () => {
    expect(listingCompletenessGaps({ location: null, pricing: {} })).toEqual(['location', 'price']);
  });

  it('keeps requirements in display order (location before price)', () => {
    const gaps = listingCompletenessGaps({ location: null, pricing: null });
    expect(gaps).toEqual(['location', 'price']);
  });

  it('flags a missing location when only a price is set', () => {
    expect(
      listingCompletenessGaps({ location: null, pricing: { amountBdt: 8_500_000, priceType: 'fixed' } }),
    ).toEqual(['location']);
  });

  it('flags a missing price when only a location is set', () => {
    expect(listingCompletenessGaps({ location, pricing: {} })).toEqual(['price']);
  });

  it('treats a zero amount as no price', () => {
    expect(
      listingCompletenessGaps({ location, pricing: { amountBdt: 0, priceType: 'fixed' } }),
    ).toEqual(['price']);
  });

  it('accepts a positive amount as a usable price', () => {
    expect(isListingComplete({ location, pricing: { amountBdt: 1, priceType: 'fixed' } })).toBe(true);
  });

  it('accepts "on request" pricing with no amount as a usable price', () => {
    expect(isListingComplete({ location, pricing: { priceType: 'on_request' } })).toBe(true);
  });

  it('requires an amount when price type is fixed or negotiable', () => {
    expect(isListingComplete({ location, pricing: { priceType: 'negotiable' } })).toBe(false);
  });

  it('is complete once both a location and a positive price are present', () => {
    expect(
      isListingComplete({ location, pricing: { amountBdt: 8_500_000, priceType: 'fixed' } }),
    ).toBe(true);
  });
});
