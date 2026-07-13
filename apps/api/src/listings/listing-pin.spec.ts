import { PIN_FUZZ_MAX_METERS, PIN_FUZZ_MIN_METERS } from '@bdph/types';
import { distanceMeters, fuzzPin } from './listing-pin';

// The fuzzing function is the privacy mechanism for MAP-2 — these tests pin down
// the properties that make it safe: the offset always lands inside the annulus,
// varies by direction across owners/places, and is DETERMINISTIC per
// (owner, location cell) — co-located listings by one owner share a single
// offset, so a scraper averaging their public points recovers the offset point,
// never the true one.
describe('fuzzPin', () => {
  const OWNER_A = '64b000000000000000000001';
  const OWNER_B = '64b000000000000000000002';
  const dhaka = { lat: 23.8103, lng: 90.4125 };
  const teknaf = { lat: 20.86, lng: 92.3 }; // near the southern edge
  const tetulia = { lat: 26.5, lng: 88.4 }; // near the northern edge

  it.each([
    ['Dhaka', dhaka],
    ['Teknaf', teknaf],
    ['Tetulia', tetulia],
  ])('offsets within the configured annulus at %s', (_label, exact) => {
    // Many distinct owners → many independent digests at the same true point.
    for (let i = 0; i < 100; i += 1) {
      const owner = `64b0000000000000000${String(1000 + i)}`;
      const fuzzed = fuzzPin(exact, owner);
      const d = distanceMeters(exact, fuzzed);
      expect(d).toBeGreaterThanOrEqual(PIN_FUZZ_MIN_METERS - 1); // -1: float slack
      expect(d).toBeLessThanOrEqual(PIN_FUZZ_MAX_METERS + 1);
    }
  });

  it('never returns the exact point', () => {
    const fuzzed = fuzzPin(dhaka, OWNER_A);
    expect(fuzzed).not.toEqual(dhaka);
  });

  it('is deterministic: same owner + same spot → the same offset every time', () => {
    expect(fuzzPin(dhaka, OWNER_A)).toEqual(fuzzPin(dhaka, OWNER_A));
  });

  it('gives one owner a shared offset for pins in the same ~100m cell', () => {
    // Two units in the same building — a few meters apart, chosen well inside one
    // 0.001° cell (a building straddling a cell edge yields at most a handful of
    // distinct offsets, which is the documented bounded case, not this test).
    const unit1 = { lat: 23.81031, lng: 90.41231 };
    const unit2 = { lat: 23.81034, lng: 90.41234 };
    const fuzz1 = fuzzPin(unit1, OWNER_A);
    const fuzz2 = fuzzPin(unit2, OWNER_A);
    // The derived offsets are identical (same cell key), so the two public points
    // differ exactly as much as the true points do — averaging N such listings
    // converges to (true + offset), never to true.
    const trueGap = distanceMeters(unit1, unit2);
    const publicGap = distanceMeters(fuzz1, fuzz2);
    expect(Math.abs(publicGap - trueGap)).toBeLessThan(1);
  });

  it('gives different owners different offsets at the same spot', () => {
    // An attacker planting their own pin at a target's location learns their own
    // offset, not the target's.
    const a = fuzzPin(dhaka, OWNER_A);
    const b = fuzzPin(dhaka, OWNER_B);
    expect(distanceMeters(a, b)).toBeGreaterThan(1);
  });

  it('spreads across directions (not a fixed bearing)', () => {
    const quadrants = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const owner = `64b0000000000000000${String(2000 + i)}`;
      const fuzzed = fuzzPin(dhaka, owner);
      quadrants.add(`${fuzzed.lat >= dhaka.lat ? 'N' : 'S'}${fuzzed.lng >= dhaka.lng ? 'E' : 'W'}`);
    }
    // 200 owners across 4 quadrants — all four appear unless the bearing is biased.
    expect(quadrants.size).toBe(4);
  });
});

describe('distanceMeters', () => {
  it('measures a known distance (Dhaka → Chattogram ≈ 216km)', () => {
    const dhaka = { lat: 23.8103, lng: 90.4125 };
    const chattogram = { lat: 22.3569, lng: 91.7832 };
    const d = distanceMeters(dhaka, chattogram);
    expect(d).toBeGreaterThan(205_000);
    expect(d).toBeLessThan(225_000);
  });

  it('is zero for identical points', () => {
    const p = { lat: 23.8103, lng: 90.4125 };
    expect(distanceMeters(p, p)).toBe(0);
  });
});
