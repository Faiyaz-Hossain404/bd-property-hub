// Shared shape for the areas/thanas (union) seed tier — the level below a
// city/upazila (DATABASE_DESIGN.md §4). Split into one file per division only to
// keep each generated data file reviewable; the seeder consumes the flat
// `AREA_SEED` re-exported from ./index.
export interface AreaSeed {
  code: string;
  upazilaCode: string;
  nameEn: string;
  nameBn: string;
}
