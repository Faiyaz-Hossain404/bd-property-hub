// Authoritative seed: Bangladesh's 64 districts ("Zilas"), grouped under their
// division by `divisionCode` (resolved to a ref at seed time). Bilingual (EN + BN);
// `code` is the stable kebab slug upsert key. Counts per division are asserted by
// geo.data.spec.ts so a typo can't silently drift the total away from 64.
export interface DistrictSeed {
  code: string;
  divisionCode: string;
  nameEn: string;
  nameBn: string;
}

export const DISTRICT_SEED: readonly DistrictSeed[] = [
  // Dhaka division (13)
  { code: 'dhaka', divisionCode: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
  { code: 'gazipur', divisionCode: 'dhaka', nameEn: 'Gazipur', nameBn: 'গাজীপুর' },
  { code: 'narayanganj', divisionCode: 'dhaka', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ' },
  { code: 'tangail', divisionCode: 'dhaka', nameEn: 'Tangail', nameBn: 'টাঙ্গাইল' },
  { code: 'kishoreganj', divisionCode: 'dhaka', nameEn: 'Kishoreganj', nameBn: 'কিশোরগঞ্জ' },
  { code: 'manikganj', divisionCode: 'dhaka', nameEn: 'Manikganj', nameBn: 'মানিকগঞ্জ' },
  { code: 'munshiganj', divisionCode: 'dhaka', nameEn: 'Munshiganj', nameBn: 'মুন্সিগঞ্জ' },
  { code: 'narsingdi', divisionCode: 'dhaka', nameEn: 'Narsingdi', nameBn: 'নরসিংদী' },
  { code: 'faridpur', divisionCode: 'dhaka', nameEn: 'Faridpur', nameBn: 'ফরিদপুর' },
  { code: 'gopalganj', divisionCode: 'dhaka', nameEn: 'Gopalganj', nameBn: 'গোপালগঞ্জ' },
  { code: 'madaripur', divisionCode: 'dhaka', nameEn: 'Madaripur', nameBn: 'মাদারীপুর' },
  { code: 'rajbari', divisionCode: 'dhaka', nameEn: 'Rajbari', nameBn: 'রাজবাড়ী' },
  { code: 'shariatpur', divisionCode: 'dhaka', nameEn: 'Shariatpur', nameBn: 'শরীয়তপুর' },

  // Chattogram division (11)
  { code: 'chattogram', divisionCode: 'chattogram', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম' },
  { code: 'coxs-bazar', divisionCode: 'chattogram', nameEn: "Cox's Bazar", nameBn: 'কক্সবাজার' },
  { code: 'cumilla', divisionCode: 'chattogram', nameEn: 'Cumilla', nameBn: 'কুমিল্লা' },
  { code: 'brahmanbaria', divisionCode: 'chattogram', nameEn: 'Brahmanbaria', nameBn: 'ব্রাহ্মণবাড়িয়া' },
  { code: 'chandpur', divisionCode: 'chattogram', nameEn: 'Chandpur', nameBn: 'চাঁদপুর' },
  { code: 'feni', divisionCode: 'chattogram', nameEn: 'Feni', nameBn: 'ফেনী' },
  { code: 'lakshmipur', divisionCode: 'chattogram', nameEn: 'Lakshmipur', nameBn: 'লক্ষ্মীপুর' },
  { code: 'noakhali', divisionCode: 'chattogram', nameEn: 'Noakhali', nameBn: 'নোয়াখালী' },
  { code: 'khagrachhari', divisionCode: 'chattogram', nameEn: 'Khagrachhari', nameBn: 'খাগড়াছড়ি' },
  { code: 'rangamati', divisionCode: 'chattogram', nameEn: 'Rangamati', nameBn: 'রাঙ্গামাটি' },
  { code: 'bandarban', divisionCode: 'chattogram', nameEn: 'Bandarban', nameBn: 'বান্দরবান' },

  // Rajshahi division (8)
  { code: 'rajshahi', divisionCode: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী' },
  { code: 'natore', divisionCode: 'rajshahi', nameEn: 'Natore', nameBn: 'নাটোর' },
  { code: 'naogaon', divisionCode: 'rajshahi', nameEn: 'Naogaon', nameBn: 'নওগাঁ' },
  { code: 'chapainawabganj', divisionCode: 'rajshahi', nameEn: 'Chapainawabganj', nameBn: 'চাঁপাইনবাবগঞ্জ' },
  { code: 'pabna', divisionCode: 'rajshahi', nameEn: 'Pabna', nameBn: 'পাবনা' },
  { code: 'bogura', divisionCode: 'rajshahi', nameEn: 'Bogura', nameBn: 'বগুড়া' },
  { code: 'sirajganj', divisionCode: 'rajshahi', nameEn: 'Sirajganj', nameBn: 'সিরাজগঞ্জ' },
  { code: 'joypurhat', divisionCode: 'rajshahi', nameEn: 'Joypurhat', nameBn: 'জয়পুরহাট' },

  // Khulna division (10)
  { code: 'khulna', divisionCode: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা' },
  { code: 'bagerhat', divisionCode: 'khulna', nameEn: 'Bagerhat', nameBn: 'বাগেরহাট' },
  { code: 'satkhira', divisionCode: 'khulna', nameEn: 'Satkhira', nameBn: 'সাতক্ষীরা' },
  { code: 'jashore', divisionCode: 'khulna', nameEn: 'Jashore', nameBn: 'যশোর' },
  { code: 'jhenaidah', divisionCode: 'khulna', nameEn: 'Jhenaidah', nameBn: 'ঝিনাইদহ' },
  { code: 'magura', divisionCode: 'khulna', nameEn: 'Magura', nameBn: 'মাগুরা' },
  { code: 'narail', divisionCode: 'khulna', nameEn: 'Narail', nameBn: 'নড়াইল' },
  { code: 'kushtia', divisionCode: 'khulna', nameEn: 'Kushtia', nameBn: 'কুষ্টিয়া' },
  { code: 'chuadanga', divisionCode: 'khulna', nameEn: 'Chuadanga', nameBn: 'চুয়াডাঙ্গা' },
  { code: 'meherpur', divisionCode: 'khulna', nameEn: 'Meherpur', nameBn: 'মেহেরপুর' },

  // Barishal division (6)
  { code: 'barishal', divisionCode: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল' },
  { code: 'bhola', divisionCode: 'barishal', nameEn: 'Bhola', nameBn: 'ভোলা' },
  { code: 'patuakhali', divisionCode: 'barishal', nameEn: 'Patuakhali', nameBn: 'পটুয়াখালী' },
  { code: 'pirojpur', divisionCode: 'barishal', nameEn: 'Pirojpur', nameBn: 'পিরোজপুর' },
  { code: 'barguna', divisionCode: 'barishal', nameEn: 'Barguna', nameBn: 'বরগুনা' },
  { code: 'jhalokati', divisionCode: 'barishal', nameEn: 'Jhalokati', nameBn: 'ঝালকাঠি' },

  // Sylhet division (4)
  { code: 'sylhet', divisionCode: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট' },
  { code: 'moulvibazar', divisionCode: 'sylhet', nameEn: 'Moulvibazar', nameBn: 'মৌলভীবাজার' },
  { code: 'habiganj', divisionCode: 'sylhet', nameEn: 'Habiganj', nameBn: 'হবিগঞ্জ' },
  { code: 'sunamganj', divisionCode: 'sylhet', nameEn: 'Sunamganj', nameBn: 'সুনামগঞ্জ' },

  // Rangpur division (8)
  { code: 'rangpur', divisionCode: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর' },
  { code: 'dinajpur', divisionCode: 'rangpur', nameEn: 'Dinajpur', nameBn: 'দিনাজপুর' },
  { code: 'kurigram', divisionCode: 'rangpur', nameEn: 'Kurigram', nameBn: 'কুড়িগ্রাম' },
  { code: 'gaibandha', divisionCode: 'rangpur', nameEn: 'Gaibandha', nameBn: 'গাইবান্ধা' },
  { code: 'nilphamari', divisionCode: 'rangpur', nameEn: 'Nilphamari', nameBn: 'নীলফামারী' },
  { code: 'panchagarh', divisionCode: 'rangpur', nameEn: 'Panchagarh', nameBn: 'পঞ্চগড়' },
  { code: 'thakurgaon', divisionCode: 'rangpur', nameEn: 'Thakurgaon', nameBn: 'ঠাকুরগাঁও' },
  { code: 'lalmonirhat', divisionCode: 'rangpur', nameEn: 'Lalmonirhat', nameBn: 'লালমনিরহাট' },

  // Mymensingh division (4)
  { code: 'mymensingh', divisionCode: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ' },
  { code: 'jamalpur', divisionCode: 'mymensingh', nameEn: 'Jamalpur', nameBn: 'জামালপুর' },
  { code: 'netrokona', divisionCode: 'mymensingh', nameEn: 'Netrokona', nameBn: 'নেত্রকোণা' },
  { code: 'sherpur', divisionCode: 'mymensingh', nameEn: 'Sherpur', nameBn: 'শেরপুর' },
];
