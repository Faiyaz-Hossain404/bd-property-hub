// Metropolitan tier: the city-corporation cities and their police thanas.
//
// Why this file exists: the base seed (cities-upazilas.ts / areas-thanas/*) comes
// from nuhil/bangladesh-geocode, which maps only RURAL administrative units --
// upazilas and their unions. It has no metropolitan thanas at all, so Dhaka
// district offered a seller exactly five choices (Dhamrai, Dohar, Keraniganj,
// Nawabganj, Savar) and no way to say Gulshan, Mirpur or Badda. A flat in Badda
// could only be filed as "Dhaka".
//
// The city row sits at the city/upazila tier beside those rural upazilas, and its
// thanas sit at the area/thana tier -- so the existing division > district >
// city/upazila > area/thana cascade drives it with no schema or query change.
//
// Source: all-bangladeshi-addresses (npm), cross-checked against the base seed.
// Purely additive -- no existing row is edited or removed. A source row is skipped
// when it duplicates an upazila we already seed (Levenshtein <=1 on the squashed
// name, which catches transliteration drift like Taragonj/Taraganj) or when it is
// listed in the exclusions in the generator. Counts are asserted in geo.data.spec.ts.
import type { UpazilaSeed } from './cities-upazilas';
import type { AreaSeed } from './areas-thanas/area-seed';

// City-corporation cities, added at the city/upazila tier. Named for the city so
// "Dhaka" is selectable under Dhaka district.
export const METRO_CITY_SEED: readonly UpazilaSeed[] = [
  { code: 'dhaka-city', districtCode: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
  { code: 'chattogram-city', districtCode: 'chattogram', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম' },
  { code: 'khulna-city', districtCode: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা' },
  { code: 'rajshahi-city', districtCode: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী' },
  { code: 'sylhet-city', districtCode: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট' },
  { code: 'barishal-city', districtCode: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল' },
  { code: 'rangpur-city', districtCode: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর' },
  { code: 'mymensingh-city', districtCode: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ' },
  { code: 'gazipur-city', districtCode: 'gazipur', nameEn: 'Gazipur', nameBn: 'গাজীপুর' },
  { code: 'narayanganj-city', districtCode: 'narayanganj', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ' },
  { code: 'cumilla-city', districtCode: 'cumilla', nameEn: 'Cumilla', nameBn: 'কুমিল্লা' },
];

// Metropolitan police thanas, added at the area/thana tier under their city.
export const METRO_THANA_SEED: readonly AreaSeed[] = [
  // dhaka-city
  { code: 'dhaka-city-adabor', upazilaCode: 'dhaka-city', nameEn: 'Adabor', nameBn: 'আদাবর' },
  { code: 'dhaka-city-dhaka-airport', upazilaCode: 'dhaka-city', nameEn: 'Dhaka Airport', nameBn: 'বিমানবন্দর' },
  { code: 'dhaka-city-badda', upazilaCode: 'dhaka-city', nameEn: 'Badda', nameBn: 'বাড্ডা' },
  { code: 'dhaka-city-banani', upazilaCode: 'dhaka-city', nameEn: 'Banani', nameBn: 'বনানী' },
  { code: 'dhaka-city-bangshal', upazilaCode: 'dhaka-city', nameEn: 'Bangshal', nameBn: 'বংশাল' },
  { code: 'dhaka-city-bhashantek', upazilaCode: 'dhaka-city', nameEn: 'Bhashantek', nameBn: 'ভাষানটেক' },
  { code: 'dhaka-city-dhaka-cantonment', upazilaCode: 'dhaka-city', nameEn: 'Dhaka Cantonment', nameBn: 'ক্যান্টনমেন্ট' },
  { code: 'dhaka-city-dhaka-chackbazar', upazilaCode: 'dhaka-city', nameEn: 'Dhaka Chackbazar', nameBn: 'চকবাজার' },
  { code: 'dhaka-city-dakshin-khan', upazilaCode: 'dhaka-city', nameEn: 'Dakshin Khan', nameBn: 'দক্ষিণ খান' },
  { code: 'dhaka-city-darus-salam', upazilaCode: 'dhaka-city', nameEn: 'Darus-Salam', nameBn: 'দারুস সালাম' },
  { code: 'dhaka-city-demra', upazilaCode: 'dhaka-city', nameEn: 'Demra', nameBn: 'ডেমরা' },
  { code: 'dhaka-city-dhanmondi', upazilaCode: 'dhaka-city', nameEn: 'Dhanmondi', nameBn: 'ধানমন্ডি' },
  { code: 'dhaka-city-gandaria', upazilaCode: 'dhaka-city', nameEn: 'Gandaria', nameBn: 'গেন্ডারিয়া' },
  { code: 'dhaka-city-gulshan', upazilaCode: 'dhaka-city', nameEn: 'Gulshan', nameBn: 'গুলশান' },
  { code: 'dhaka-city-hatirjheel', upazilaCode: 'dhaka-city', nameEn: 'Hatirjheel', nameBn: 'হাতিরঝিল' },
  { code: 'dhaka-city-hazaribagh', upazilaCode: 'dhaka-city', nameEn: 'Hazaribagh', nameBn: 'হাজারীবাগ' },
  { code: 'dhaka-city-jatrabari', upazilaCode: 'dhaka-city', nameEn: 'Jatrabari', nameBn: 'জাত্রাবাড়ী' },
  { code: 'dhaka-city-kadamtoli', upazilaCode: 'dhaka-city', nameEn: 'Kadamtoli', nameBn: 'কদমতলী' },
  { code: 'dhaka-city-kafrul', upazilaCode: 'dhaka-city', nameEn: 'Kafrul', nameBn: 'কাফরুল' },
  { code: 'dhaka-city-kalabagan', upazilaCode: 'dhaka-city', nameEn: 'Kalabagan', nameBn: 'কালাবাগান' },
  { code: 'dhaka-city-kamrangirchar', upazilaCode: 'dhaka-city', nameEn: 'Kamrangirchar', nameBn: 'কামরাঙ্গীরচর' },
  { code: 'dhaka-city-khilgaon', upazilaCode: 'dhaka-city', nameEn: 'Khilgaon', nameBn: 'খিলগাঁও' },
  { code: 'dhaka-city-khilkhet', upazilaCode: 'dhaka-city', nameEn: 'Khilkhet', nameBn: 'খিলক্ষেত' },
  { code: 'dhaka-city-kotwali', upazilaCode: 'dhaka-city', nameEn: 'Kotwali', nameBn: 'কোতোয়ালী' },
  { code: 'dhaka-city-lalbagh', upazilaCode: 'dhaka-city', nameEn: 'Lalbagh', nameBn: 'লালবাগ' },
  { code: 'dhaka-city-mirpur-model', upazilaCode: 'dhaka-city', nameEn: 'Mirpur Model', nameBn: 'মিরপুর মডেল' },
  { code: 'dhaka-city-mohammadpur', upazilaCode: 'dhaka-city', nameEn: 'Mohammadpur', nameBn: 'মুহাম্মদপুর' },
  { code: 'dhaka-city-motijheel', upazilaCode: 'dhaka-city', nameEn: 'Motijheel', nameBn: 'মতিঝিল' },
  { code: 'dhaka-city-mugda', upazilaCode: 'dhaka-city', nameEn: 'Mugda', nameBn: 'মুগদা' },
  { code: 'dhaka-city-dhaka-new-market', upazilaCode: 'dhaka-city', nameEn: 'Dhaka New Market', nameBn: 'নিউ মার্কেট' },
  { code: 'dhaka-city-pallabi', upazilaCode: 'dhaka-city', nameEn: 'Pallabi', nameBn: 'পল্লবী' },
  { code: 'dhaka-city-paltan-model', upazilaCode: 'dhaka-city', nameEn: 'Paltan Model', nameBn: 'পল্টন মডেল' },
  { code: 'dhaka-city-ramna-model', upazilaCode: 'dhaka-city', nameEn: 'Ramna Model', nameBn: 'রামনা মডেল' },
  { code: 'dhaka-city-rampura', upazilaCode: 'dhaka-city', nameEn: 'Rampura', nameBn: 'রামপুরা' },
  { code: 'dhaka-city-rupnagar', upazilaCode: 'dhaka-city', nameEn: 'Rupnagar', nameBn: 'রূপনগর' },
  { code: 'dhaka-city-sabujbag', upazilaCode: 'dhaka-city', nameEn: 'Sabujbag', nameBn: 'সবুজবাগ' },
  { code: 'dhaka-city-shah-ali', upazilaCode: 'dhaka-city', nameEn: 'Shah Ali', nameBn: 'শাহ আলী' },
  { code: 'dhaka-city-shahbag', upazilaCode: 'dhaka-city', nameEn: 'Shahbag', nameBn: 'শাহবাগ' },
  { code: 'dhaka-city-shahjahanpur', upazilaCode: 'dhaka-city', nameEn: 'Shahjahanpur', nameBn: 'শাহজাহানপুর' },
  { code: 'dhaka-city-sher-e-bangla-nagar', upazilaCode: 'dhaka-city', nameEn: 'Sher-e-Bangla Nagar', nameBn: 'শেরে বাংলা নগর' },
  { code: 'dhaka-city-shyampur', upazilaCode: 'dhaka-city', nameEn: 'Shyampur', nameBn: 'শ্যামপুর' },
  { code: 'dhaka-city-sutrapur', upazilaCode: 'dhaka-city', nameEn: 'Sutrapur', nameBn: 'সুত্রাপুর' },
  { code: 'dhaka-city-tejgaon', upazilaCode: 'dhaka-city', nameEn: 'Tejgaon', nameBn: 'তেজগাঁও' },
  { code: 'dhaka-city-tejgaon-industrial', upazilaCode: 'dhaka-city', nameEn: 'Tejgaon Industrial', nameBn: 'তেজগাঁও শিল্পাঞ্চল' },
  { code: 'dhaka-city-turag', upazilaCode: 'dhaka-city', nameEn: 'Turag', nameBn: 'তুরাগ' },
  { code: 'dhaka-city-uttar-khan', upazilaCode: 'dhaka-city', nameEn: 'Uttar Khan', nameBn: 'উত্তর খান' },
  { code: 'dhaka-city-uttara-east', upazilaCode: 'dhaka-city', nameEn: 'Uttara East', nameBn: 'ভাটারা' },
  { code: 'dhaka-city-uttara-west', upazilaCode: 'dhaka-city', nameEn: 'Uttara West', nameBn: 'উত্তরা পূর্ব' },
  { code: 'dhaka-city-vatara', upazilaCode: 'dhaka-city', nameEn: 'Vatara', nameBn: 'উত্তরা পশ্চিম' },
  { code: 'dhaka-city-wari', upazilaCode: 'dhaka-city', nameEn: 'Wari', nameBn: 'ওয়ারী' },
  // chattogram-city
  { code: 'chattogram-city-akbarshah', upazilaCode: 'chattogram-city', nameEn: 'Akbarshah', nameBn: 'আকবরশাহ' },
  { code: 'chattogram-city-bakoliya', upazilaCode: 'chattogram-city', nameEn: 'Bakoliya', nameBn: 'বাকলিয়া' },
  { code: 'chattogram-city-chattogram-bandar', upazilaCode: 'chattogram-city', nameEn: 'Chattogram Bandar', nameBn: 'বন্দর' },
  { code: 'chattogram-city-bayazid-bostami', upazilaCode: 'chattogram-city', nameEn: 'Bayazid Bostami', nameBn: 'বায়েজিদ বোস্তামী' },
  { code: 'chattogram-city-chandgaon', upazilaCode: 'chattogram-city', nameEn: 'Chandgaon', nameBn: 'চান্দগাঁও' },
  { code: 'chattogram-city-chawkbazar', upazilaCode: 'chattogram-city', nameEn: 'Chawkbazar', nameBn: 'চকবাজার' },
  { code: 'chattogram-city-double-mooring', upazilaCode: 'chattogram-city', nameEn: 'Double Mooring', nameBn: 'ডবলমুরিং' },
  { code: 'chattogram-city-epz', upazilaCode: 'chattogram-city', nameEn: 'EPZ', nameBn: 'ইপিজেড' },
  { code: 'chattogram-city-halishahar', upazilaCode: 'chattogram-city', nameEn: 'Halishahar', nameBn: 'হালিশহর' },
  { code: 'chattogram-city-khulshi', upazilaCode: 'chattogram-city', nameEn: 'Khulshi', nameBn: 'খুলশী' },
  { code: 'chattogram-city-kotwali', upazilaCode: 'chattogram-city', nameEn: 'Kotwali', nameBn: 'কোতোয়ালী' },
  { code: 'chattogram-city-pahartali', upazilaCode: 'chattogram-city', nameEn: 'Pahartali', nameBn: 'পাহাড়তলী' },
  { code: 'chattogram-city-panchlaish', upazilaCode: 'chattogram-city', nameEn: 'Panchlaish', nameBn: 'পাঁচলাইশ' },
  { code: 'chattogram-city-patenga', upazilaCode: 'chattogram-city', nameEn: 'Patenga', nameBn: 'পতেঙ্গা' },
  { code: 'chattogram-city-chattogram-sadarghat', upazilaCode: 'chattogram-city', nameEn: 'Chattogram Sadarghat', nameBn: 'সদরঘাট' },
  // khulna-city
  { code: 'khulna-city-khulna-sadar', upazilaCode: 'khulna-city', nameEn: 'Khulna Sadar', nameBn: 'খুলনা সদর' },
  { code: 'khulna-city-sonadanga-model', upazilaCode: 'khulna-city', nameEn: 'Sonadanga Model', nameBn: 'সোনাডাঙ্গা মডেল' },
  { code: 'khulna-city-khalishpur', upazilaCode: 'khulna-city', nameEn: 'Khalishpur', nameBn: 'খালিশপুর' },
  { code: 'khulna-city-daulatpur', upazilaCode: 'khulna-city', nameEn: 'Daulatpur', nameBn: 'দৌলতপুর' },
  { code: 'khulna-city-khanjahan-ali', upazilaCode: 'khulna-city', nameEn: 'Khanjahan Ali', nameBn: 'খান জাহান আলী' },
  { code: 'khulna-city-labanchara', upazilaCode: 'khulna-city', nameEn: 'Labanchara', nameBn: 'লবণছড়া' },
  { code: 'khulna-city-harintana', upazilaCode: 'khulna-city', nameEn: 'Harintana', nameBn: 'হরিনতানা' },
  { code: 'khulna-city-aranghata', upazilaCode: 'khulna-city', nameEn: 'Aranghata', nameBn: 'আরঙ্ঘাটা' },
  // rajshahi-city
  { code: 'rajshahi-city-boalia-model', upazilaCode: 'rajshahi-city', nameEn: 'Boalia Model', nameBn: 'বোয়ালিয়া মডেল থানা' },
  { code: 'rajshahi-city-rajpara', upazilaCode: 'rajshahi-city', nameEn: 'Rajpara', nameBn: 'রাজপাড়া থানা' },
  { code: 'rajshahi-city-motihar', upazilaCode: 'rajshahi-city', nameEn: 'Motihar', nameBn: 'মতিহার থানা' },
  { code: 'rajshahi-city-shah-makhdum', upazilaCode: 'rajshahi-city', nameEn: 'Shah Makhdum', nameBn: 'শাহ মখদুম থানা' },
  { code: 'rajshahi-city-chandrima', upazilaCode: 'rajshahi-city', nameEn: 'Chandrima', nameBn: 'চন্দ্রীমা থানা' },
  { code: 'rajshahi-city-kashiadanga', upazilaCode: 'rajshahi-city', nameEn: 'Kashiadanga', nameBn: 'কাশিয়াডাঙ্গা থানা' },
  { code: 'rajshahi-city-katakhali', upazilaCode: 'rajshahi-city', nameEn: 'Katakhali', nameBn: 'কাটাখালী থানা' },
  { code: 'rajshahi-city-belpukur', upazilaCode: 'rajshahi-city', nameEn: 'Belpukur', nameBn: 'বেলপুকুর থানা' },
  { code: 'rajshahi-city-rajshahi-airport', upazilaCode: 'rajshahi-city', nameEn: 'Rajshahi Airport', nameBn: 'রাজশাহী বিমানবন্দর থানা' },
  { code: 'rajshahi-city-karnahar', upazilaCode: 'rajshahi-city', nameEn: 'Karnahar', nameBn: 'কর্ণহার থানা' },
  { code: 'rajshahi-city-damkura', upazilaCode: 'rajshahi-city', nameEn: 'Damkura', nameBn: 'ডামকুড়া থানা' },
  // sylhet-city
  { code: 'sylhet-city-kotwali-model', upazilaCode: 'sylhet-city', nameEn: 'Kotwali Model', nameBn: 'কোতোয়ালী মডেল' },
  { code: 'sylhet-city-shahporan-rh', upazilaCode: 'sylhet-city', nameEn: 'Shahporan (Rh.)', nameBn: 'শাহপরাণ' },
  { code: 'sylhet-city-sylhet-airport', upazilaCode: 'sylhet-city', nameEn: 'Sylhet Airport', nameBn: 'সিলেট বিমানবন্দর' },
  { code: 'sylhet-city-jalalabad', upazilaCode: 'sylhet-city', nameEn: 'Jalalabad', nameBn: 'জালালাবাদ' },
  { code: 'sylhet-city-moglabazar', upazilaCode: 'sylhet-city', nameEn: 'Moglabazar', nameBn: 'মোগলাবাজার' },
  // barishal-city
  { code: 'barishal-city-kazirhat', upazilaCode: 'barishal-city', nameEn: 'Kazirhat', nameBn: 'কাজিরহাট' },
  { code: 'barishal-city-kotwali-model', upazilaCode: 'barishal-city', nameEn: 'Kotwali Model', nameBn: 'কোতোয়ালী মডেল' },
  { code: 'barishal-city-kaunia', upazilaCode: 'barishal-city', nameEn: 'Kaunia', nameBn: 'কাউনিয়া' },
  { code: 'barishal-city-barishal-bandar', upazilaCode: 'barishal-city', nameEn: 'Barishal Bandar', nameBn: 'বরিশাল বন্দর' },
  { code: 'barishal-city-barishal-airport', upazilaCode: 'barishal-city', nameEn: 'Barishal Airport', nameBn: 'বরিশাল বিমানবন্দর' },
  // rangpur-city
  { code: 'rangpur-city-kotwali', upazilaCode: 'rangpur-city', nameEn: 'Kotwali', nameBn: 'রংপুর কোতোয়ালী' },
  { code: 'rangpur-city-haragach', upazilaCode: 'rangpur-city', nameEn: 'Haragach', nameBn: 'হারাগাছ' },
  { code: 'rangpur-city-tajhat', upazilaCode: 'rangpur-city', nameEn: 'Tajhat', nameBn: 'তাজহাট' },
  { code: 'rangpur-city-mahiganj', upazilaCode: 'rangpur-city', nameEn: 'Mahiganj', nameBn: 'মহিগঞ্জ' },
  { code: 'rangpur-city-hazirhat', upazilaCode: 'rangpur-city', nameEn: 'Hazirhat', nameBn: 'হাজিরহাট' },
  // mymensingh-city
  { code: 'mymensingh-city-kotwali-model', upazilaCode: 'mymensingh-city', nameEn: 'Kotwali Model', nameBn: 'কোতোয়ালী মডেল' },
  { code: 'mymensingh-city-pagla', upazilaCode: 'mymensingh-city', nameEn: 'Pagla', nameBn: 'পাগলা' },
  { code: 'mymensingh-city-mymensingh-railway', upazilaCode: 'mymensingh-city', nameEn: 'Mymensingh Railway', nameBn: 'ময়মনসিংহ রেলওয়ে' },
  // gazipur-city
  { code: 'gazipur-city-joydebpur', upazilaCode: 'gazipur-city', nameEn: 'Joydebpur', nameBn: 'জয়দেবপুর' },
  { code: 'gazipur-city-bason', upazilaCode: 'gazipur-city', nameEn: 'Bason', nameBn: 'বাসন' },
  { code: 'gazipur-city-gacha', upazilaCode: 'gazipur-city', nameEn: 'Gacha', nameBn: 'গাছা' },
  { code: 'gazipur-city-konabari', upazilaCode: 'gazipur-city', nameEn: 'Konabari', nameBn: 'কোনাবাড়ি' },
  { code: 'gazipur-city-kashimpur', upazilaCode: 'gazipur-city', nameEn: 'Kashimpur', nameBn: 'কাশিমপুর' },
  { code: 'gazipur-city-pubail', upazilaCode: 'gazipur-city', nameEn: 'Pubail', nameBn: 'পূবাইল' },
  { code: 'gazipur-city-tongi-east', upazilaCode: 'gazipur-city', nameEn: 'Tongi East', nameBn: 'টঙ্গী পূর্ব' },
  { code: 'gazipur-city-tongi-west', upazilaCode: 'gazipur-city', nameEn: 'Tongi West', nameBn: 'টঙ্গী পশ্চিম' },
  // narayanganj-city
  { code: 'narayanganj-city-fatulla-model', upazilaCode: 'narayanganj-city', nameEn: 'Fatulla Model', nameBn: 'ফতুল্লা মডেল' },
  { code: 'narayanganj-city-siddhirganj', upazilaCode: 'narayanganj-city', nameEn: 'Siddhirganj', nameBn: 'সিদ্ধিরগঞ্জ' },
  // cumilla-city
  { code: 'cumilla-city-bangra-bazar', upazilaCode: 'cumilla-city', nameEn: 'Bangra-Bazar', nameBn: 'বাঙ্গরা বাজার' },
];
