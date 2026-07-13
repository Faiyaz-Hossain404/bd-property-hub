import { createHmac, randomBytes } from 'crypto';
import { PIN_FUZZ_MAX_METERS, PIN_FUZZ_MIN_METERS, type PublicGeoPoint } from '@bdph/types';

// Location fuzzing (MAP-2). The public map point is the seller's exact pin pushed
// 150–400m in a pseudo-random direction, far enough that the true address can't
// be read off the map but close enough that the neighbourhood is honest.
//
// The offset is NOT independent randomness per listing. An agency posting many
// units at the same building would then hand the public N independent samples
// around one true point — their average converges right back to it. Instead the
// offset is an HMAC over (owner, ~100m location cell) with a server-side secret:
//
// - Co-located listings by the same owner share ONE offset, so any number of them
//   averages to the offset point, never the truth.
// - The HMAC secret means the offset can't be computed (or inverted) from
//   anything public.
// - Keying on the owner means an attacker can't recover a cell's offset by
//   planting their own pin nearby and diffing — their offset is their own.
// - Deterministic by construction, so re-saving the same pin can't be used to
//   collect fresh samples. The caller still stores the result; reads never
//   recompute (a secret rotation then shifts only future writes).

const EARTH_RADIUS_METERS = 6_371_000;

// Cell size for keying (not for display): ~111m of latitude. Pins in the same
// cell get the same offset; a building split across a cell edge yields at most a
// handful of distinct offsets — bounded, unlike per-listing randomness.
const CELL_DEGREES = 0.001;

// Secret for the offset HMAC. Dedicated env var first; falls back to the session
// secret (always set in real deployments) and, in secretless dev/test runs, to a
// per-process random value — still unguessable, just not stable across restarts
// (stored displayPoints are unaffected).
const processFallbackSecret = randomBytes(32).toString('hex');
function fuzzSecret(): string {
  return (
    process.env.LOCATION_FUZZ_SECRET ?? process.env.SESSION_SECRET ?? processFallbackSecret
  );
}

// Meters of latitude per degree is effectively constant; meters of longitude per
// degree shrinks with cos(latitude) — at Bangladesh's ~23°N the correction is ~8%.
function metersToLatDegrees(meters: number): number {
  return (meters / EARTH_RADIUS_METERS) * (180 / Math.PI);
}

function metersToLngDegrees(meters: number, atLatDegrees: number): number {
  return metersToLatDegrees(meters) / Math.cos((atLatDegrees * Math.PI) / 180);
}

// Derive the stored public point for a pin owned by `ownerId`: a keyed offset at
// a distance in [PIN_FUZZ_MIN_METERS, PIN_FUZZ_MAX_METERS].
export function fuzzPin(exact: PublicGeoPoint, ownerId: string): PublicGeoPoint {
  const latCell = Math.round(exact.lat / CELL_DEGREES);
  const lngCell = Math.round(exact.lng / CELL_DEGREES);
  const digest = createHmac('sha256', fuzzSecret())
    .update(`${ownerId}:${latCell}:${lngCell}`)
    .digest();

  // Two independent uniform draws from disjoint digest bytes.
  const angleUnit = digest.readUInt32BE(0) / 0xffffffff;
  const distanceUnit = digest.readUInt32BE(4) / 0xffffffff;

  const angle = angleUnit * 2 * Math.PI;
  const distanceMetersOut =
    PIN_FUZZ_MIN_METERS + distanceUnit * (PIN_FUZZ_MAX_METERS - PIN_FUZZ_MIN_METERS);

  const northMeters = Math.sin(angle) * distanceMetersOut;
  const eastMeters = Math.cos(angle) * distanceMetersOut;

  return {
    lat: exact.lat + metersToLatDegrees(northMeters),
    lng: exact.lng + metersToLngDegrees(eastMeters, exact.lat),
  };
}

// Great-circle distance (haversine) in meters — used by tests to assert the fuzz
// stays inside its annulus, and available for future radius features (MAP-4).
export function distanceMeters(a: PublicGeoPoint, b: PublicGeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
