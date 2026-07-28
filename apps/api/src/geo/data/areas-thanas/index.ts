// Flat nationwide areas/thanas seed. This is what GeoService.seed consumes.
//
// Two sources, deliberately kept apart: the per-division files below are the
// generated rural unions (do not hand-edit those), and METRO_THANA_SEED adds the
// metropolitan police thanas the generated dataset has no concept of — see
// ../metro.ts.
import type { AreaSeed } from './area-seed';
import { METRO_THANA_SEED } from '../metro';
import { DHAKA_AREAS } from './dhaka';
import { CHATTOGRAM_AREAS } from './chattogram';
import { RAJSHAHI_AREAS } from './rajshahi';
import { KHULNA_AREAS } from './khulna';
import { BARISHAL_AREAS } from './barishal';
import { SYLHET_AREAS } from './sylhet';
import { RANGPUR_AREAS } from './rangpur';
import { MYMENSINGH_AREAS } from './mymensingh';

export type { AreaSeed };

export const AREA_SEED: readonly AreaSeed[] = [
  ...DHAKA_AREAS,
  ...CHATTOGRAM_AREAS,
  ...RAJSHAHI_AREAS,
  ...KHULNA_AREAS,
  ...BARISHAL_AREAS,
  ...SYLHET_AREAS,
  ...RANGPUR_AREAS,
  ...MYMENSINGH_AREAS,
  ...METRO_THANA_SEED,
];
