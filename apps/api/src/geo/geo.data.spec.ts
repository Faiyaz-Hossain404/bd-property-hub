import { geoDistrictsQuerySchema } from '@bdph/types';
import { DIVISION_SEED } from './data/divisions';
import { DISTRICT_SEED } from './data/districts';

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
});
