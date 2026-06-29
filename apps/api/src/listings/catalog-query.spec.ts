import { publicListingQuerySchema, PUBLIC_LISTING_PAGE_SIZE } from '@bdph/types';

// Pure boundary-contract guards for the public catalog query (DISC-3 + DISC-7).
// No DB: these pin what GET /listings accepts before the service runs the keyset
// query — a regression in the district facet or the page-size cap fails fast in
// CI rather than at runtime.
describe('public catalog query contract', () => {
  const VALID_DISTRICT_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6';

  it('defaults to the standard page size with no filters', () => {
    const parsed = publicListingQuerySchema.parse({});
    expect(parsed.limit).toBe(PUBLIC_LISTING_PAGE_SIZE);
    expect(parsed.district_id).toBeUndefined();
    expect(parsed.cursor).toBeUndefined();
  });

  it('accepts a valid 24-hex district_id', () => {
    const parsed = publicListingQuerySchema.parse({ district_id: VALID_DISTRICT_ID });
    expect(parsed.district_id).toBe(VALID_DISTRICT_ID);
  });

  it('rejects a malformed district_id', () => {
    expect(() => publicListingQuerySchema.parse({ district_id: 'dhaka' })).toThrow();
  });

  it('coerces limit from a query string', () => {
    expect(publicListingQuerySchema.parse({ limit: '10' }).limit).toBe(10);
  });

  it('rejects a limit above the hard cap', () => {
    expect(() => publicListingQuerySchema.parse({ limit: '500' })).toThrow();
  });

  it('rejects a limit below 1', () => {
    expect(() => publicListingQuerySchema.parse({ limit: '0' })).toThrow();
  });

  it('accepts the asset and transaction type facets', () => {
    const parsed = publicListingQuerySchema.parse({
      asset_type: 'apartment',
      transaction_type: 'rent',
    });
    expect(parsed.asset_type).toBe('apartment');
    expect(parsed.transaction_type).toBe('rent');
  });

  it('rejects an unknown asset type', () => {
    expect(() => publicListingQuerySchema.parse({ asset_type: 'houseboat' })).toThrow();
  });

  it('coerces price bounds from query strings', () => {
    const parsed = publicListingQuerySchema.parse({ price_min: '1000', price_max: '5000' });
    expect(parsed.price_min).toBe(1000);
    expect(parsed.price_max).toBe(5000);
  });

  it('accepts a single open-ended price bound', () => {
    expect(publicListingQuerySchema.parse({ price_min: '1000' }).price_max).toBeUndefined();
    expect(publicListingQuerySchema.parse({ price_max: '5000' }).price_min).toBeUndefined();
  });

  it('rejects a negative price bound', () => {
    expect(() => publicListingQuerySchema.parse({ price_min: '-1' })).toThrow();
  });

  it('rejects a reversed price range', () => {
    expect(() => publicListingQuerySchema.parse({ price_min: '5000', price_max: '1000' })).toThrow();
  });

  it('allows an equal min and max price', () => {
    const parsed = publicListingQuerySchema.parse({ price_min: '3000', price_max: '3000' });
    expect(parsed.price_min).toBe(3000);
    expect(parsed.price_max).toBe(3000);
  });

  it('defaults the sort to newest', () => {
    expect(publicListingQuerySchema.parse({}).sort).toBe('newest');
  });

  it('accepts the price sort orders', () => {
    expect(publicListingQuerySchema.parse({ sort: 'price_asc' }).sort).toBe('price_asc');
    expect(publicListingQuerySchema.parse({ sort: 'price_desc' }).sort).toBe('price_desc');
  });

  it('rejects an unknown sort', () => {
    expect(() => publicListingQuerySchema.parse({ sort: 'cheapest' })).toThrow();
  });
});
