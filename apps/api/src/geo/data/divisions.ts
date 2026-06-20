// Authoritative seed: Bangladesh's 8 administrative divisions (MAP-5), bilingual
// (EN + BN). `code` is a stable kebab slug used as the upsert key. Divisions
// change extremely rarely; this list is the source of truth for the seeder.
export interface DivisionSeed {
  code: string;
  nameEn: string;
  nameBn: string;
}

export const DIVISION_SEED: readonly DivisionSeed[] = [
  { code: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
  { code: 'chattogram', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম' },
  { code: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা' },
  { code: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী' },
  { code: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল' },
  { code: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট' },
  { code: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর' },
  { code: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ' },
];
