// Authoritative seed: Bangladesh's cities/upazilas ("Upazila"/"Thana" tier), the
// level below a district (DATABASE_DESIGN.md §4). Grouped under their district by
// `districtCode` (resolved to a ref at seed time). Bilingual (EN + BN); `code` is a
// stable slug (district-namespaced so it is globally unique) used as the upsert key.
// Generated from the open nuhil/bangladesh-geocode dataset; counts asserted in
// geo.data.spec.ts. Do not hand-edit — regenerate if the source changes.
export interface UpazilaSeed {
  code: string;
  districtCode: string;
  nameEn: string;
  nameBn: string;
}

export const UPAZILA_SEED: readonly UpazilaSeed[] = [
  // dhaka (5)
  { code: 'dhaka-dhamrai', districtCode: 'dhaka', nameEn: 'Dhamrai', nameBn: 'ধামরাই' },
  { code: 'dhaka-dohar', districtCode: 'dhaka', nameEn: 'Dohar', nameBn: 'দোহার' },
  { code: 'dhaka-keraniganj', districtCode: 'dhaka', nameEn: 'Keraniganj', nameBn: 'কেরাণীগঞ্জ' },
  { code: 'dhaka-nawabganj', districtCode: 'dhaka', nameEn: 'Nawabganj', nameBn: 'নবাবগঞ্জ' },
  { code: 'dhaka-savar', districtCode: 'dhaka', nameEn: 'Savar', nameBn: 'সাভার' },

  // gazipur (5)
  { code: 'gazipur-gazipur-sadar', districtCode: 'gazipur', nameEn: 'Gazipur Sadar', nameBn: 'গাজীপুর সদর' },
  { code: 'gazipur-kaliakair', districtCode: 'gazipur', nameEn: 'Kaliakair', nameBn: 'কালিয়াকৈর' },
  { code: 'gazipur-kaliganj', districtCode: 'gazipur', nameEn: 'Kaliganj', nameBn: 'কালীগঞ্জ' },
  { code: 'gazipur-kapasia', districtCode: 'gazipur', nameEn: 'Kapasia', nameBn: 'কাপাসিয়া' },
  { code: 'gazipur-sreepur', districtCode: 'gazipur', nameEn: 'Sreepur', nameBn: 'শ্রীপুর' },

  // narayanganj (5)
  { code: 'narayanganj-araihazar', districtCode: 'narayanganj', nameEn: 'Araihazar', nameBn: 'আড়াইহাজার' },
  { code: 'narayanganj-bandar', districtCode: 'narayanganj', nameEn: 'Bandar', nameBn: 'বন্দর' },
  { code: 'narayanganj-narayanganj-sadar', districtCode: 'narayanganj', nameEn: 'Narayanganj Sadar', nameBn: 'নারায়নগঞ্জ সদর' },
  { code: 'narayanganj-rupganj', districtCode: 'narayanganj', nameEn: 'Rupganj', nameBn: 'রূপগঞ্জ' },
  { code: 'narayanganj-sonargaon', districtCode: 'narayanganj', nameEn: 'Sonargaon', nameBn: 'সোনারগাঁ' },

  // tangail (12)
  { code: 'tangail-basail', districtCode: 'tangail', nameEn: 'Basail', nameBn: 'বাসাইল' },
  { code: 'tangail-bhuapur', districtCode: 'tangail', nameEn: 'Bhuapur', nameBn: 'ভুয়াপুর' },
  { code: 'tangail-delduar', districtCode: 'tangail', nameEn: 'Delduar', nameBn: 'দেলদুয়ার' },
  { code: 'tangail-dhanbari', districtCode: 'tangail', nameEn: 'Dhanbari', nameBn: 'ধনবাড়ী' },
  { code: 'tangail-ghatail', districtCode: 'tangail', nameEn: 'Ghatail', nameBn: 'ঘাটাইল' },
  { code: 'tangail-gopalpur', districtCode: 'tangail', nameEn: 'Gopalpur', nameBn: 'গোপালপুর' },
  { code: 'tangail-kalihati', districtCode: 'tangail', nameEn: 'Kalihati', nameBn: 'কালিহাতী' },
  { code: 'tangail-madhupur', districtCode: 'tangail', nameEn: 'Madhupur', nameBn: 'মধুপুর' },
  { code: 'tangail-mirzapur', districtCode: 'tangail', nameEn: 'Mirzapur', nameBn: 'মির্জাপুর' },
  { code: 'tangail-nagarpur', districtCode: 'tangail', nameEn: 'Nagarpur', nameBn: 'নাগরপুর' },
  { code: 'tangail-sakhipur', districtCode: 'tangail', nameEn: 'Sakhipur', nameBn: 'সখিপুর' },
  { code: 'tangail-tangail-sadar', districtCode: 'tangail', nameEn: 'Tangail Sadar', nameBn: 'টাঙ্গাইল সদর' },

  // kishoreganj (13)
  { code: 'kishoreganj-austagram', districtCode: 'kishoreganj', nameEn: 'Austagram', nameBn: 'অষ্টগ্রাম' },
  { code: 'kishoreganj-bajitpur', districtCode: 'kishoreganj', nameEn: 'Bajitpur', nameBn: 'বাজিতপুর' },
  { code: 'kishoreganj-bhairab', districtCode: 'kishoreganj', nameEn: 'Bhairab', nameBn: 'ভৈরব' },
  { code: 'kishoreganj-hossainpur', districtCode: 'kishoreganj', nameEn: 'Hossainpur', nameBn: 'হোসেনপুর' },
  { code: 'kishoreganj-itna', districtCode: 'kishoreganj', nameEn: 'Itna', nameBn: 'ইটনা' },
  { code: 'kishoreganj-karimgonj', districtCode: 'kishoreganj', nameEn: 'Karimgonj', nameBn: 'করিমগঞ্জ' },
  { code: 'kishoreganj-katiadi', districtCode: 'kishoreganj', nameEn: 'Katiadi', nameBn: 'কটিয়াদী' },
  { code: 'kishoreganj-kishoreganj-sadar', districtCode: 'kishoreganj', nameEn: 'Kishoreganj Sadar', nameBn: 'কিশোরগঞ্জ সদর' },
  { code: 'kishoreganj-kuliarchar', districtCode: 'kishoreganj', nameEn: 'Kuliarchar', nameBn: 'কুলিয়ারচর' },
  { code: 'kishoreganj-mithamoin', districtCode: 'kishoreganj', nameEn: 'Mithamoin', nameBn: 'মিঠামইন' },
  { code: 'kishoreganj-nikli', districtCode: 'kishoreganj', nameEn: 'Nikli', nameBn: 'নিকলী' },
  { code: 'kishoreganj-pakundia', districtCode: 'kishoreganj', nameEn: 'Pakundia', nameBn: 'পাকুন্দিয়া' },
  { code: 'kishoreganj-tarail', districtCode: 'kishoreganj', nameEn: 'Tarail', nameBn: 'তাড়াইল' },

  // manikganj (7)
  { code: 'manikganj-doulatpur', districtCode: 'manikganj', nameEn: 'Doulatpur', nameBn: 'দৌলতপুর' },
  { code: 'manikganj-gior', districtCode: 'manikganj', nameEn: 'Gior', nameBn: 'ঘিওর' },
  { code: 'manikganj-harirampur', districtCode: 'manikganj', nameEn: 'Harirampur', nameBn: 'হরিরামপুর' },
  { code: 'manikganj-manikganj-sadar', districtCode: 'manikganj', nameEn: 'Manikganj Sadar', nameBn: 'মানিকগঞ্জ সদর' },
  { code: 'manikganj-saturia', districtCode: 'manikganj', nameEn: 'Saturia', nameBn: 'সাটুরিয়া' },
  { code: 'manikganj-shibaloy', districtCode: 'manikganj', nameEn: 'Shibaloy', nameBn: 'শিবালয়' },
  { code: 'manikganj-singiar', districtCode: 'manikganj', nameEn: 'Singiar', nameBn: 'সিংগাইর' },

  // munshiganj (6)
  { code: 'munshiganj-gajaria', districtCode: 'munshiganj', nameEn: 'Gajaria', nameBn: 'গজারিয়া' },
  { code: 'munshiganj-louhajanj', districtCode: 'munshiganj', nameEn: 'Louhajanj', nameBn: 'লৌহজং' },
  { code: 'munshiganj-munshiganj-sadar', districtCode: 'munshiganj', nameEn: 'Munshiganj Sadar', nameBn: 'মুন্সিগঞ্জ সদর' },
  { code: 'munshiganj-sirajdikhan', districtCode: 'munshiganj', nameEn: 'Sirajdikhan', nameBn: 'সিরাজদিখান' },
  { code: 'munshiganj-sreenagar', districtCode: 'munshiganj', nameEn: 'Sreenagar', nameBn: 'শ্রীনগর' },
  { code: 'munshiganj-tongibari', districtCode: 'munshiganj', nameEn: 'Tongibari', nameBn: 'টংগীবাড়ি' },

  // narsingdi (6)
  { code: 'narsingdi-belabo', districtCode: 'narsingdi', nameEn: 'Belabo', nameBn: 'বেলাবো' },
  { code: 'narsingdi-monohardi', districtCode: 'narsingdi', nameEn: 'Monohardi', nameBn: 'মনোহরদী' },
  { code: 'narsingdi-narsingdi-sadar', districtCode: 'narsingdi', nameEn: 'Narsingdi Sadar', nameBn: 'নরসিংদী সদর' },
  { code: 'narsingdi-palash', districtCode: 'narsingdi', nameEn: 'Palash', nameBn: 'পলাশ' },
  { code: 'narsingdi-raipura', districtCode: 'narsingdi', nameEn: 'Raipura', nameBn: 'রায়পুরা' },
  { code: 'narsingdi-shibpur', districtCode: 'narsingdi', nameEn: 'Shibpur', nameBn: 'শিবপুর' },

  // faridpur (9)
  { code: 'faridpur-alfadanga', districtCode: 'faridpur', nameEn: 'Alfadanga', nameBn: 'আলফাডাঙ্গা' },
  { code: 'faridpur-bhanga', districtCode: 'faridpur', nameEn: 'Bhanga', nameBn: 'ভাঙ্গা' },
  { code: 'faridpur-boalmari', districtCode: 'faridpur', nameEn: 'Boalmari', nameBn: 'বোয়ালমারী' },
  { code: 'faridpur-charbhadrasan', districtCode: 'faridpur', nameEn: 'Charbhadrasan', nameBn: 'চরভদ্রাসন' },
  { code: 'faridpur-faridpur-sadar', districtCode: 'faridpur', nameEn: 'Faridpur Sadar', nameBn: 'ফরিদপুর সদর' },
  { code: 'faridpur-madhukhali', districtCode: 'faridpur', nameEn: 'Madhukhali', nameBn: 'মধুখালী' },
  { code: 'faridpur-nagarkanda', districtCode: 'faridpur', nameEn: 'Nagarkanda', nameBn: 'নগরকান্দা' },
  { code: 'faridpur-sadarpur', districtCode: 'faridpur', nameEn: 'Sadarpur', nameBn: 'সদরপুর' },
  { code: 'faridpur-saltha', districtCode: 'faridpur', nameEn: 'Saltha', nameBn: 'সালথা' },

  // gopalganj (5)
  { code: 'gopalganj-gopalganj-sadar', districtCode: 'gopalganj', nameEn: 'Gopalganj Sadar', nameBn: 'গোপালগঞ্জ সদর' },
  { code: 'gopalganj-kashiani', districtCode: 'gopalganj', nameEn: 'Kashiani', nameBn: 'কাশিয়ানী' },
  { code: 'gopalganj-kotalipara', districtCode: 'gopalganj', nameEn: 'Kotalipara', nameBn: 'কোটালীপাড়া' },
  { code: 'gopalganj-muksudpur', districtCode: 'gopalganj', nameEn: 'Muksudpur', nameBn: 'মুকসুদপুর' },
  { code: 'gopalganj-tungipara', districtCode: 'gopalganj', nameEn: 'Tungipara', nameBn: 'টুংগীপাড়া' },

  // madaripur (5)
  { code: 'madaripur-dasar', districtCode: 'madaripur', nameEn: 'Dasar', nameBn: 'ডাসার' },
  { code: 'madaripur-kalkini', districtCode: 'madaripur', nameEn: 'Kalkini', nameBn: 'কালকিনি' },
  { code: 'madaripur-madaripur-sadar', districtCode: 'madaripur', nameEn: 'Madaripur Sadar', nameBn: 'মাদারীপুর সদর' },
  { code: 'madaripur-rajoir', districtCode: 'madaripur', nameEn: 'Rajoir', nameBn: 'রাজৈর' },
  { code: 'madaripur-shibchar', districtCode: 'madaripur', nameEn: 'Shibchar', nameBn: 'শিবচর' },

  // rajbari (5)
  { code: 'rajbari-baliakandi', districtCode: 'rajbari', nameEn: 'Baliakandi', nameBn: 'বালিয়াকান্দি' },
  { code: 'rajbari-goalanda', districtCode: 'rajbari', nameEn: 'Goalanda', nameBn: 'গোয়ালন্দ' },
  { code: 'rajbari-kalukhali', districtCode: 'rajbari', nameEn: 'Kalukhali', nameBn: 'কালুখালী' },
  { code: 'rajbari-pangsa', districtCode: 'rajbari', nameEn: 'Pangsa', nameBn: 'পাংশা' },
  { code: 'rajbari-rajbari-sadar', districtCode: 'rajbari', nameEn: 'Rajbari Sadar', nameBn: 'রাজবাড়ী সদর' },

  // shariatpur (6)
  { code: 'shariatpur-bhedarganj', districtCode: 'shariatpur', nameEn: 'Bhedarganj', nameBn: 'ভেদরগঞ্জ' },
  { code: 'shariatpur-damudya', districtCode: 'shariatpur', nameEn: 'Damudya', nameBn: 'ডামুড্যা' },
  { code: 'shariatpur-gosairhat', districtCode: 'shariatpur', nameEn: 'Gosairhat', nameBn: 'গোসাইরহাট' },
  { code: 'shariatpur-naria', districtCode: 'shariatpur', nameEn: 'Naria', nameBn: 'নড়িয়া' },
  { code: 'shariatpur-shariatpur-sadar', districtCode: 'shariatpur', nameEn: 'Shariatpur Sadar', nameBn: 'শরিয়তপুর সদর' },
  { code: 'shariatpur-zajira', districtCode: 'shariatpur', nameEn: 'Zajira', nameBn: 'জাজিরা' },

  // chattogram (15)
  { code: 'chattogram-anwara', districtCode: 'chattogram', nameEn: 'Anwara', nameBn: 'আনোয়ারা' },
  { code: 'chattogram-banshkhali', districtCode: 'chattogram', nameEn: 'Banshkhali', nameBn: 'বাঁশখালী' },
  { code: 'chattogram-boalkhali', districtCode: 'chattogram', nameEn: 'Boalkhali', nameBn: 'বোয়ালখালী' },
  { code: 'chattogram-chandanaish', districtCode: 'chattogram', nameEn: 'Chandanaish', nameBn: 'চন্দনাইশ' },
  { code: 'chattogram-fatikchhari', districtCode: 'chattogram', nameEn: 'Fatikchhari', nameBn: 'ফটিকছড়ি' },
  { code: 'chattogram-hathazari', districtCode: 'chattogram', nameEn: 'Hathazari', nameBn: 'হাটহাজারী' },
  { code: 'chattogram-karnafuli', districtCode: 'chattogram', nameEn: 'Karnafuli', nameBn: 'কর্ণফুলী' },
  { code: 'chattogram-lohagara', districtCode: 'chattogram', nameEn: 'Lohagara', nameBn: 'লোহাগাড়া' },
  { code: 'chattogram-mirsharai', districtCode: 'chattogram', nameEn: 'Mirsharai', nameBn: 'মীরসরাই' },
  { code: 'chattogram-patiya', districtCode: 'chattogram', nameEn: 'Patiya', nameBn: 'পটিয়া' },
  { code: 'chattogram-rangunia', districtCode: 'chattogram', nameEn: 'Rangunia', nameBn: 'রাঙ্গুনিয়া' },
  { code: 'chattogram-raozan', districtCode: 'chattogram', nameEn: 'Raozan', nameBn: 'রাউজান' },
  { code: 'chattogram-sandwip', districtCode: 'chattogram', nameEn: 'Sandwip', nameBn: 'সন্দ্বীপ' },
  { code: 'chattogram-satkania', districtCode: 'chattogram', nameEn: 'Satkania', nameBn: 'সাতকানিয়া' },
  { code: 'chattogram-sitakunda', districtCode: 'chattogram', nameEn: 'Sitakunda', nameBn: 'সীতাকুন্ড' },

  // coxs-bazar (9)
  { code: 'coxs-bazar-chakaria', districtCode: 'coxs-bazar', nameEn: 'Chakaria', nameBn: 'চকরিয়া' },
  { code: 'coxs-bazar-coxsbazar-sadar', districtCode: 'coxs-bazar', nameEn: 'Coxsbazar Sadar', nameBn: 'কক্সবাজার সদর' },
  { code: 'coxs-bazar-eidgaon', districtCode: 'coxs-bazar', nameEn: 'Eidgaon', nameBn: 'ঈদগাঁও' },
  { code: 'coxs-bazar-kutubdia', districtCode: 'coxs-bazar', nameEn: 'Kutubdia', nameBn: 'কুতুবদিয়া' },
  { code: 'coxs-bazar-moheshkhali', districtCode: 'coxs-bazar', nameEn: 'Moheshkhali', nameBn: 'মহেশখালী' },
  { code: 'coxs-bazar-pekua', districtCode: 'coxs-bazar', nameEn: 'Pekua', nameBn: 'পেকুয়া' },
  { code: 'coxs-bazar-ramu', districtCode: 'coxs-bazar', nameEn: 'Ramu', nameBn: 'রামু' },
  { code: 'coxs-bazar-teknaf', districtCode: 'coxs-bazar', nameEn: 'Teknaf', nameBn: 'টেকনাফ' },
  { code: 'coxs-bazar-ukhiya', districtCode: 'coxs-bazar', nameEn: 'Ukhiya', nameBn: 'উখিয়া' },

  // cumilla (17)
  { code: 'cumilla-barura', districtCode: 'cumilla', nameEn: 'Barura', nameBn: 'বরুড়া' },
  { code: 'cumilla-brahmanpara', districtCode: 'cumilla', nameEn: 'Brahmanpara', nameBn: 'ব্রাহ্মণপাড়া' },
  { code: 'cumilla-burichang', districtCode: 'cumilla', nameEn: 'Burichang', nameBn: 'বুড়িচং' },
  { code: 'cumilla-chandina', districtCode: 'cumilla', nameEn: 'Chandina', nameBn: 'চান্দিনা' },
  { code: 'cumilla-chauddagram', districtCode: 'cumilla', nameEn: 'Chauddagram', nameBn: 'চৌদ্দগ্রাম' },
  { code: 'cumilla-comilla-sadar', districtCode: 'cumilla', nameEn: 'Comilla Sadar', nameBn: 'কুমিল্লা সদর' },
  { code: 'cumilla-daudkandi', districtCode: 'cumilla', nameEn: 'Daudkandi', nameBn: 'দাউদকান্দি' },
  { code: 'cumilla-debidwar', districtCode: 'cumilla', nameEn: 'Debidwar', nameBn: 'দেবিদ্বার' },
  { code: 'cumilla-homna', districtCode: 'cumilla', nameEn: 'Homna', nameBn: 'হোমনা' },
  { code: 'cumilla-laksam', districtCode: 'cumilla', nameEn: 'Laksam', nameBn: 'লাকসাম' },
  { code: 'cumilla-lalmai', districtCode: 'cumilla', nameEn: 'Lalmai', nameBn: 'লালমাই' },
  { code: 'cumilla-meghna', districtCode: 'cumilla', nameEn: 'Meghna', nameBn: 'মেঘনা' },
  { code: 'cumilla-monohargonj', districtCode: 'cumilla', nameEn: 'Monohargonj', nameBn: 'মনোহরগঞ্জ' },
  { code: 'cumilla-muradnagar', districtCode: 'cumilla', nameEn: 'Muradnagar', nameBn: 'মুরাদনগর' },
  { code: 'cumilla-nangalkot', districtCode: 'cumilla', nameEn: 'Nangalkot', nameBn: 'নাঙ্গলকোট' },
  { code: 'cumilla-sadarsouth', districtCode: 'cumilla', nameEn: 'Sadarsouth', nameBn: 'সদর দক্ষিণ' },
  { code: 'cumilla-titas', districtCode: 'cumilla', nameEn: 'Titas', nameBn: 'তিতাস' },

  // brahmanbaria (9)
  { code: 'brahmanbaria-akhaura', districtCode: 'brahmanbaria', nameEn: 'Akhaura', nameBn: 'আখাউড়া' },
  { code: 'brahmanbaria-ashuganj', districtCode: 'brahmanbaria', nameEn: 'Ashuganj', nameBn: 'আশুগঞ্জ' },
  { code: 'brahmanbaria-bancharampur', districtCode: 'brahmanbaria', nameEn: 'Bancharampur', nameBn: 'বাঞ্ছারামপুর' },
  { code: 'brahmanbaria-bijoynagar', districtCode: 'brahmanbaria', nameEn: 'Bijoynagar', nameBn: 'বিজয়নগর' },
  { code: 'brahmanbaria-brahmanbaria-sadar', districtCode: 'brahmanbaria', nameEn: 'Brahmanbaria Sadar', nameBn: 'ব্রাহ্মণবাড়িয়া সদর' },
  { code: 'brahmanbaria-kasba', districtCode: 'brahmanbaria', nameEn: 'Kasba', nameBn: 'কসবা' },
  { code: 'brahmanbaria-nabinagar', districtCode: 'brahmanbaria', nameEn: 'Nabinagar', nameBn: 'নবীনগর' },
  { code: 'brahmanbaria-nasirnagar', districtCode: 'brahmanbaria', nameEn: 'Nasirnagar', nameBn: 'নাসিরনগর' },
  { code: 'brahmanbaria-sarail', districtCode: 'brahmanbaria', nameEn: 'Sarail', nameBn: 'সরাইল' },

  // chandpur (8)
  { code: 'chandpur-chandpur-sadar', districtCode: 'chandpur', nameEn: 'Chandpur Sadar', nameBn: 'চাঁদপুর সদর' },
  { code: 'chandpur-faridgonj', districtCode: 'chandpur', nameEn: 'Faridgonj', nameBn: 'ফরিদগঞ্জ' },
  { code: 'chandpur-haimchar', districtCode: 'chandpur', nameEn: 'Haimchar', nameBn: 'হাইমচর' },
  { code: 'chandpur-hajiganj', districtCode: 'chandpur', nameEn: 'Hajiganj', nameBn: 'হাজীগঞ্জ' },
  { code: 'chandpur-kachua', districtCode: 'chandpur', nameEn: 'Kachua', nameBn: 'কচুয়া' },
  { code: 'chandpur-matlab-north', districtCode: 'chandpur', nameEn: 'Matlab North', nameBn: 'মতলব উত্তর' },
  { code: 'chandpur-matlab-south', districtCode: 'chandpur', nameEn: 'Matlab South', nameBn: 'মতলব দক্ষিণ' },
  { code: 'chandpur-shahrasti', districtCode: 'chandpur', nameEn: 'Shahrasti', nameBn: 'শাহরাস্তি	' },

  // feni (6)
  { code: 'feni-chhagalnaiya', districtCode: 'feni', nameEn: 'Chhagalnaiya', nameBn: 'ছাগলনাইয়া' },
  { code: 'feni-daganbhuiyan', districtCode: 'feni', nameEn: 'Daganbhuiyan', nameBn: 'দাগনভূঞা' },
  { code: 'feni-feni-sadar', districtCode: 'feni', nameEn: 'Feni Sadar', nameBn: 'ফেনী সদর' },
  { code: 'feni-fulgazi', districtCode: 'feni', nameEn: 'Fulgazi', nameBn: 'ফুলগাজী' },
  { code: 'feni-parshuram', districtCode: 'feni', nameEn: 'Parshuram', nameBn: 'পরশুরাম' },
  { code: 'feni-sonagazi', districtCode: 'feni', nameEn: 'Sonagazi', nameBn: 'সোনাগাজী' },

  // lakshmipur (5)
  { code: 'lakshmipur-kamalnagar', districtCode: 'lakshmipur', nameEn: 'Kamalnagar', nameBn: 'কমলনগর' },
  { code: 'lakshmipur-lakshmipur-sadar', districtCode: 'lakshmipur', nameEn: 'Lakshmipur Sadar', nameBn: 'লক্ষ্মীপুর সদর' },
  { code: 'lakshmipur-raipur', districtCode: 'lakshmipur', nameEn: 'Raipur', nameBn: 'রায়পুর' },
  { code: 'lakshmipur-ramganj', districtCode: 'lakshmipur', nameEn: 'Ramganj', nameBn: 'রামগঞ্জ' },
  { code: 'lakshmipur-ramgati', districtCode: 'lakshmipur', nameEn: 'Ramgati', nameBn: 'রামগতি' },

  // noakhali (9)
  { code: 'noakhali-begumganj', districtCode: 'noakhali', nameEn: 'Begumganj', nameBn: 'বেগমগঞ্জ' },
  { code: 'noakhali-chatkhil', districtCode: 'noakhali', nameEn: 'Chatkhil', nameBn: 'চাটখিল' },
  { code: 'noakhali-companiganj', districtCode: 'noakhali', nameEn: 'Companiganj', nameBn: 'কোম্পানীগঞ্জ' },
  { code: 'noakhali-hatia', districtCode: 'noakhali', nameEn: 'Hatia', nameBn: 'হাতিয়া' },
  { code: 'noakhali-kabirhat', districtCode: 'noakhali', nameEn: 'Kabirhat', nameBn: 'কবিরহাট' },
  { code: 'noakhali-noakhali-sadar', districtCode: 'noakhali', nameEn: 'Noakhali Sadar', nameBn: 'নোয়াখালী সদর' },
  { code: 'noakhali-senbug', districtCode: 'noakhali', nameEn: 'Senbug', nameBn: 'সেনবাগ' },
  { code: 'noakhali-sonaimori', districtCode: 'noakhali', nameEn: 'Sonaimori', nameBn: 'সোনাইমুড়ী' },
  { code: 'noakhali-subarnachar', districtCode: 'noakhali', nameEn: 'Subarnachar', nameBn: 'সুবর্ণচর' },

  // khagrachhari (9)
  { code: 'khagrachhari-dighinala', districtCode: 'khagrachhari', nameEn: 'Dighinala', nameBn: 'দিঘীনালা' },
  { code: 'khagrachhari-guimara', districtCode: 'khagrachhari', nameEn: 'Guimara', nameBn: 'গুইমারা' },
  { code: 'khagrachhari-khagrachhari-sadar', districtCode: 'khagrachhari', nameEn: 'Khagrachhari Sadar', nameBn: 'খাগড়াছড়ি সদর' },
  { code: 'khagrachhari-laxmichhari', districtCode: 'khagrachhari', nameEn: 'Laxmichhari', nameBn: 'লক্ষীছড়ি' },
  { code: 'khagrachhari-manikchari', districtCode: 'khagrachhari', nameEn: 'Manikchari', nameBn: 'মানিকছড়ি' },
  { code: 'khagrachhari-matiranga', districtCode: 'khagrachhari', nameEn: 'Matiranga', nameBn: 'মাটিরাঙ্গা' },
  { code: 'khagrachhari-mohalchari', districtCode: 'khagrachhari', nameEn: 'Mohalchari', nameBn: 'মহালছড়ি' },
  { code: 'khagrachhari-panchari', districtCode: 'khagrachhari', nameEn: 'Panchari', nameBn: 'পানছড়ি' },
  { code: 'khagrachhari-ramgarh', districtCode: 'khagrachhari', nameEn: 'Ramgarh', nameBn: 'রামগড়' },

  // rangamati (10)
  { code: 'rangamati-baghaichari', districtCode: 'rangamati', nameEn: 'Baghaichari', nameBn: 'বাঘাইছড়ি' },
  { code: 'rangamati-barkal', districtCode: 'rangamati', nameEn: 'Barkal', nameBn: 'বরকল' },
  { code: 'rangamati-belaichari', districtCode: 'rangamati', nameEn: 'Belaichari', nameBn: 'বিলাইছড়ি' },
  { code: 'rangamati-juraichari', districtCode: 'rangamati', nameEn: 'Juraichari', nameBn: 'জুরাছড়ি' },
  { code: 'rangamati-kaptai', districtCode: 'rangamati', nameEn: 'Kaptai', nameBn: 'কাপ্তাই' },
  { code: 'rangamati-kawkhali', districtCode: 'rangamati', nameEn: 'Kawkhali', nameBn: 'কাউখালী' },
  { code: 'rangamati-langadu', districtCode: 'rangamati', nameEn: 'Langadu', nameBn: 'লংগদু' },
  { code: 'rangamati-naniarchar', districtCode: 'rangamati', nameEn: 'Naniarchar', nameBn: 'নানিয়ারচর' },
  { code: 'rangamati-rajasthali', districtCode: 'rangamati', nameEn: 'Rajasthali', nameBn: 'রাজস্থলী' },
  { code: 'rangamati-rangamati-sadar', districtCode: 'rangamati', nameEn: 'Rangamati Sadar', nameBn: 'রাঙ্গামাটি সদর' },

  // bandarban (7)
  { code: 'bandarban-alikadam', districtCode: 'bandarban', nameEn: 'Alikadam', nameBn: 'আলীকদম' },
  { code: 'bandarban-bandarban-sadar', districtCode: 'bandarban', nameEn: 'Bandarban Sadar', nameBn: 'বান্দরবান সদর' },
  { code: 'bandarban-lama', districtCode: 'bandarban', nameEn: 'Lama', nameBn: 'লামা' },
  { code: 'bandarban-naikhongchhari', districtCode: 'bandarban', nameEn: 'Naikhongchhari', nameBn: 'নাইক্ষ্যংছড়ি' },
  { code: 'bandarban-rowangchhari', districtCode: 'bandarban', nameEn: 'Rowangchhari', nameBn: 'রোয়াংছড়ি' },
  { code: 'bandarban-ruma', districtCode: 'bandarban', nameEn: 'Ruma', nameBn: 'রুমা' },
  { code: 'bandarban-thanchi', districtCode: 'bandarban', nameEn: 'Thanchi', nameBn: 'থানচি' },

  // rajshahi (9)
  { code: 'rajshahi-bagha', districtCode: 'rajshahi', nameEn: 'Bagha', nameBn: 'বাঘা' },
  { code: 'rajshahi-bagmara', districtCode: 'rajshahi', nameEn: 'Bagmara', nameBn: 'বাগমারা' },
  { code: 'rajshahi-charghat', districtCode: 'rajshahi', nameEn: 'Charghat', nameBn: 'চারঘাট' },
  { code: 'rajshahi-durgapur', districtCode: 'rajshahi', nameEn: 'Durgapur', nameBn: 'দুর্গাপুর' },
  { code: 'rajshahi-godagari', districtCode: 'rajshahi', nameEn: 'Godagari', nameBn: 'গোদাগাড়ী' },
  { code: 'rajshahi-mohonpur', districtCode: 'rajshahi', nameEn: 'Mohonpur', nameBn: 'মোহনপুর' },
  { code: 'rajshahi-paba', districtCode: 'rajshahi', nameEn: 'Paba', nameBn: 'পবা' },
  { code: 'rajshahi-puthia', districtCode: 'rajshahi', nameEn: 'Puthia', nameBn: 'পুঠিয়া' },
  { code: 'rajshahi-tanore', districtCode: 'rajshahi', nameEn: 'Tanore', nameBn: 'তানোর' },

  // natore (7)
  { code: 'natore-bagatipara', districtCode: 'natore', nameEn: 'Bagatipara', nameBn: 'বাগাতিপাড়া' },
  { code: 'natore-baraigram', districtCode: 'natore', nameEn: 'Baraigram', nameBn: 'বড়াইগ্রাম' },
  { code: 'natore-gurudaspur', districtCode: 'natore', nameEn: 'Gurudaspur', nameBn: 'গুরুদাসপুর' },
  { code: 'natore-lalpur', districtCode: 'natore', nameEn: 'Lalpur', nameBn: 'লালপুর' },
  { code: 'natore-naldanga', districtCode: 'natore', nameEn: 'Naldanga', nameBn: 'নলডাঙ্গা' },
  { code: 'natore-natore-sadar', districtCode: 'natore', nameEn: 'Natore Sadar', nameBn: 'নাটোর সদর' },
  { code: 'natore-singra', districtCode: 'natore', nameEn: 'Singra', nameBn: 'সিংড়া' },

  // naogaon (11)
  { code: 'naogaon-atrai', districtCode: 'naogaon', nameEn: 'Atrai', nameBn: 'আত্রাই' },
  { code: 'naogaon-badalgachi', districtCode: 'naogaon', nameEn: 'Badalgachi', nameBn: 'বদলগাছী' },
  { code: 'naogaon-dhamoirhat', districtCode: 'naogaon', nameEn: 'Dhamoirhat', nameBn: 'ধামইরহাট' },
  { code: 'naogaon-manda', districtCode: 'naogaon', nameEn: 'Manda', nameBn: 'মান্দা' },
  { code: 'naogaon-mohadevpur', districtCode: 'naogaon', nameEn: 'Mohadevpur', nameBn: 'মহাদেবপুর' },
  { code: 'naogaon-naogaon-sadar', districtCode: 'naogaon', nameEn: 'Naogaon Sadar', nameBn: 'নওগাঁ সদর' },
  { code: 'naogaon-niamatpur', districtCode: 'naogaon', nameEn: 'Niamatpur', nameBn: 'নিয়ামতপুর' },
  { code: 'naogaon-patnitala', districtCode: 'naogaon', nameEn: 'Patnitala', nameBn: 'পত্নিতলা' },
  { code: 'naogaon-porsha', districtCode: 'naogaon', nameEn: 'Porsha', nameBn: 'পোরশা' },
  { code: 'naogaon-raninagar', districtCode: 'naogaon', nameEn: 'Raninagar', nameBn: 'রাণীনগর' },
  { code: 'naogaon-sapahar', districtCode: 'naogaon', nameEn: 'Sapahar', nameBn: 'সাপাহার' },

  // chapainawabganj (5)
  { code: 'chapainawabganj-bholahat', districtCode: 'chapainawabganj', nameEn: 'Bholahat', nameBn: 'ভোলাহাট' },
  { code: 'chapainawabganj-chapainawabganj-sadar', districtCode: 'chapainawabganj', nameEn: 'Chapainawabganj Sadar', nameBn: 'চাঁপাইনবাবগঞ্জ সদর' },
  { code: 'chapainawabganj-gomostapur', districtCode: 'chapainawabganj', nameEn: 'Gomostapur', nameBn: 'গোমস্তাপুর' },
  { code: 'chapainawabganj-nachol', districtCode: 'chapainawabganj', nameEn: 'Nachol', nameBn: 'নাচোল' },
  { code: 'chapainawabganj-shibganj', districtCode: 'chapainawabganj', nameEn: 'Shibganj', nameBn: 'শিবগঞ্জ' },

  // pabna (9)
  { code: 'pabna-atghoria', districtCode: 'pabna', nameEn: 'Atghoria', nameBn: 'আটঘরিয়া' },
  { code: 'pabna-bera', districtCode: 'pabna', nameEn: 'Bera', nameBn: 'বেড়া' },
  { code: 'pabna-bhangura', districtCode: 'pabna', nameEn: 'Bhangura', nameBn: 'ভাঙ্গুড়া' },
  { code: 'pabna-chatmohar', districtCode: 'pabna', nameEn: 'Chatmohar', nameBn: 'চাটমোহর' },
  { code: 'pabna-faridpur', districtCode: 'pabna', nameEn: 'Faridpur', nameBn: 'ফরিদপুর' },
  { code: 'pabna-ishurdi', districtCode: 'pabna', nameEn: 'Ishurdi', nameBn: 'ঈশ্বরদী' },
  { code: 'pabna-pabna-sadar', districtCode: 'pabna', nameEn: 'Pabna Sadar', nameBn: 'পাবনা সদর' },
  { code: 'pabna-santhia', districtCode: 'pabna', nameEn: 'Santhia', nameBn: 'সাঁথিয়া' },
  { code: 'pabna-sujanagar', districtCode: 'pabna', nameEn: 'Sujanagar', nameBn: 'সুজানগর' },

  // bogura (12)
  { code: 'bogura-adamdighi', districtCode: 'bogura', nameEn: 'Adamdighi', nameBn: 'আদমদিঘি' },
  { code: 'bogura-bogra-sadar', districtCode: 'bogura', nameEn: 'Bogra Sadar', nameBn: 'বগুড়া সদর' },
  { code: 'bogura-dhunot', districtCode: 'bogura', nameEn: 'Dhunot', nameBn: 'ধুনট' },
  { code: 'bogura-dupchanchia', districtCode: 'bogura', nameEn: 'Dupchanchia', nameBn: 'দুপচাচিঁয়া' },
  { code: 'bogura-gabtali', districtCode: 'bogura', nameEn: 'Gabtali', nameBn: 'গাবতলী' },
  { code: 'bogura-kahaloo', districtCode: 'bogura', nameEn: 'Kahaloo', nameBn: 'কাহালু' },
  { code: 'bogura-nondigram', districtCode: 'bogura', nameEn: 'Nondigram', nameBn: 'নন্দিগ্রাম' },
  { code: 'bogura-shajahanpur', districtCode: 'bogura', nameEn: 'Shajahanpur', nameBn: 'শাজাহানপুর' },
  { code: 'bogura-shariakandi', districtCode: 'bogura', nameEn: 'Shariakandi', nameBn: 'সারিয়াকান্দি' },
  { code: 'bogura-sherpur', districtCode: 'bogura', nameEn: 'Sherpur', nameBn: 'শেরপুর' },
  { code: 'bogura-shibganj', districtCode: 'bogura', nameEn: 'Shibganj', nameBn: 'শিবগঞ্জ' },
  { code: 'bogura-sonatala', districtCode: 'bogura', nameEn: 'Sonatala', nameBn: 'সোনাতলা' },

  // sirajganj (9)
  { code: 'sirajganj-belkuchi', districtCode: 'sirajganj', nameEn: 'Belkuchi', nameBn: 'বেলকুচি' },
  { code: 'sirajganj-chauhali', districtCode: 'sirajganj', nameEn: 'Chauhali', nameBn: 'চৌহালি' },
  { code: 'sirajganj-kamarkhand', districtCode: 'sirajganj', nameEn: 'Kamarkhand', nameBn: 'কামারখন্দ' },
  { code: 'sirajganj-kazipur', districtCode: 'sirajganj', nameEn: 'Kazipur', nameBn: 'কাজীপুর' },
  { code: 'sirajganj-raigonj', districtCode: 'sirajganj', nameEn: 'Raigonj', nameBn: 'রায়গঞ্জ' },
  { code: 'sirajganj-shahjadpur', districtCode: 'sirajganj', nameEn: 'Shahjadpur', nameBn: 'শাহজাদপুর' },
  { code: 'sirajganj-sirajganj-sadar', districtCode: 'sirajganj', nameEn: 'Sirajganj Sadar', nameBn: 'সিরাজগঞ্জ সদর' },
  { code: 'sirajganj-tarash', districtCode: 'sirajganj', nameEn: 'Tarash', nameBn: 'তাড়াশ' },
  { code: 'sirajganj-ullapara', districtCode: 'sirajganj', nameEn: 'Ullapara', nameBn: 'উল্লাপাড়া' },

  // joypurhat (5)
  { code: 'joypurhat-akkelpur', districtCode: 'joypurhat', nameEn: 'Akkelpur', nameBn: 'আক্কেলপুর' },
  { code: 'joypurhat-joypurhat-sadar', districtCode: 'joypurhat', nameEn: 'Joypurhat Sadar', nameBn: 'জয়পুরহাট সদর' },
  { code: 'joypurhat-kalai', districtCode: 'joypurhat', nameEn: 'Kalai', nameBn: 'কালাই' },
  { code: 'joypurhat-khetlal', districtCode: 'joypurhat', nameEn: 'Khetlal', nameBn: 'ক্ষেতলাল' },
  { code: 'joypurhat-panchbibi', districtCode: 'joypurhat', nameEn: 'Panchbibi', nameBn: 'পাঁচবিবি' },

  // khulna (9)
  { code: 'khulna-botiaghata', districtCode: 'khulna', nameEn: 'Botiaghata', nameBn: 'বটিয়াঘাটা' },
  { code: 'khulna-dakop', districtCode: 'khulna', nameEn: 'Dakop', nameBn: 'দাকোপ' },
  { code: 'khulna-digholia', districtCode: 'khulna', nameEn: 'Digholia', nameBn: 'দিঘলিয়া' },
  { code: 'khulna-dumuria', districtCode: 'khulna', nameEn: 'Dumuria', nameBn: 'ডুমুরিয়া' },
  { code: 'khulna-fultola', districtCode: 'khulna', nameEn: 'Fultola', nameBn: 'ফুলতলা' },
  { code: 'khulna-koyra', districtCode: 'khulna', nameEn: 'Koyra', nameBn: 'কয়রা' },
  { code: 'khulna-paikgasa', districtCode: 'khulna', nameEn: 'Paikgasa', nameBn: 'পাইকগাছা' },
  { code: 'khulna-rupsha', districtCode: 'khulna', nameEn: 'Rupsha', nameBn: 'রূপসা' },
  { code: 'khulna-terokhada', districtCode: 'khulna', nameEn: 'Terokhada', nameBn: 'তেরখাদা' },

  // bagerhat (9)
  { code: 'bagerhat-bagerhat-sadar', districtCode: 'bagerhat', nameEn: 'Bagerhat Sadar', nameBn: 'বাগেরহাট সদর' },
  { code: 'bagerhat-chitalmari', districtCode: 'bagerhat', nameEn: 'Chitalmari', nameBn: 'চিতলমারী' },
  { code: 'bagerhat-fakirhat', districtCode: 'bagerhat', nameEn: 'Fakirhat', nameBn: 'ফকিরহাট' },
  { code: 'bagerhat-kachua', districtCode: 'bagerhat', nameEn: 'Kachua', nameBn: 'কচুয়া' },
  { code: 'bagerhat-mollahat', districtCode: 'bagerhat', nameEn: 'Mollahat', nameBn: 'মোল্লাহাট' },
  { code: 'bagerhat-mongla', districtCode: 'bagerhat', nameEn: 'Mongla', nameBn: 'মোংলা' },
  { code: 'bagerhat-morrelganj', districtCode: 'bagerhat', nameEn: 'Morrelganj', nameBn: 'মোড়েলগঞ্জ' },
  { code: 'bagerhat-rampal', districtCode: 'bagerhat', nameEn: 'Rampal', nameBn: 'রামপাল' },
  { code: 'bagerhat-sarankhola', districtCode: 'bagerhat', nameEn: 'Sarankhola', nameBn: 'শরণখোলা' },

  // satkhira (7)
  { code: 'satkhira-assasuni', districtCode: 'satkhira', nameEn: 'Assasuni', nameBn: 'আশাশুনি' },
  { code: 'satkhira-debhata', districtCode: 'satkhira', nameEn: 'Debhata', nameBn: 'দেবহাটা' },
  { code: 'satkhira-kalaroa', districtCode: 'satkhira', nameEn: 'Kalaroa', nameBn: 'কলারোয়া' },
  { code: 'satkhira-kaliganj', districtCode: 'satkhira', nameEn: 'Kaliganj', nameBn: 'কালিগঞ্জ' },
  { code: 'satkhira-satkhira-sadar', districtCode: 'satkhira', nameEn: 'Satkhira Sadar', nameBn: 'সাতক্ষীরা সদর' },
  { code: 'satkhira-shyamnagar', districtCode: 'satkhira', nameEn: 'Shyamnagar', nameBn: 'শ্যামনগর' },
  { code: 'satkhira-tala', districtCode: 'satkhira', nameEn: 'Tala', nameBn: 'তালা' },

  // jashore (8)
  { code: 'jashore-abhaynagar', districtCode: 'jashore', nameEn: 'Abhaynagar', nameBn: 'অভয়নগর' },
  { code: 'jashore-bagherpara', districtCode: 'jashore', nameEn: 'Bagherpara', nameBn: 'বাঘারপাড়া' },
  { code: 'jashore-chougachha', districtCode: 'jashore', nameEn: 'Chougachha', nameBn: 'চৌগাছা' },
  { code: 'jashore-jessore-sadar', districtCode: 'jashore', nameEn: 'Jessore Sadar', nameBn: 'যশোর সদর' },
  { code: 'jashore-jhikargacha', districtCode: 'jashore', nameEn: 'Jhikargacha', nameBn: 'ঝিকরগাছা' },
  { code: 'jashore-keshabpur', districtCode: 'jashore', nameEn: 'Keshabpur', nameBn: 'কেশবপুর' },
  { code: 'jashore-manirampur', districtCode: 'jashore', nameEn: 'Manirampur', nameBn: 'মণিরামপুর' },
  { code: 'jashore-sharsha', districtCode: 'jashore', nameEn: 'Sharsha', nameBn: 'শার্শা' },

  // jhenaidah (6)
  { code: 'jhenaidah-harinakundu', districtCode: 'jhenaidah', nameEn: 'Harinakundu', nameBn: 'হরিণাকুন্ডু' },
  { code: 'jhenaidah-jhenaidah-sadar', districtCode: 'jhenaidah', nameEn: 'Jhenaidah Sadar', nameBn: 'ঝিনাইদহ সদর' },
  { code: 'jhenaidah-kaliganj', districtCode: 'jhenaidah', nameEn: 'Kaliganj', nameBn: 'কালীগঞ্জ' },
  { code: 'jhenaidah-kotchandpur', districtCode: 'jhenaidah', nameEn: 'Kotchandpur', nameBn: 'কোটচাঁদপুর' },
  { code: 'jhenaidah-moheshpur', districtCode: 'jhenaidah', nameEn: 'Moheshpur', nameBn: 'মহেশপুর' },
  { code: 'jhenaidah-shailkupa', districtCode: 'jhenaidah', nameEn: 'Shailkupa', nameBn: 'শৈলকুপা' },

  // magura (4)
  { code: 'magura-magura-sadar', districtCode: 'magura', nameEn: 'Magura Sadar', nameBn: 'মাগুরা সদর' },
  { code: 'magura-mohammadpur', districtCode: 'magura', nameEn: 'Mohammadpur', nameBn: 'মহম্মদপুর' },
  { code: 'magura-shalikha', districtCode: 'magura', nameEn: 'Shalikha', nameBn: 'শালিখা' },
  { code: 'magura-sreepur', districtCode: 'magura', nameEn: 'Sreepur', nameBn: 'শ্রীপুর' },

  // narail (3)
  { code: 'narail-kalia', districtCode: 'narail', nameEn: 'Kalia', nameBn: 'কালিয়া' },
  { code: 'narail-lohagara', districtCode: 'narail', nameEn: 'Lohagara', nameBn: 'লোহাগড়া' },
  { code: 'narail-narail-sadar', districtCode: 'narail', nameEn: 'Narail Sadar', nameBn: 'নড়াইল সদর' },

  // kushtia (6)
  { code: 'kushtia-bheramara', districtCode: 'kushtia', nameEn: 'Bheramara', nameBn: 'ভেড়ামারা' },
  { code: 'kushtia-daulatpur', districtCode: 'kushtia', nameEn: 'Daulatpur', nameBn: 'দৌলতপুর' },
  { code: 'kushtia-khoksa', districtCode: 'kushtia', nameEn: 'Khoksa', nameBn: 'খোকসা' },
  { code: 'kushtia-kumarkhali', districtCode: 'kushtia', nameEn: 'Kumarkhali', nameBn: 'কুমারখালী' },
  { code: 'kushtia-kushtia-sadar', districtCode: 'kushtia', nameEn: 'Kushtia Sadar', nameBn: 'কুষ্টিয়া সদর' },
  { code: 'kushtia-mirpur', districtCode: 'kushtia', nameEn: 'Mirpur', nameBn: 'মিরপুর' },

  // chuadanga (4)
  { code: 'chuadanga-alamdanga', districtCode: 'chuadanga', nameEn: 'Alamdanga', nameBn: 'আলমডাঙ্গা' },
  { code: 'chuadanga-chuadanga-sadar', districtCode: 'chuadanga', nameEn: 'Chuadanga Sadar', nameBn: 'চুয়াডাঙ্গা সদর' },
  { code: 'chuadanga-damurhuda', districtCode: 'chuadanga', nameEn: 'Damurhuda', nameBn: 'দামুড়হুদা' },
  { code: 'chuadanga-jibannagar', districtCode: 'chuadanga', nameEn: 'Jibannagar', nameBn: 'জীবননগর' },

  // meherpur (3)
  { code: 'meherpur-gangni', districtCode: 'meherpur', nameEn: 'Gangni', nameBn: 'গাংনী' },
  { code: 'meherpur-meherpur-sadar', districtCode: 'meherpur', nameEn: 'Meherpur Sadar', nameBn: 'মেহেরপুর সদর' },
  { code: 'meherpur-mujibnagar', districtCode: 'meherpur', nameEn: 'Mujibnagar', nameBn: 'মুজিবনগর' },

  // barishal (10)
  { code: 'barishal-agailjhara', districtCode: 'barishal', nameEn: 'Agailjhara', nameBn: 'আগৈলঝাড়া' },
  { code: 'barishal-babuganj', districtCode: 'barishal', nameEn: 'Babuganj', nameBn: 'বাবুগঞ্জ' },
  { code: 'barishal-bakerganj', districtCode: 'barishal', nameEn: 'Bakerganj', nameBn: 'বাকেরগঞ্জ' },
  { code: 'barishal-banaripara', districtCode: 'barishal', nameEn: 'Banaripara', nameBn: 'বানারীপাড়া' },
  { code: 'barishal-barisal-sadar', districtCode: 'barishal', nameEn: 'Barisal Sadar', nameBn: 'বরিশাল সদর' },
  { code: 'barishal-gournadi', districtCode: 'barishal', nameEn: 'Gournadi', nameBn: 'গৌরনদী' },
  { code: 'barishal-hizla', districtCode: 'barishal', nameEn: 'Hizla', nameBn: 'হিজলা' },
  { code: 'barishal-mehendiganj', districtCode: 'barishal', nameEn: 'Mehendiganj', nameBn: 'মেহেন্দিগঞ্জ' },
  { code: 'barishal-muladi', districtCode: 'barishal', nameEn: 'Muladi', nameBn: 'মুলাদী' },
  { code: 'barishal-wazirpur', districtCode: 'barishal', nameEn: 'Wazirpur', nameBn: 'উজিরপুর' },

  // bhola (7)
  { code: 'bhola-bhola-sadar', districtCode: 'bhola', nameEn: 'Bhola Sadar', nameBn: 'ভোলা সদর' },
  { code: 'bhola-borhan-sddin', districtCode: 'bhola', nameEn: 'Borhan Sddin', nameBn: 'বোরহান উদ্দিন' },
  { code: 'bhola-charfesson', districtCode: 'bhola', nameEn: 'Charfesson', nameBn: 'চরফ্যাশন' },
  { code: 'bhola-doulatkhan', districtCode: 'bhola', nameEn: 'Doulatkhan', nameBn: 'দৌলতখান' },
  { code: 'bhola-lalmohan', districtCode: 'bhola', nameEn: 'Lalmohan', nameBn: 'লালমোহন' },
  { code: 'bhola-monpura', districtCode: 'bhola', nameEn: 'Monpura', nameBn: 'মনপুরা' },
  { code: 'bhola-tazumuddin', districtCode: 'bhola', nameEn: 'Tazumuddin', nameBn: 'তজুমদ্দিন' },

  // patuakhali (8)
  { code: 'patuakhali-bauphal', districtCode: 'patuakhali', nameEn: 'Bauphal', nameBn: 'বাউফল' },
  { code: 'patuakhali-dashmina', districtCode: 'patuakhali', nameEn: 'Dashmina', nameBn: 'দশমিনা' },
  { code: 'patuakhali-dumki', districtCode: 'patuakhali', nameEn: 'Dumki', nameBn: 'দুমকি' },
  { code: 'patuakhali-galachipa', districtCode: 'patuakhali', nameEn: 'Galachipa', nameBn: 'গলাচিপা' },
  { code: 'patuakhali-kalapara', districtCode: 'patuakhali', nameEn: 'Kalapara', nameBn: 'কলাপাড়া' },
  { code: 'patuakhali-mirzaganj', districtCode: 'patuakhali', nameEn: 'Mirzaganj', nameBn: 'মির্জাগঞ্জ' },
  { code: 'patuakhali-patuakhali-sadar', districtCode: 'patuakhali', nameEn: 'Patuakhali Sadar', nameBn: 'পটুয়াখালী সদর' },
  { code: 'patuakhali-rangabali', districtCode: 'patuakhali', nameEn: 'Rangabali', nameBn: 'রাঙ্গাবালী' },

  // pirojpur (7)
  { code: 'pirojpur-bhandaria', districtCode: 'pirojpur', nameEn: 'Bhandaria', nameBn: 'ভান্ডারিয়া' },
  { code: 'pirojpur-kawkhali', districtCode: 'pirojpur', nameEn: 'Kawkhali', nameBn: 'কাউখালী' },
  { code: 'pirojpur-mathbaria', districtCode: 'pirojpur', nameEn: 'Mathbaria', nameBn: 'মঠবাড়ীয়া' },
  { code: 'pirojpur-nazirpur', districtCode: 'pirojpur', nameEn: 'Nazirpur', nameBn: 'নাজিরপুর' },
  { code: 'pirojpur-nesarabad', districtCode: 'pirojpur', nameEn: 'Nesarabad', nameBn: 'নেছারাবাদ' },
  { code: 'pirojpur-pirojpur-sadar', districtCode: 'pirojpur', nameEn: 'Pirojpur Sadar', nameBn: 'পিরোজপুর সদর' },
  { code: 'pirojpur-zianagar', districtCode: 'pirojpur', nameEn: 'Zianagar', nameBn: 'জিয়ানগর' },

  // barguna (6)
  { code: 'barguna-amtali', districtCode: 'barguna', nameEn: 'Amtali', nameBn: 'আমতলী' },
  { code: 'barguna-bamna', districtCode: 'barguna', nameEn: 'Bamna', nameBn: 'বামনা' },
  { code: 'barguna-barguna-sadar', districtCode: 'barguna', nameEn: 'Barguna Sadar', nameBn: 'বরগুনা সদর' },
  { code: 'barguna-betagi', districtCode: 'barguna', nameEn: 'Betagi', nameBn: 'বেতাগী' },
  { code: 'barguna-pathorghata', districtCode: 'barguna', nameEn: 'Pathorghata', nameBn: 'পাথরঘাটা' },
  { code: 'barguna-taltali', districtCode: 'barguna', nameEn: 'Taltali', nameBn: 'তালতলি' },

  // jhalokati (4)
  { code: 'jhalokati-jhalakathi-sadar', districtCode: 'jhalokati', nameEn: 'Jhalakathi Sadar', nameBn: 'ঝালকাঠি সদর' },
  { code: 'jhalokati-kathalia', districtCode: 'jhalokati', nameEn: 'Kathalia', nameBn: 'কাঠালিয়া' },
  { code: 'jhalokati-nalchity', districtCode: 'jhalokati', nameEn: 'Nalchity', nameBn: 'নলছিটি' },
  { code: 'jhalokati-rajapur', districtCode: 'jhalokati', nameEn: 'Rajapur', nameBn: 'রাজাপুর' },

  // sylhet (13)
  { code: 'sylhet-balaganj', districtCode: 'sylhet', nameEn: 'Balaganj', nameBn: 'বালাগঞ্জ' },
  { code: 'sylhet-beanibazar', districtCode: 'sylhet', nameEn: 'Beanibazar', nameBn: 'বিয়ানীবাজার' },
  { code: 'sylhet-bishwanath', districtCode: 'sylhet', nameEn: 'Bishwanath', nameBn: 'বিশ্বনাথ' },
  { code: 'sylhet-companiganj', districtCode: 'sylhet', nameEn: 'Companiganj', nameBn: 'কোম্পানীগঞ্জ' },
  { code: 'sylhet-dakshinsurma', districtCode: 'sylhet', nameEn: 'Dakshinsurma', nameBn: 'দক্ষিণ সুরমা' },
  { code: 'sylhet-fenchuganj', districtCode: 'sylhet', nameEn: 'Fenchuganj', nameBn: 'ফেঞ্চুগঞ্জ' },
  { code: 'sylhet-golapganj', districtCode: 'sylhet', nameEn: 'Golapganj', nameBn: 'গোলাপগঞ্জ' },
  { code: 'sylhet-gowainghat', districtCode: 'sylhet', nameEn: 'Gowainghat', nameBn: 'গোয়াইনঘাট' },
  { code: 'sylhet-jaintiapur', districtCode: 'sylhet', nameEn: 'Jaintiapur', nameBn: 'জৈন্তাপুর' },
  { code: 'sylhet-kanaighat', districtCode: 'sylhet', nameEn: 'Kanaighat', nameBn: 'কানাইঘাট' },
  { code: 'sylhet-osmaninagar', districtCode: 'sylhet', nameEn: 'Osmaninagar', nameBn: 'ওসমানী নগর' },
  { code: 'sylhet-sylhet-sadar', districtCode: 'sylhet', nameEn: 'Sylhet Sadar', nameBn: 'সিলেট সদর' },
  { code: 'sylhet-zakiganj', districtCode: 'sylhet', nameEn: 'Zakiganj', nameBn: 'জকিগঞ্জ' },

  // moulvibazar (7)
  { code: 'moulvibazar-barlekha', districtCode: 'moulvibazar', nameEn: 'Barlekha', nameBn: 'বড়লেখা' },
  { code: 'moulvibazar-juri', districtCode: 'moulvibazar', nameEn: 'Juri', nameBn: 'জুড়ী' },
  { code: 'moulvibazar-kamolganj', districtCode: 'moulvibazar', nameEn: 'Kamolganj', nameBn: 'কমলগঞ্জ' },
  { code: 'moulvibazar-kulaura', districtCode: 'moulvibazar', nameEn: 'Kulaura', nameBn: 'কুলাউড়া' },
  { code: 'moulvibazar-moulvibazar-sadar', districtCode: 'moulvibazar', nameEn: 'Moulvibazar Sadar', nameBn: 'মৌলভীবাজার সদর' },
  { code: 'moulvibazar-rajnagar', districtCode: 'moulvibazar', nameEn: 'Rajnagar', nameBn: 'রাজনগর' },
  { code: 'moulvibazar-sreemangal', districtCode: 'moulvibazar', nameEn: 'Sreemangal', nameBn: 'শ্রীমঙ্গল' },

  // habiganj (8)
  { code: 'habiganj-ajmiriganj', districtCode: 'habiganj', nameEn: 'Ajmiriganj', nameBn: 'আজমিরীগঞ্জ' },
  { code: 'habiganj-bahubal', districtCode: 'habiganj', nameEn: 'Bahubal', nameBn: 'বাহুবল' },
  { code: 'habiganj-baniachong', districtCode: 'habiganj', nameEn: 'Baniachong', nameBn: 'বানিয়াচং' },
  { code: 'habiganj-chunarughat', districtCode: 'habiganj', nameEn: 'Chunarughat', nameBn: 'চুনারুঘাট' },
  { code: 'habiganj-habiganj-sadar', districtCode: 'habiganj', nameEn: 'Habiganj Sadar', nameBn: 'হবিগঞ্জ সদর' },
  { code: 'habiganj-lakhai', districtCode: 'habiganj', nameEn: 'Lakhai', nameBn: 'লাখাই' },
  { code: 'habiganj-madhabpur', districtCode: 'habiganj', nameEn: 'Madhabpur', nameBn: 'মাধবপুর' },
  { code: 'habiganj-nabiganj', districtCode: 'habiganj', nameEn: 'Nabiganj', nameBn: 'নবীগঞ্জ' },

  // sunamganj (12)
  { code: 'sunamganj-bishwambarpur', districtCode: 'sunamganj', nameEn: 'Bishwambarpur', nameBn: 'বিশ্বম্ভরপুর' },
  { code: 'sunamganj-chhatak', districtCode: 'sunamganj', nameEn: 'Chhatak', nameBn: 'ছাতক' },
  { code: 'sunamganj-derai', districtCode: 'sunamganj', nameEn: 'Derai', nameBn: 'দিরাই' },
  { code: 'sunamganj-dharmapasha', districtCode: 'sunamganj', nameEn: 'Dharmapasha', nameBn: 'ধর্মপাশা' },
  { code: 'sunamganj-dowarabazar', districtCode: 'sunamganj', nameEn: 'Dowarabazar', nameBn: 'দোয়ারাবাজার' },
  { code: 'sunamganj-jagannathpur', districtCode: 'sunamganj', nameEn: 'Jagannathpur', nameBn: 'জগন্নাথপুর' },
  { code: 'sunamganj-jamalganj', districtCode: 'sunamganj', nameEn: 'Jamalganj', nameBn: 'জামালগঞ্জ' },
  { code: 'sunamganj-madhyanagar', districtCode: 'sunamganj', nameEn: 'Madhyanagar', nameBn: 'মধ্যনগর' },
  { code: 'sunamganj-shalla', districtCode: 'sunamganj', nameEn: 'Shalla', nameBn: 'শাল্লা' },
  { code: 'sunamganj-south-sunamganj', districtCode: 'sunamganj', nameEn: 'South Sunamganj', nameBn: 'দক্ষিণ সুনামগঞ্জ' },
  { code: 'sunamganj-sunamganj-sadar', districtCode: 'sunamganj', nameEn: 'Sunamganj Sadar', nameBn: 'সুনামগঞ্জ সদর' },
  { code: 'sunamganj-tahirpur', districtCode: 'sunamganj', nameEn: 'Tahirpur', nameBn: 'তাহিরপুর' },

  // rangpur (8)
  { code: 'rangpur-badargonj', districtCode: 'rangpur', nameEn: 'Badargonj', nameBn: 'বদরগঞ্জ' },
  { code: 'rangpur-gangachara', districtCode: 'rangpur', nameEn: 'Gangachara', nameBn: 'গংগাচড়া' },
  { code: 'rangpur-kaunia', districtCode: 'rangpur', nameEn: 'Kaunia', nameBn: 'কাউনিয়া' },
  { code: 'rangpur-mithapukur', districtCode: 'rangpur', nameEn: 'Mithapukur', nameBn: 'মিঠাপুকুর' },
  { code: 'rangpur-pirgacha', districtCode: 'rangpur', nameEn: 'Pirgacha', nameBn: 'পীরগাছা' },
  { code: 'rangpur-pirgonj', districtCode: 'rangpur', nameEn: 'Pirgonj', nameBn: 'পীরগঞ্জ' },
  { code: 'rangpur-rangpur-sadar', districtCode: 'rangpur', nameEn: 'Rangpur Sadar', nameBn: 'রংপুর সদর' },
  { code: 'rangpur-taragonj', districtCode: 'rangpur', nameEn: 'Taragonj', nameBn: 'তারাগঞ্জ' },

  // dinajpur (13)
  { code: 'dinajpur-birampur', districtCode: 'dinajpur', nameEn: 'Birampur', nameBn: 'বিরামপুর' },
  { code: 'dinajpur-birganj', districtCode: 'dinajpur', nameEn: 'Birganj', nameBn: 'বীরগঞ্জ' },
  { code: 'dinajpur-birol', districtCode: 'dinajpur', nameEn: 'Birol', nameBn: 'বিরল' },
  { code: 'dinajpur-bochaganj', districtCode: 'dinajpur', nameEn: 'Bochaganj', nameBn: 'বোচাগঞ্জ' },
  { code: 'dinajpur-chirirbandar', districtCode: 'dinajpur', nameEn: 'Chirirbandar', nameBn: 'চিরিরবন্দর' },
  { code: 'dinajpur-dinajpur-sadar', districtCode: 'dinajpur', nameEn: 'Dinajpur Sadar', nameBn: 'দিনাজপুর সদর' },
  { code: 'dinajpur-fulbari', districtCode: 'dinajpur', nameEn: 'Fulbari', nameBn: 'ফুলবাড়ী' },
  { code: 'dinajpur-ghoraghat', districtCode: 'dinajpur', nameEn: 'Ghoraghat', nameBn: 'ঘোড়াঘাট' },
  { code: 'dinajpur-hakimpur', districtCode: 'dinajpur', nameEn: 'Hakimpur', nameBn: 'হাকিমপুর' },
  { code: 'dinajpur-kaharol', districtCode: 'dinajpur', nameEn: 'Kaharol', nameBn: 'কাহারোল' },
  { code: 'dinajpur-khansama', districtCode: 'dinajpur', nameEn: 'Khansama', nameBn: 'খানসামা' },
  { code: 'dinajpur-nawabganj', districtCode: 'dinajpur', nameEn: 'Nawabganj', nameBn: 'নবাবগঞ্জ' },
  { code: 'dinajpur-parbatipur', districtCode: 'dinajpur', nameEn: 'Parbatipur', nameBn: 'পার্বতীপুর' },

  // kurigram (9)
  { code: 'kurigram-bhurungamari', districtCode: 'kurigram', nameEn: 'Bhurungamari', nameBn: 'ভুরুঙ্গামারী' },
  { code: 'kurigram-charrajibpur', districtCode: 'kurigram', nameEn: 'Charrajibpur', nameBn: 'চর রাজিবপুর' },
  { code: 'kurigram-chilmari', districtCode: 'kurigram', nameEn: 'Chilmari', nameBn: 'চিলমারী' },
  { code: 'kurigram-kurigram-sadar', districtCode: 'kurigram', nameEn: 'Kurigram Sadar', nameBn: 'কুড়িগ্রাম সদর' },
  { code: 'kurigram-nageshwari', districtCode: 'kurigram', nameEn: 'Nageshwari', nameBn: 'নাগেশ্বরী' },
  { code: 'kurigram-phulbari', districtCode: 'kurigram', nameEn: 'Phulbari', nameBn: 'ফুলবাড়ী' },
  { code: 'kurigram-rajarhat', districtCode: 'kurigram', nameEn: 'Rajarhat', nameBn: 'রাজারহাট' },
  { code: 'kurigram-rowmari', districtCode: 'kurigram', nameEn: 'Rowmari', nameBn: 'রৌমারী' },
  { code: 'kurigram-ulipur', districtCode: 'kurigram', nameEn: 'Ulipur', nameBn: 'উলিপুর' },

  // gaibandha (7)
  { code: 'gaibandha-gaibandha-sadar', districtCode: 'gaibandha', nameEn: 'Gaibandha Sadar', nameBn: 'গাইবান্ধা সদর' },
  { code: 'gaibandha-gobindaganj', districtCode: 'gaibandha', nameEn: 'Gobindaganj', nameBn: 'গোবিন্দগঞ্জ' },
  { code: 'gaibandha-palashbari', districtCode: 'gaibandha', nameEn: 'Palashbari', nameBn: 'পলাশবাড়ী' },
  { code: 'gaibandha-phulchari', districtCode: 'gaibandha', nameEn: 'Phulchari', nameBn: 'ফুলছড়ি' },
  { code: 'gaibandha-sadullapur', districtCode: 'gaibandha', nameEn: 'Sadullapur', nameBn: 'সাদুল্লাপুর' },
  { code: 'gaibandha-saghata', districtCode: 'gaibandha', nameEn: 'Saghata', nameBn: 'সাঘাটা' },
  { code: 'gaibandha-sundarganj', districtCode: 'gaibandha', nameEn: 'Sundarganj', nameBn: 'সুন্দরগঞ্জ' },

  // nilphamari (6)
  { code: 'nilphamari-dimla', districtCode: 'nilphamari', nameEn: 'Dimla', nameBn: 'ডিমলা' },
  { code: 'nilphamari-domar', districtCode: 'nilphamari', nameEn: 'Domar', nameBn: 'ডোমার' },
  { code: 'nilphamari-jaldhaka', districtCode: 'nilphamari', nameEn: 'Jaldhaka', nameBn: 'জলঢাকা' },
  { code: 'nilphamari-kishorganj', districtCode: 'nilphamari', nameEn: 'Kishorganj', nameBn: 'কিশোরগঞ্জ' },
  { code: 'nilphamari-nilphamari-sadar', districtCode: 'nilphamari', nameEn: 'Nilphamari Sadar', nameBn: 'নীলফামারী সদর' },
  { code: 'nilphamari-syedpur', districtCode: 'nilphamari', nameEn: 'Syedpur', nameBn: 'সৈয়দপুর' },

  // panchagarh (5)
  { code: 'panchagarh-atwari', districtCode: 'panchagarh', nameEn: 'Atwari', nameBn: 'আটোয়ারী' },
  { code: 'panchagarh-boda', districtCode: 'panchagarh', nameEn: 'Boda', nameBn: 'বোদা' },
  { code: 'panchagarh-debiganj', districtCode: 'panchagarh', nameEn: 'Debiganj', nameBn: 'দেবীগঞ্জ' },
  { code: 'panchagarh-panchagarh-sadar', districtCode: 'panchagarh', nameEn: 'Panchagarh Sadar', nameBn: 'পঞ্চগড় সদর' },
  { code: 'panchagarh-tetulia', districtCode: 'panchagarh', nameEn: 'Tetulia', nameBn: 'তেতুলিয়া' },

  // thakurgaon (5)
  { code: 'thakurgaon-baliadangi', districtCode: 'thakurgaon', nameEn: 'Baliadangi', nameBn: 'বালিয়াডাঙ্গী' },
  { code: 'thakurgaon-haripur', districtCode: 'thakurgaon', nameEn: 'Haripur', nameBn: 'হরিপুর' },
  { code: 'thakurgaon-pirganj', districtCode: 'thakurgaon', nameEn: 'Pirganj', nameBn: 'পীরগঞ্জ' },
  { code: 'thakurgaon-ranisankail', districtCode: 'thakurgaon', nameEn: 'Ranisankail', nameBn: 'রাণীশংকৈল' },
  { code: 'thakurgaon-thakurgaon-sadar', districtCode: 'thakurgaon', nameEn: 'Thakurgaon Sadar', nameBn: 'ঠাকুরগাঁও সদর' },

  // lalmonirhat (5)
  { code: 'lalmonirhat-aditmari', districtCode: 'lalmonirhat', nameEn: 'Aditmari', nameBn: 'আদিতমারী' },
  { code: 'lalmonirhat-hatibandha', districtCode: 'lalmonirhat', nameEn: 'Hatibandha', nameBn: 'হাতীবান্ধা' },
  { code: 'lalmonirhat-kaliganj', districtCode: 'lalmonirhat', nameEn: 'Kaliganj', nameBn: 'কালীগঞ্জ' },
  { code: 'lalmonirhat-lalmonirhat-sadar', districtCode: 'lalmonirhat', nameEn: 'Lalmonirhat Sadar', nameBn: 'লালমনিরহাট সদর' },
  { code: 'lalmonirhat-patgram', districtCode: 'lalmonirhat', nameEn: 'Patgram', nameBn: 'পাটগ্রাম' },

  // mymensingh (13)
  { code: 'mymensingh-bhaluka', districtCode: 'mymensingh', nameEn: 'Bhaluka', nameBn: 'ভালুকা' },
  { code: 'mymensingh-dhobaura', districtCode: 'mymensingh', nameEn: 'Dhobaura', nameBn: 'ধোবাউড়া' },
  { code: 'mymensingh-fulbaria', districtCode: 'mymensingh', nameEn: 'Fulbaria', nameBn: 'ফুলবাড়ীয়া' },
  { code: 'mymensingh-gafargaon', districtCode: 'mymensingh', nameEn: 'Gafargaon', nameBn: 'গফরগাঁও' },
  { code: 'mymensingh-gouripur', districtCode: 'mymensingh', nameEn: 'Gouripur', nameBn: 'গৌরীপুর' },
  { code: 'mymensingh-haluaghat', districtCode: 'mymensingh', nameEn: 'Haluaghat', nameBn: 'হালুয়াঘাট' },
  { code: 'mymensingh-iswarganj', districtCode: 'mymensingh', nameEn: 'Iswarganj', nameBn: 'ঈশ্বরগঞ্জ' },
  { code: 'mymensingh-muktagacha', districtCode: 'mymensingh', nameEn: 'Muktagacha', nameBn: 'মুক্তাগাছা' },
  { code: 'mymensingh-mymensingh-sadar', districtCode: 'mymensingh', nameEn: 'Mymensingh Sadar', nameBn: 'ময়মনসিংহ সদর' },
  { code: 'mymensingh-nandail', districtCode: 'mymensingh', nameEn: 'Nandail', nameBn: 'নান্দাইল' },
  { code: 'mymensingh-phulpur', districtCode: 'mymensingh', nameEn: 'Phulpur', nameBn: 'ফুলপুর' },
  { code: 'mymensingh-tarakanda', districtCode: 'mymensingh', nameEn: 'Tarakanda', nameBn: 'তারাকান্দা' },
  { code: 'mymensingh-trishal', districtCode: 'mymensingh', nameEn: 'Trishal', nameBn: 'ত্রিশাল' },

  // jamalpur (7)
  { code: 'jamalpur-bokshiganj', districtCode: 'jamalpur', nameEn: 'Bokshiganj', nameBn: 'বকশীগঞ্জ' },
  { code: 'jamalpur-dewangonj', districtCode: 'jamalpur', nameEn: 'Dewangonj', nameBn: 'দেওয়ানগঞ্জ' },
  { code: 'jamalpur-islampur', districtCode: 'jamalpur', nameEn: 'Islampur', nameBn: 'ইসলামপুর' },
  { code: 'jamalpur-jamalpur-sadar', districtCode: 'jamalpur', nameEn: 'Jamalpur Sadar', nameBn: 'জামালপুর সদর' },
  { code: 'jamalpur-madarganj', districtCode: 'jamalpur', nameEn: 'Madarganj', nameBn: 'মাদারগঞ্জ' },
  { code: 'jamalpur-melandah', districtCode: 'jamalpur', nameEn: 'Melandah', nameBn: 'মেলান্দহ' },
  { code: 'jamalpur-sarishabari', districtCode: 'jamalpur', nameEn: 'Sarishabari', nameBn: 'সরিষাবাড়ী' },

  // netrokona (10)
  { code: 'netrokona-atpara', districtCode: 'netrokona', nameEn: 'Atpara', nameBn: 'আটপাড়া' },
  { code: 'netrokona-barhatta', districtCode: 'netrokona', nameEn: 'Barhatta', nameBn: 'বারহাট্টা' },
  { code: 'netrokona-durgapur', districtCode: 'netrokona', nameEn: 'Durgapur', nameBn: 'দুর্গাপুর' },
  { code: 'netrokona-kalmakanda', districtCode: 'netrokona', nameEn: 'Kalmakanda', nameBn: 'কলমাকান্দা' },
  { code: 'netrokona-kendua', districtCode: 'netrokona', nameEn: 'Kendua', nameBn: 'কেন্দুয়া' },
  { code: 'netrokona-khaliajuri', districtCode: 'netrokona', nameEn: 'Khaliajuri', nameBn: 'খালিয়াজুরী' },
  { code: 'netrokona-madan', districtCode: 'netrokona', nameEn: 'Madan', nameBn: 'মদন' },
  { code: 'netrokona-mohongonj', districtCode: 'netrokona', nameEn: 'Mohongonj', nameBn: 'মোহনগঞ্জ' },
  { code: 'netrokona-netrokona-sadar', districtCode: 'netrokona', nameEn: 'Netrokona Sadar', nameBn: 'নেত্রকোণা সদর' },
  { code: 'netrokona-purbadhala', districtCode: 'netrokona', nameEn: 'Purbadhala', nameBn: 'পূর্বধলা' },

  // sherpur (5)
  { code: 'sherpur-jhenaigati', districtCode: 'sherpur', nameEn: 'Jhenaigati', nameBn: 'ঝিনাইগাতী' },
  { code: 'sherpur-nalitabari', districtCode: 'sherpur', nameEn: 'Nalitabari', nameBn: 'নালিতাবাড়ী' },
  { code: 'sherpur-nokla', districtCode: 'sherpur', nameEn: 'Nokla', nameBn: 'নকলা' },
  { code: 'sherpur-sherpur-sadar', districtCode: 'sherpur', nameEn: 'Sherpur Sadar', nameBn: 'শেরপুর সদর' },
  { code: 'sherpur-sreebordi', districtCode: 'sherpur', nameEn: 'Sreebordi', nameBn: 'শ্রীবরদী' },
];
