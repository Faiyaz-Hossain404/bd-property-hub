// The complete city/upazila tier: the generated rural upazilas plus the
// metropolitan city rows. Mirrors areas-thanas/index.ts, which does the same job
// for the tier below. The seeder and the data spec consume this, not the raw
// generated list, so the metro tier can never be seeded at one level but missed
// at the other.
import type { UpazilaSeed } from './cities-upazilas';
import { UPAZILA_SEED } from './cities-upazilas';
import { METRO_CITY_SEED } from './metro';

export type { UpazilaSeed };

export const CITY_UPAZILA_SEED: readonly UpazilaSeed[] = [...UPAZILA_SEED, ...METRO_CITY_SEED];
