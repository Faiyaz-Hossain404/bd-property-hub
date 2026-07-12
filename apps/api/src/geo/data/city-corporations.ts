// Authoritative seed: Bangladesh's 12 city corporations (DATABASE_DESIGN.md §4,
// FR-S7c) — a fixed, flat reference list used as an optional location tag, not part
// of the division→district→upazila→area hierarchy. `code` is the stable kebab slug
// upsert key. Bilingual (EN + BN). Count and slug-uniqueness are asserted in
// geo.data.spec.ts.
//
// The design mentions "13" as an approximate figure; the current statutory list is
// 12 city corporations (Cumilla is a city corporation; a 13th was long proposed but
// not yet operational). Kept as the live list — add a row here if another is
// gazetted.
export interface CityCorporationSeed {
  code: string;
  nameEn: string;
  nameBn: string;
}

export const CITY_CORPORATION_SEED: readonly CityCorporationSeed[] = [
  { code: 'dhaka-north', nameEn: 'Dhaka North', nameBn: 'ঢাকা উত্তর' },
  { code: 'dhaka-south', nameEn: 'Dhaka South', nameBn: 'ঢাকা দক্ষিণ' },
  { code: 'chattogram', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম' },
  { code: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা' },
  { code: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী' },
  { code: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট' },
  { code: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল' },
  { code: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর' },
  { code: 'comilla', nameEn: 'Cumilla', nameBn: 'কুমিল্লা' },
  { code: 'gazipur', nameEn: 'Gazipur', nameBn: 'গাজীপুর' },
  { code: 'narayanganj', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ' },
  { code: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ' },
];
