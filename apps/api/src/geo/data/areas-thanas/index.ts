// Flat nationwide areas/thanas (union) seed, concatenated from the per-division
// files. This is what GeoService.seed consumes. Generated — do not hand-edit.
import type { AreaSeed } from './area-seed';
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
];
