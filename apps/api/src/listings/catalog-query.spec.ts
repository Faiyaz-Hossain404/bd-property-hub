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
});
