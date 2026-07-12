import {
  geoAreasThanasQuerySchema,
  geoCitiesUpazilasQuerySchema,
  geoDistrictsQuerySchema,
} from '@bdph/types';
import { DIVISION_SEED } from './data/divisions';
import { DISTRICT_SEED } from './data/districts';
import { UPAZILA_SEED } from './data/cities-upazilas';
import { AREA_SEED } from './data/areas-thanas';
import { CITY_CORPORATION_SEED } from './data/city-corporations';

// Pure data-integrity guards for the geo seed (no DB needed). These catch the
// data-entry mistakes that would otherwise only surface at seed time or in the
// UI: a miscount, a duplicate slug, an orphaned district, or a missing name.
describe('geo seed data', () => {
  describe('divisions', () => {
    it('contains exactly Bangladesh\'s 8 divisions', () => {
      expect(DIVISION_SEED).toHaveLength(8);
    });

    it('has unique codes', () => {
      const codes = DIVISION_SEED.map((division) => division.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('has non-empty EN and BN names for every division', () => {
      for (const division of DIVISION_SEED) {
        expect(division.nameEn.trim().length).toBeGreaterThan(0);
        expect(division.nameBn.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('districts', () => {
    it('contains exactly 64 districts (Zilas)', () => {
      expect(DISTRICT_SEED).toHaveLength(64);
    });

    it('has unique codes', () => {
      const codes = DISTRICT_SEED.map((district) => district.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('references only known divisions', () => {
      const divisionCodes = new Set(DIVISION_SEED.map((division) => division.code));
      for (const district of DISTRICT_SEED) {
        expect(divisionCodes.has(district.divisionCode)).toBe(true);
      }
    });

    it('covers all 8 divisions', () => {
      const covered = new Set(DISTRICT_SEED.map((district) => district.divisionCode));
      expect(covered.size).toBe(DIVISION_SEED.length);
    });

    it('has non-empty EN and BN names for every district', () => {
      for (const district of DISTRICT_SEED) {
        expect(district.nameEn.trim().length).toBeGreaterThan(0);
        expect(district.nameBn.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('cities/upazilas', () => {
    // Dataset-derived count (open nuhil/bangladesh-geocode). Asserted so a
    // regeneration or hand-edit that drops/duplicates rows fails loudly; update this
    // number deliberately when the source is intentionally refreshed.
    it('contains the expected number of cities/upazilas', () => {
      expect(UPAZILA_SEED).toHaveLength(494);
    });

    it('has unique codes', () => {
      const codes = UPAZILA_SEED.map((row) => row.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('references only known districts', () => {
      const districtCodes = new Set(DISTRICT_SEED.map((district) => district.code));
      for (const row of UPAZILA_SEED) {
        expect(districtCodes.has(row.districtCode)).toBe(true);
      }
    });

    it('covers all 64 districts', () => {
      const covered = new Set(UPAZILA_SEED.map((row) => row.districtCode));
      expect(covered.size).toBe(DISTRICT_SEED.length);
    });

    it('has non-empty EN and BN names for every row', () => {
      for (const row of UPAZILA_SEED) {
        expect(row.nameEn.trim().length).toBeGreaterThan(0);
        expect(row.nameBn.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('areas/thanas', () => {
    it('contains the expected number of areas/thanas', () => {
      expect(AREA_SEED).toHaveLength(4540);
    });

    it('has unique codes', () => {
      const codes = AREA_SEED.map((row) => row.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('references only known cities/upazilas', () => {
      const upazilaCodes = new Set(UPAZILA_SEED.map((row) => row.code));
      for (const row of AREA_SEED) {
        expect(upazilaCodes.has(row.upazilaCode)).toBe(true);
      }
    });

    it('has non-empty EN and BN names for every row', () => {
      for (const row of AREA_SEED) {
        expect(row.nameEn.trim().length).toBeGreaterThan(0);
        expect(row.nameBn.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('city corporations', () => {
    it('contains the current 12 city corporations', () => {
      expect(CITY_CORPORATION_SEED).toHaveLength(12);
    });

    it('has unique codes', () => {
      const codes = CITY_CORPORATION_SEED.map((row) => row.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('has non-empty EN and BN names for every row', () => {
      for (const row of CITY_CORPORATION_SEED) {
        expect(row.nameEn.trim().length).toBeGreaterThan(0);
        expect(row.nameBn.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('geoDistrictsQuerySchema', () => {
    it('accepts a valid 24-hex division_id', () => {
      const id = 'a1b2c3d4e5f6a1b2c3d4e5f6';
      expect(geoDistrictsQuerySchema.parse({ division_id: id })).toEqual({ division_id: id });
    });

    it('accepts an empty query (returns all districts)', () => {
      expect(geoDistrictsQuerySchema.parse({})).toEqual({});
    });

    it('rejects a malformed division_id', () => {
      expect(() => geoDistrictsQuerySchema.parse({ division_id: 'not-an-id' })).toThrow();
    });
  });

  describe('geoCitiesUpazilasQuerySchema', () => {
    it('accepts a valid 24-hex district_id and an empty query', () => {
      const id = 'a1b2c3d4e5f6a1b2c3d4e5f6';
      expect(geoCitiesUpazilasQuerySchema.parse({ district_id: id })).toEqual({ district_id: id });
      expect(geoCitiesUpazilasQuerySchema.parse({})).toEqual({});
    });

    it('rejects a malformed district_id', () => {
      expect(() => geoCitiesUpazilasQuerySchema.parse({ district_id: 'nope' })).toThrow();
    });
  });

  describe('geoAreasThanasQuerySchema', () => {
    it('accepts a valid 24-hex city_upazila_id and an empty query', () => {
      const id = 'a1b2c3d4e5f6a1b2c3d4e5f6';
      expect(geoAreasThanasQuerySchema.parse({ city_upazila_id: id })).toEqual({
        city_upazila_id: id,
      });
      expect(geoAreasThanasQuerySchema.parse({})).toEqual({});
    });

    it('rejects a malformed city_upazila_id', () => {
      expect(() => geoAreasThanasQuerySchema.parse({ city_upazila_id: 'nope' })).toThrow();
    });
  });
});
