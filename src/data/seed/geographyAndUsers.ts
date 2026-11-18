import type {
  BusinessProfile,
  CropOrCargo,
  FarmerProfile,
  FpoProfile,
  GeoNode,
  KioskOperator,
  RoadEdge,
  SyntheticPersona,
  TransporterProfile,
  UserAccount,
  Vehicle,
  VehicleType,
  VoicePhraseSeed,
} from '@/types/domain';
import { roadDistanceKm } from '@/engine/geo';
import { createSeededRng, rngFloat, rngInt, rngPick } from '@/engine/prng';

export const KOLAR_NODES: GeoNode[] = [
  // 24 Villages & Towns
  { id: 'v_kolar', name: 'Kolar Town', nameHi: 'कोलार नगर', nameKn: 'ಕೋಲಾರ ಪಟ್ಟಣ', kind: 'village', lat: 13.1362, lng: 78.1291, taluka: 'Kolar', baseDemandQuintals: 68 },
  { id: 'v_srinivaspur', name: 'Srinivaspur', nameHi: 'श्रीनिवासपुर', nameKn: 'ಶ್ರೀನಿವಾಸಪುರ', kind: 'village', lat: 13.3385, lng: 78.2114, taluka: 'Srinivaspur', baseDemandQuintals: 74 },
  { id: 'v_mulbagal', name: 'Mulbagal', nameHi: 'मुलबगल', nameKn: 'ಮುಳಬಾಗಿಲು', kind: 'village', lat: 13.1661, lng: 78.3939, taluka: 'Mulbagal', baseDemandQuintals: 64 },
  { id: 'v_malur', name: 'Malur', nameHi: 'मालूर', nameKn: 'ಮಾಲೂರು', kind: 'village', lat: 13.0038, lng: 77.9383, taluka: 'Malur', baseDemandQuintals: 61 },
  { id: 'v_bangarapet', name: 'Bangarapet', nameHi: 'बंगारपेट', nameKn: 'ಬಂಗಾರಪೇಟೆ', kind: 'village', lat: 12.9914, lng: 78.1795, taluka: 'Bangarapet', baseDemandQuintals: 54 },
  { id: 'v_chintamani', name: 'Chintamani', nameHi: 'चिंतामणि', nameKn: 'ಚಿಂತಾಮಣಿ', kind: 'village', lat: 13.4019, lng: 78.0551, taluka: 'Chintamani', baseDemandQuintals: 70 },
  { id: 'v_vemgal', name: 'Vemgal', nameHi: 'वेमगल', nameKn: 'ವೇಮಗಲ್', kind: 'village', lat: 13.1924, lng: 78.0175, taluka: 'Kolar', baseDemandQuintals: 58 },
  { id: 'v_narasapura', name: 'Narasapura', nameHi: 'नरसापुरा', nameKn: 'ನರಸಾಪುರ', kind: 'village', lat: 13.1408, lng: 77.9882, taluka: 'Kolar', baseDemandQuintals: 52 },
  { id: 'v_kyalanur', name: 'Kyalanur', nameHi: 'क्यालनूर', nameKn: 'ಕ್ಯಾಲನೂರು', kind: 'village', lat: 13.2355, lng: 77.9896, taluka: 'Kolar', baseDemandQuintals: 49 },
  { id: 'v_nangli', name: 'Nangli', nameHi: 'नांगली', nameKn: 'ನಂಗಲಿ', kind: 'village', lat: 13.1751, lng: 78.5042, taluka: 'Mulbagal', baseDemandQuintals: 46 },
  { id: 'v_tekal', name: 'Tekal', nameHi: 'टेकल', nameKn: 'ಟೇಕಲ್', kind: 'village', lat: 13.0282, lng: 78.0672, taluka: 'Malur', baseDemandQuintals: 43 },
  { id: 'v_bethamangala', name: 'Bethamangala', nameHi: 'बेथमंगला', nameKn: 'ಬೇತಮಂಗಲ', kind: 'village', lat: 13.0145, lng: 78.3346, taluka: 'Bangarapet', baseDemandQuintals: 45 },
  { id: 'v_sugatur', name: 'Sugatur', nameHi: 'सुगतूर', nameKn: 'ಸುಗಟೂರು', kind: 'village', lat: 13.2188, lng: 78.1492, taluka: 'Kolar', baseDemandQuintals: 51 },
  { id: 'v_holur', name: 'Holur', nameHi: 'होलूर', nameKn: 'ಹೋಳೂರು', kind: 'village', lat: 13.2463, lng: 78.2211, taluka: 'Kolar', baseDemandQuintals: 47 },
  { id: 'v_vakkaleri', name: 'Vakkaleri', nameHi: 'वक्कलेरी', nameKn: 'ವಕ್ಕಲೇರಿ', kind: 'village', lat: 13.0891, lng: 78.0419, taluka: 'Kolar', baseDemandQuintals: 44 },
  { id: 'v_ronur', name: 'Ronur', nameHi: 'रोनूर', nameKn: 'ರೋಣೂರು', kind: 'village', lat: 13.3688, lng: 78.2684, taluka: 'Srinivaspur', baseDemandQuintals: 53 },
  { id: 'v_tayalur', name: 'Tayalur', nameHi: 'तयालूर', nameKn: 'ತಾಯಲೂರು', kind: 'village', lat: 13.0954, lng: 78.3489, taluka: 'Mulbagal', baseDemandQuintals: 42 },
  { id: 'v_devarayasamudra', name: 'Devarayasamudra', nameHi: 'देवरायसमुद्र', nameKn: 'ದೇವರಾಯಸಮುದ್ರ', kind: 'village', lat: 13.1512, lng: 78.2825, taluka: 'Mulbagal', baseDemandQuintals: 48 },
  { id: 'v_avani', name: 'Avani', nameHi: 'अवनी', nameKn: 'ಆವಣಿ', kind: 'village', lat: 13.1066, lng: 78.3018, taluka: 'Mulbagal', baseDemandQuintals: 39 },
  { id: 'v_masti', name: 'Masti', nameHi: 'मस्ती', nameKn: 'ಮಾಸ್ತಿ', kind: 'village', lat: 12.8895, lng: 78.0061, taluka: 'Malur', baseDemandQuintals: 46 },
  { id: 'v_lakkur', name: 'Lakkur', nameHi: 'लक्कुर', nameKn: 'ಲಕ್ಕೂರು', kind: 'village', lat: 12.9462, lng: 77.8825, taluka: 'Malur', baseDemandQuintals: 50 },
  { id: 'v_kaiwara', name: 'Kaiwara', nameHi: 'कैवारा', nameKn: 'ಕೈವಾರ', kind: 'village', lat: 13.3471, lng: 77.9942, taluka: 'Chintamani', baseDemandQuintals: 45 },
  { id: 'v_robertsonpet', name: 'Robertsonpet', nameHi: 'रॉबर्टसनपेट', nameKn: 'ರಾಬರ್ಟ್‌ಸನ್‌ಪೇಟೆ', kind: 'village', lat: 12.9585, lng: 78.2712, taluka: 'Bangarapet', baseDemandQuintals: 38 },
  { id: 'v_hungenahalli', name: 'Hungenahalli', nameHi: 'हुंगेनहल्ली', nameKn: 'ಹುಂಗೇನಹಳ್ಳಿ', kind: 'village', lat: 13.0491, lng: 77.9948, taluka: 'Malur', baseDemandQuintals: 41 },

  // 4 Mandis & Markets
  { id: 'm_kolar_apmc', name: 'Kolar APMC', nameHi: 'कोलार मंडी', nameKn: 'ಕೋಲಾರ ಎಪಿಎಂಸಿ ಮಂಡಿ', kind: 'mandi', lat: 13.1445, lng: 78.1485, taluka: 'Kolar', baseDemandQuintals: 0 },
  { id: 'm_srinivaspur', name: 'Srinivaspur Market', nameHi: 'श्रीनिवासपुर मंडी', nameKn: 'ಶ್ರೀನಿವಾಸಪುರ ಮಾರುಕಟ್ಟೆ', kind: 'mandi', lat: 13.3442, lng: 78.2198, taluka: 'Srinivaspur', baseDemandQuintals: 0 },
  { id: 'm_blr_kr', name: 'Bengaluru KR Market', nameHi: 'बेंगलुरु केआर मार्केट', nameKn: 'ಬೆಂಗಳೂರು ಕೆಆರ್ ಮಾರುಕಟ್ಟೆ', kind: 'mandi', lat: 12.9635, lng: 77.5775, taluka: 'Bengaluru', baseDemandQuintals: 0 },
  { id: 'm_blr_yeshwantpur', name: 'Bengaluru Yeshwantpur', nameHi: 'यशवंतपुर मंडी', nameKn: 'ಯಶವಂತಪುರ ಮಂಡಿ', kind: 'mandi', lat: 13.0185, lng: 77.5512, taluka: 'Bengaluru', baseDemandQuintals: 0 },

  // 3 Cold-chain / Packhouses
  { id: 'c_narasapura_cold', name: 'Narasapura Cold Store', nameHi: 'नरसापुरा कोल्ड स्टोर', nameKn: 'ನರಸಾಪುರ ಕೋಲ್ಡ್ ಸ್ಟೋರ್', kind: 'cold_chain', lat: 13.1332, lng: 77.9752, taluka: 'Kolar', baseDemandQuintals: 0 },
  { id: 'c_vemgal_pack', name: 'Vemgal Packhouse', nameHi: 'वेमगल पैकहाउस', nameKn: 'ವೇಮಗಲ್ ಪ್ಯಾಕ್‌ಹೌಸ್', kind: 'cold_chain', lat: 13.1995, lng: 78.0265, taluka: 'Kolar', baseDemandQuintals: 0 },
  { id: 'c_srinivaspur_pack', name: 'Srinivaspur Ripening Hub', nameHi: 'श्रीनिवासपुर राइपनिंग हब', nameKn: 'ಶ್ರೀನಿವಾಸಪುರ ಪ್ಯಾಕ್ ಕೇಂದ್ರ', kind: 'cold_chain', lat: 13.3292, lng: 78.2015, taluka: 'Srinivaspur', baseDemandQuintals: 0 },

  // 5 Input Dealers
  { id: 'd_kolar_agro', name: 'Chowdeshwari Agro Inputs', nameHi: 'चौडेश्वरी एग्रो इनपुट्स', nameKn: 'ಚೌಡೇಶ್ವರಿ ಆಗ್ರೋ ಇನ್‌ಪುಟ್ಸ್', kind: 'input_dealer', lat: 13.1398, lng: 78.1365, taluka: 'Kolar', baseDemandQuintals: 25 },
  { id: 'd_mulbagal_rythu', name: 'Mulbagal Rythu Bhandar', nameHi: 'मुलबगल रैथु भंडार', nameKn: 'ಮುಳಬಾಗಿಲು ರೈತ ಭಂಡಾರ', kind: 'input_dealer', lat: 13.1695, lng: 78.3885, taluka: 'Mulbagal', baseDemandQuintals: 22 },
  { id: 'd_malur_haritha', name: 'Malur Haritha Seeds & NPK', nameHi: 'मालूर हरिता खाद केंद्र', nameKn: 'ಮಾಲೂರು ಹರಿತ ಬೀಜ ಮತ್ತು ಗೊಬ್ಬರ', kind: 'input_dealer', lat: 13.0085, lng: 77.9435, taluka: 'Malur', baseDemandQuintals: 24 },
  { id: 'd_srinivaspur_krishi', name: 'Srinivaspur Krishi Kendra', nameHi: 'श्रीनिवासपुर कृषि केंद्र', nameKn: 'ಶ್ರೀನಿವಾಸಪುರ ಕೃಷಿ ಕೇಂದ್ರ', kind: 'input_dealer', lat: 13.3345, lng: 78.2155, taluka: 'Srinivaspur', baseDemandQuintals: 20 },
  { id: 'd_bangarapet_kisan', name: 'Bangarapet Kisan Depot', nameHi: 'बंगारपेट किसान डिपो', nameKn: 'ಬಂಗಾರಪೇಟೆ ಕಿಸಾನ್ ಡಿಪೋ', kind: 'input_dealer', lat: 12.9965, lng: 78.1835, taluka: 'Bangarapet', baseDemandQuintals: 19 },

  // 2 Small Factories
  { id: 'f_vemgal_pulp', name: 'Vemgal Tomato Pulp Unit', nameHi: 'वेमगल टोमैटो पल्प यूनिट', nameKn: 'ವೇಮಗಲ್ ಟೊಮೆಟೊ ಪಲ್ಪ್ ಘಟಕ', kind: 'factory', lat: 13.1845, lng: 78.0085, taluka: 'Kolar', baseDemandQuintals: 40 },
  { id: 'f_malur_feed', name: 'Malur Poultry Feed Mill', nameHi: 'मालूर पोल्ट्री फीड मिल', nameKn: 'ಮಾಲೂರು ಕೋಳಿ ಆಹಾರ ಘಟಕ', kind: 'factory', lat: 13.0125, lng: 77.9265, taluka: 'Malur', baseDemandQuintals: 38 },
];

export function buildRoadGraph(nodes: GeoNode[]): RoadEdge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const pairs: [string, string, 'highway' | 'state' | 'rural', number][] = [
    // NH-75 Highway spine: Bengaluru -> Narasapura -> Kolar -> Devarayasamudra -> Mulbagal -> Nangli
    ['m_blr_yeshwantpur', 'm_blr_kr', 'highway', 1.25],
    ['m_blr_kr', 'v_lakkur', 'highway', 1.28],
    ['m_blr_yeshwantpur', 'v_malur', 'highway', 1.28],
    ['v_malur', 'v_narasapura', 'highway', 1.26],
    ['v_narasapura', 'c_narasapura_cold', 'rural', 1.3],
    ['v_narasapura', 'v_kolar', 'highway', 1.25],
    ['v_kolar', 'm_kolar_apmc', 'highway', 1.25],
    ['v_kolar', 'd_kolar_agro', 'rural', 1.25],
    ['m_kolar_apmc', 'v_devarayasamudra', 'highway', 1.26],
    ['v_devarayasamudra', 'v_mulbagal', 'highway', 1.26],
    ['v_mulbagal', 'd_mulbagal_rythu', 'rural', 1.25],
    ['v_mulbagal', 'v_nangli', 'highway', 1.27],
    // State corridors: Kolar -> Sugatur -> Holur -> Srinivaspur -> Ronur & Chintamani
    ['v_kolar', 'v_sugatur', 'state', 1.32],
    ['v_sugatur', 'v_holur', 'state', 1.33],
    ['v_holur', 'v_srinivaspur', 'state', 1.31],
    ['v_srinivaspur', 'm_srinivaspur', 'state', 1.25],
    ['v_srinivaspur', 'c_srinivaspur_pack', 'rural', 1.28],
    ['v_srinivaspur', 'd_srinivaspur_krishi', 'rural', 1.26],
    ['v_srinivaspur', 'v_ronur', 'rural', 1.35],
    ['v_srinivaspur', 'v_chintamani', 'state', 1.3],
    ['v_chintamani', 'v_kaiwara', 'state', 1.32],
    ['v_kaiwara', 'v_kyalanur', 'rural', 1.36],
    ['v_kyalanur', 'v_vemgal', 'state', 1.32],
    ['v_vemgal', 'c_vemgal_pack', 'rural', 1.25],
    ['v_vemgal', 'f_vemgal_pulp', 'rural', 1.26],
    ['v_vemgal', 'v_narasapura', 'state', 1.3],
    ['v_vemgal', 'v_kolar', 'state', 1.3],
    // Southern corridors: Vakkaleri, Tekal, Malur, Bangarapet, Bethamangala, Tayalur, Avani
    ['v_kolar', 'v_vakkaleri', 'rural', 1.35],
    ['v_vakkaleri', 'v_tekal', 'rural', 1.36],
    ['v_tekal', 'v_malur', 'state', 1.33],
    ['v_malur', 'd_malur_haritha', 'rural', 1.25],
    ['v_malur', 'f_malur_feed', 'rural', 1.26],
    ['v_malur', 'v_hungenahalli', 'rural', 1.35],
    ['v_hungenahalli', 'v_vakkaleri', 'rural', 1.36],
    ['v_malur', 'v_lakkur', 'rural', 1.34],
    ['v_malur', 'v_masti', 'state', 1.34],
    ['v_tekal', 'v_bangarapet', 'state', 1.33],
    ['v_kolar', 'v_bangarapet', 'state', 1.31],
    ['v_bangarapet', 'd_bangarapet_kisan', 'rural', 1.25],
    ['v_bangarapet', 'v_robertsonpet', 'state', 1.3],
    ['v_robertsonpet', 'v_bethamangala', 'state', 1.33],
    ['v_bethamangala', 'v_tayalur', 'rural', 1.36],
    ['v_tayalur', 'v_avani', 'rural', 1.35],
    ['v_avani', 'v_devarayasamudra', 'rural', 1.34],
    ['v_tayalur', 'v_mulbagal', 'state', 1.33],
  ];

  return pairs.map(([from, to, roadClass, circuity]) => {
    const a = nodeMap.get(from)!;
    const b = nodeMap.get(to)!;
    const distanceKm = roadDistanceKm(a, b, circuity);
    const speedKmh = roadClass === 'highway' ? 52 : roadClass === 'state' ? 38 : 28;
    const travelMinutes = Math.max(4, Math.round((distanceKm / speedKmh) * 60));
    return { from, to, distanceKm, travelMinutes, roadClass };
  });
}

const SOUTH_INDIAN_FIRST = [
  'Ramesh', 'Sunita', 'Mohan', 'Anwar', 'Priya', 'Kiran', 'Baldev', 'Lakshmi',
  'Venkatesh', 'Kavitha', 'Nagaraj', 'Manjunath', 'Savitha', 'Shivakumar', 'Padma',
  'Gowramma', 'Srinivas', 'Harish', 'pushpa', 'Basavaraj', 'Chandrashekar', 'Bhavani',
  'Muniraju', 'Narayanaswamy', 'Radha', 'lokesh', 'Byregowda', 'Asha', 'mahesh',
  'Shanthamma', 'Prakash', 'Sudha', 'Raghavendra', 'Geetha', 'Krishnappa', 'Rekha',
  ' Kempegowda', 'Roopa', 'soma', 'Nirmala', 'Girish', 'Usha', 'Jagadish', 'Yashoda',
  'Devaraj', 'gayathri', 'Naveen', 'Anitha', 'Shankar', 'Lalitha', 'Arjun', 'Meena',
  'Raju', 'Suma', 'Syed', 'Farida', ' Santhosh', 'Divya', 'Chethan', 'Vani',
].map((s) => s.trim().replace(/^./, (c) => c.toUpperCase()));

const SURNAMES = [
  'Gowda', 'Reddy', 'Naik', 'Rao', 'Murthy', 'appa', 'Shetty', 'Basha', 'Acharya', 'Hegde', 'Setty', 'Kumar',
];

function nonRoutablePhone(index: number): string {
  // Non-routable +91 9000x xxxxx series
  const num = 9000100100 + index * 37;
  const s = String(num);
  return `+91 ${s.slice(0, 5)} ${s.slice(5)}`;
}

export function generatePeopleAndOrgs() {
  const rng = createSeededRng(20260418);
  const villages = KOLAR_NODES.filter((n) => n.kind === 'village');
  const accounts: UserAccount[] = [];

  // 1. 5 FPOs
  const fpoSpecs = [
    { id: 'fpo_1', name: 'Vemgal Horti Growers FPO', hq: 'v_vemgal', coord: 'Sunita Gowda', members: 48, rule: 'shapley' as const },
    { id: 'fpo_2', name: 'Srinivaspur Totapuri & Veg FPO', hq: 'v_srinivaspur', coord: 'Byregowda Reddy', members: 56, rule: 'weight' as const },
    { id: 'fpo_3', name: 'Mulbagal Swarna Bhumi FPO', hq: 'v_mulbagal', coord: 'Savitha Murthy', members: 38, rule: 'shapley' as const },
    { id: 'fpo_4', name: 'Malur Haritha Kisan Producer Co.', hq: 'v_malur', coord: 'Narayanaswamy Rao', members: 44, rule: 'distance' as const },
    { id: 'fpo_5', name: 'Kyalanur Silk & Vegetable FPO', hq: 'v_kyalanur', coord: 'Padma Shetty', members: 29, rule: 'shapley' as const },
  ];

  const fpos: FpoProfile[] = fpoSpecs.map((spec, idx) => {
    const phone = idx === 0 ? '+91 90001 10041' : idx === 1 ? '+91 90001 10042' : nonRoutablePhone(400 + idx);
    const accId = `acc_fpo_${idx + 1}`;
    accounts.push({
      id: accId,
      name: spec.coord,
      phone,
      role: 'fpo',
      villageId: spec.hq,
      preferredLanguage: idx === 0 ? 'kn' : 'en',
      avatarInitials: spec.coord.split(' ').map((w) => w[0]).join('').slice(0, 2),
      organisationName: spec.name,
      verified: true,
      createdAt: new Date(Date.now() - 80 * 86_400_000).toISOString(),
    });
    return {
      id: spec.id,
      accountId: accId,
      name: spec.name,
      regNumber: `CIN-KA07-FPO-2023-0${idx + 1}`,
      hqVillageId: spec.hq,
      coordinatorName: spec.coord,
      phone,
      memberCount: spec.members,
      preferredSplitRule: spec.rule,
      totalPooledQuintals: 1420 + idx * 380,
      memberSavingsInr: 184000 + idx * 41500,
    };
  });

  // 2. 60 Farmers (first two are canonical documented logins)
  const cropPool: CropOrCargo[] = ['tomato', 'potato', 'beans', 'carrot', 'cabbage', 'capsicum', 'ragi', 'mango', 'flowers'];
  const farmers: FarmerProfile[] = [];

  for (let i = 0; i < 60; i++) {
    const first = SOUTH_INDIAN_FIRST[i % SOUTH_INDIAN_FIRST.length];
    const last = SURNAMES[(i * 3) % SURNAMES.length];
    const fullName =
      i === 0
        ? 'Ramesh Gowda'
        : i === 1
          ? 'Lakshmi Devi'
          : i === 6
            ? 'Baldevappa Naik'
            : `${first} ${last === 'appa' ? '' : last}`.trim();
    const phone =
      i === 0
        ? '+91 90001 10001'
        : i === 1
          ? '+91 90001 10002'
          : nonRoutablePhone(10 + i);
    const village = i === 0 ? villages[6] : i === 1 ? villages[1] : villages[i % villages.length];
    const lang = i % 5 === 0 ? 'kn' : i % 7 === 0 ? 'hi' : 'en';
    const accId = `acc_farmer_${i + 1}`;

    accounts.push({
      id: accId,
      name: fullName,
      phone,
      role: 'farmer',
      villageId: village.id,
      preferredLanguage: i === 0 ? 'en' : i === 1 ? 'kn' : lang,
      avatarInitials: fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      verified: true,
      createdAt: new Date(Date.now() - (75 - (i % 45)) * 86_400_000).toISOString(),
    });

    const primary = cropPool[i % cropPool.length];
    const secondary = cropPool[(i + 3) % cropPool.length];
    farmers.push({
      id: `farmer_${i + 1}`,
      accountId: accId,
      name: fullName,
      phone,
      villageId: village.id,
      fpoId: fpos[i % fpos.length].id,
      landAcres: rngFloat(rng, 1.2, 8.5, 1),
      primaryCrops: [primary, secondary],
      preferredLanguage: i === 0 ? 'en' : i === 1 ? 'kn' : lang,
      digitalComfort: i % 4 === 0 ? 'voice_only' : i % 3 === 0 ? 'assisted' : 'smartphone',
      completedShipments: rngInt(rng, 4, 29),
      totalSavedInr: rngInt(rng, 2400, 19600),
    });
  }

  // 3. 28 Transporters owning 38 Vehicles
  const vehicleCatalog: { type: VehicleType; typeName: string; cap: number; costKm: [number, number] }[] = [
    { type: 'tata_ace', typeName: 'Tata Ace Gold', cap: 12, costKm: [15, 18] },
    { type: 'bolero_pickup', typeName: 'Mahindra Bolero Pickup 1.7T', cap: 20, costKm: [19, 23] },
    { type: 'eicher_14ft', typeName: 'Eicher Pro 14 ft', cap: 45, costKm: [28, 34] },
    { type: 'tractor_trolley', typeName: 'Swaraj Tractor + Trolley', cap: 32, costKm: [21, 26] },
  ];

  const transporters: TransporterProfile[] = [];
  const vehicles: Vehicle[] = [];
  const seriesLetters = ['AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AJ', 'AK', 'AM'];

  let vCounter = 0;
  for (let t = 0; t < 28; t++) {
    const tName =
      t === 0
        ? 'Mohan Kumar'
        : t === 1
          ? 'Kiran Byregowda'
          : `${SOUTH_INDIAN_FIRST[(t + 14) % SOUTH_INDIAN_FIRST.length]} ${SURNAMES[(t * 5) % SURNAMES.length]}`.replace(' appa', 'appa');
    const phone =
      t === 0
        ? '+91 90001 10011'
        : t === 1
          ? '+91 90001 10012'
          : nonRoutablePhone(120 + t);
    const homeV = t === 0 ? KOLAR_NODES[1] /* Srinivaspur */ : t === 1 ? KOLAR_NODES[6] /* Vemgal */ : villages[(t * 2) % villages.length];
    const accId = `acc_trans_${t + 1}`;
    const tId = `trans_${t + 1}`;

    accounts.push({
      id: accId,
      name: tName,
      phone,
      role: 'transporter',
      villageId: homeV.id,
      preferredLanguage: t % 4 === 0 ? 'kn' : 'en',
      avatarInitials: tName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      verified: true,
      createdAt: new Date(Date.now() - 85 * 86_400_000).toISOString(),
    });

    // First 10 transporters own 2 vehicles, remaining 18 own 1 vehicle => 10*2 + 18*1 = 38 vehicles
    const numVehicles = t < 10 ? 2 : 1;
    const ownedIds: string[] = [];
    for (let k = 0; k < numVehicles; k++) {
      vCounter += 1;
      const spec = vehicleCatalog[(vCounter - 1) % vehicleCatalog.length];
      const letters = seriesLetters[vCounter % seriesLetters.length];
      const plateNum = 1140 + vCounter * 73;
      const plate = `KA 07 ${letters} ${plateNum}`;
      const vId = `veh_${vCounter}`;
      ownedIds.push(vId);

      const standbyOptIn = vCounter % 5 === 0 || vCounter === 3 || vCounter === 8;
      vehicles.push({
        id: vId,
        transporterId: tId,
        plate,
        type: spec.type,
        typeName: spec.typeName,
        capacityQuintals: spec.cap,
        costPerKmInr: rngInt(rng, spec.costKm[0], spec.costKm[1]),
        baseVillageId: homeV.id,
        homeVillageId: homeV.id,
        currentNodeId: homeV.id,
        lat: homeV.lat + (rng() - 0.5) * 0.012,
        lng: homeV.lng + (rng() - 0.5) * 0.012,
        headingDeg: rngInt(rng, 0, 355),
        detourBudgetKm: rngInt(rng, 8, 22),
        ageYears: rngInt(rng, 1, 8),
        rcValidUntil: '2029-11-30',
        status: standbyOptIn ? 'standby' : vCounter <= 12 ? 'en_route' : 'idle',
        standbyOptIn,
        standbyRetainerInr: standbyOptIn ? 350 : 0,
      });
    }

    transporters.push({
      id: tId,
      accountId: accId,
      name: tName,
      phone,
      homeVillageId: homeV.id,
      vehicleIds: ownedIds,
      reliabilityScore: t === 0 ? 96 : rngInt(rng, 84, 99),
      completedTours: rngInt(rng, 18, 64),
      cancellationsCount: rngInt(rng, 0, 2),
      walletBalanceInr: t === 0 ? 18450 : rngInt(rng, 6200, 31400),
      escrowInTransitInr: t === 0 ? 4120 : rngInt(rng, 1800, 7200),
      verifiedMonthlyEarningsInr: t === 0 ? 54800 : rngInt(rng, 34000, 72000),
      bankAccountMasked: `•••• ${4102 + t * 19}`,
      ifsc: 'CNRB0001427',
      standbyActive: ownedIds.some((vid) => vehicles.find((v) => v.id === vid)?.standbyOptIn),
      preferredLanguage: t % 4 === 0 ? 'kn' : 'en',
    });
  }

  // 4. 12 Business Shippers
  const businessSpecs: {
    name: string;
    cat: BusinessProfile['category'];
    nodeId: string;
    contact: string;
  }[] = [
    { name: 'Chowdeshwari Agro Inputs', cat: 'input_dealer', nodeId: 'd_kolar_agro', contact: 'Priya Shetty' },
    { name: 'Vemgal Tomato Pulp Unit', cat: 'pulp_factory', nodeId: 'f_vemgal_pulp', contact: 'Raghavendra Setty' },
    { name: 'Malur Poultry Feed Mill', cat: 'feed_unit', nodeId: 'f_malur_feed', contact: 'Jagadish Rao' },
    { name: 'Anwar & Sons Mandi Commission', cat: 'commission_agent', nodeId: 'm_kolar_apmc', contact: 'Anwar Basha' },
    { name: 'Mulbagal Rythu Bhandar', cat: 'input_dealer', nodeId: 'd_mulbagal_rythu', contact: 'Prakash Murthy' },
    { name: 'Malur Haritha Seeds & NPK', cat: 'input_dealer', nodeId: 'd_malur_haritha', contact: 'Rekha Gowda' },
    { name: 'Srinivaspur Krishi Kendra', cat: 'input_dealer', nodeId: 'd_srinivaspur_krishi', contact: 'Muniraju Naik' },
    { name: 'Bangarapet Kisan Depot', cat: 'input_dealer', nodeId: 'd_bangarapet_kisan', contact: 'Harish Kumar' },
    { name: 'Nandi Fresh Mandi Traders', cat: 'mandi_trader', nodeId: 'm_blr_kr', contact: 'Syed Farooq' },
    { name: 'Yeshwantpur Veg Exports', cat: 'mandi_trader', nodeId: 'm_blr_yeshwantpur', contact: 'Santhosh Hegde' },
    { name: 'Srinivaspur Mango Agency', cat: 'commission_agent', nodeId: 'm_srinivaspur', contact: 'Venkatesh Reddy' },
    { name: 'Narasapura Crate & Pack Supply', cat: 'input_dealer', nodeId: 'c_narasapura_cold', contact: 'Divya Acharya' },
  ];

  const businesses: BusinessProfile[] = businessSpecs.map((b, idx) => {
    const phone = idx === 0 ? '+91 90001 10021' : idx === 1 ? '+91 90001 10022' : nonRoutablePhone(220 + idx);
    const accId = `acc_biz_${idx + 1}`;
    accounts.push({
      id: accId,
      name: b.contact,
      phone,
      role: 'business',
      villageId: b.nodeId,
      preferredLanguage: 'en',
      avatarInitials: b.contact.split(' ').map((w) => w[0]).join('').slice(0, 2),
      organisationName: b.name,
      verified: true,
      createdAt: new Date(Date.now() - 88 * 86_400_000).toISOString(),
    });
    return {
      id: `biz_${idx + 1}`,
      accountId: accId,
      name: b.name,
      category: b.cat,
      nodeId: b.nodeId,
      contactName: b.contact,
      phone,
      gstin: `29AABCH${4120 + idx}R1Z${(idx % 8) + 1}`,
      monthlyVolumeQuintals: rngInt(rng, 280, 1150),
    };
  });

  // 5. 4 Freight Sakhi Kiosk Operators
  const kioskSpecs = [
    { name: 'Kavitha Freight Sakhi', villageId: 'v_vemgal', code: 'SAKHI-VEM-01' },
    { name: 'Bhavani Freight Sakhi', villageId: 'v_srinivaspur', code: 'SAKHI-SRI-02' },
    { name: 'Asha Freight Sakhi', villageId: 'v_mulbagal', code: 'SAKHI-MUL-03' },
    { name: 'Roopa Freight Sakhi', villageId: 'v_malur', code: 'SAKHI-MAL-04' },
  ];

  const kiosks: KioskOperator[] = kioskSpecs.map((k, idx) => {
    const phone = idx === 0 ? '+91 90001 10051' : idx === 1 ? '+91 90001 10052' : nonRoutablePhone(510 + idx);
    const accId = `acc_kiosk_${idx + 1}`;
    accounts.push({
      id: accId,
      name: k.name,
      phone,
      role: 'kiosk',
      villageId: k.villageId,
      preferredLanguage: idx === 0 ? 'kn' : 'en',
      avatarInitials: k.name.slice(0, 2).toUpperCase(),
      organisationName: `Gram Kendra (${k.code})`,
      verified: true,
      createdAt: new Date(Date.now() - 70 * 86_400_000).toISOString(),
    });
    return {
      id: `kiosk_${idx + 1}`,
      accountId: accId,
      name: k.name,
      phone,
      villageId: k.villageId,
      kioskCode: k.code,
      farmersServed: 145 + idx * 38,
    };
  });

  // 6. 6 Operations Control-Tower Staff
  const opsSpecs = [
    { name: 'Aditi Deshpande', title: 'Network Control Lead' },
    { name: 'Chethan Gowda', title: 'Corridor Dispatch Specialist' },
    { name: 'Nirmala Rao', title: 'Escrow & Weighbridge Auditor' },
    { name: 'Girish Murthy', title: 'Transporter Success Coordinator' },
    { name: 'Meena Hegde', title: 'FPO & Sakhi Desk Lead' },
    { name: 'Arjun Shetty', title: 'Routing & Risk Analyst' },
  ];

  opsSpecs.forEach((o, idx) => {
    const phone = idx === 0 ? '+91 90001 10061' : idx === 1 ? '+91 90001 10062' : nonRoutablePhone(610 + idx);
    accounts.push({
      id: `acc_ops_${idx + 1}`,
      name: o.name,
      phone,
      role: 'ops',
      villageId: 'v_kolar',
      preferredLanguage: 'en',
      avatarInitials: o.name.split(' ').map((w) => w[0]).join('').slice(0, 2),
      organisationName: o.title,
      verified: true,
      createdAt: new Date(Date.now() - 95 * 86_400_000).toISOString(),
    });
  });

  return { accounts, fpos, farmers, transporters, vehicles, businesses, kiosks, rngPick };
}

export const SYNTHETIC_PERSONAS: SyntheticPersona[] = [
  {
    id: 'p_ramesh',
    name: 'Ramesh',
    archetype: 'Small Tomato Grower (2.2 acres)',
    stakeholderGroup: 'farmer',
    villageName: 'Vemgal',
    age: 41,
    preferredLanguage: 'kn',
    bio: 'Harvests 12–18 quintals twice a week; acutely sensitive to tomato softening and per-crate fare.',
    connectedPersonaIds: ['p_sunita', 'p_baldev', 'p_anwar'],
    traits: { riskAppetite: 32, trustInStrangers: 58, priceSensitivity: 88, patience: 44, loyalty: 72, digitalComfort: 54, literacy: 62, neighbourInfluence: 68 },
  },
  {
    id: 'p_sunita',
    name: 'Sunita',
    archetype: 'FPO Coordinator (48-member collective)',
    stakeholderGroup: 'fpo',
    villageName: 'Vemgal',
    age: 37,
    preferredLanguage: 'kn',
    bio: 'Coordinates group dispatches for 48 smallholders; champions transparent split receipts and women growers.',
    connectedPersonaIds: ['p_ramesh', 'p_lakshmi', 'p_baldev', 'p_priya'],
    traits: { riskAppetite: 56, trustInStrangers: 76, priceSensitivity: 74, patience: 68, loyalty: 84, digitalComfort: 82, literacy: 88, neighbourInfluence: 94 },
  },
  {
    id: 'p_mohan',
    name: 'Mohan',
    archetype: 'Two-Vehicle Tempo Owner',
    stakeholderGroup: 'transporter',
    villageName: 'Srinivaspur',
    age: 45,
    preferredLanguage: 'kn',
    bio: 'Runs a Bolero Pickup and an Eicher 14ft; hates empty homeward runs and strongly guards operator autonomy.',
    connectedPersonaIds: ['p_kiran', 'p_anwar', 'p_priya'],
    traits: { riskAppetite: 48, trustInStrangers: 52, priceSensitivity: 79, patience: 50, loyalty: 66, digitalComfort: 64, literacy: 70, neighbourInfluence: 86 },
  },
  {
    id: 'p_anwar',
    name: 'Anwar',
    archetype: 'Mandi Commission Agent',
    stakeholderGroup: 'trader',
    villageName: 'Kolar APMC',
    age: 51,
    preferredLanguage: 'hi',
    bio: 'Handles 160 quintals daily at Kolar auction bays; demands punctual dawn arrivals before 7:15 AM.',
    connectedPersonaIds: ['p_ramesh', 'p_mohan', 'p_venkatesh'],
    traits: { riskAppetite: 62, trustInStrangers: 46, priceSensitivity: 64, patience: 26, loyalty: 55, digitalComfort: 74, literacy: 82, neighbourInfluence: 78 },
  },
  {
    id: 'p_priya',
    name: 'Priya',
    archetype: 'Taluka Agro-Input Dealer',
    stakeholderGroup: 'input_dealer',
    villageName: 'Kolar Town',
    age: 34,
    preferredLanguage: 'en',
    bio: 'Ships NPK fertiliser and seed cartons to 14 villages; eager to pre-book discounted return capacity.',
    connectedPersonaIds: ['p_sunita', 'p_mohan', 'p_kavitha'],
    traits: { riskAppetite: 68, trustInStrangers: 74, priceSensitivity: 72, patience: 78, loyalty: 76, digitalComfort: 92, literacy: 95, neighbourInfluence: 71 },
  },
  {
    id: 'p_kiran',
    name: 'Kiran',
    archetype: 'Young Owner-Driver (Tractor & Pickup)',
    stakeholderGroup: 'transporter',
    villageName: 'Vemgal',
    age: 26,
    preferredLanguage: 'en',
    bio: 'Paying monthly vehicle EMIs; responds enthusiastically to streak bonuses, heatmaps, and fuel credit.',
    connectedPersonaIds: ['p_mohan', 'p_ramesh', 'p_kavitha'],
    traits: { riskAppetite: 74, trustInStrangers: 68, priceSensitivity: 82, patience: 60, loyalty: 62, digitalComfort: 89, literacy: 84, neighbourInfluence: 64 },
  },
  {
    id: 'p_baldev',
    name: 'Baldevappa',
    archetype: 'Elder Voice-First Ragi & Potato Farmer',
    stakeholderGroup: 'farmer',
    villageName: 'Mulbagal',
    age: 63,
    preferredLanguage: 'kn',
    bio: 'Books exclusively through spoken Kannada or the village Freight Sakhi; values neighbour trust above all.',
    connectedPersonaIds: ['p_sunita', 'p_ramesh', 'p_kavitha'],
    traits: { riskAppetite: 22, trustInStrangers: 44, priceSensitivity: 85, patience: 72, loyalty: 88, digitalComfort: 18, literacy: 28, neighbourInfluence: 75 },
  },
  {
    id: 'p_lakshmi',
    name: 'Lakshmi',
    archetype: 'Floriculture & Capsicum Grower',
    stakeholderGroup: 'farmer',
    villageName: 'Malur',
    age: 33,
    preferredLanguage: 'kn',
    bio: 'Ships delicate marigold and capsicum to Bengaluru KR Market; zero tolerance for flower wilting or odour mixing.',
    connectedPersonaIds: ['p_sunita', 'p_venkatesh'],
    traits: { riskAppetite: 40, trustInStrangers: 62, priceSensitivity: 69, patience: 29, loyalty: 77, digitalComfort: 71, literacy: 76, neighbourInfluence: 66 },
  },
  {
    id: 'p_venkatesh',
    name: 'Venkatesh',
    archetype: 'Orchard Mango & Bulk Aggregator',
    stakeholderGroup: 'trader',
    villageName: 'Srinivaspur',
    age: 48,
    preferredLanguage: 'en',
    bio: 'Moves 30-quintal anchor lots; insists that anchor shippers receive fair trunk-corridor Shapley credit.',
    connectedPersonaIds: ['p_anwar', 'p_lakshmi', 'p_mohan'],
    traits: { riskAppetite: 58, trustInStrangers: 54, priceSensitivity: 76, patience: 48, loyalty: 60, digitalComfort: 78, literacy: 85, neighbourInfluence: 73 },
  },
  {
    id: 'p_kavitha',
    name: 'Kavitha',
    archetype: 'Village Freight Sakhi Kiosk Operator',
    stakeholderGroup: 'fpo',
    villageName: 'Vemgal',
    age: 29,
    preferredLanguage: 'kn',
    bio: 'Assists 25 walk-in growers a week; needs crystal-clear audio explanations when farmers ask about fares.',
    connectedPersonaIds: ['p_baldev', 'p_priya', 'p_kiran', 'p_sunita'],
    traits: { riskAppetite: 52, trustInStrangers: 80, priceSensitivity: 77, patience: 74, loyalty: 86, digitalComfort: 85, literacy: 86, neighbourInfluence: 89 },
  },
];

export const VOICE_PHRASE_LIBRARY: VoicePhraseSeed[] = [
  // English (9 phrases)
  { id: 'vp_en_1', lang: 'en', role: 'farmer', transcript: '20 quintal tomato, tomorrow morning, Kolar APMC from Vemgal', translationEn: '20 quintal tomato, tomorrow morning, Kolar APMC from Vemgal' },
  { id: 'vp_en_2', lang: 'en', role: 'farmer', transcript: '14 quintal beans today evening from Malur to Bengaluru KR Market', translationEn: '14 quintal beans today evening from Malur to Bengaluru KR Market' },
  { id: 'vp_en_3', lang: 'en', role: 'farmer', transcript: '30 bags potato tomorrow morning from Mulbagal to Kolar APMC', translationEn: '30 bags potato tomorrow morning from Mulbagal to Kolar APMC' },
  { id: 'vp_en_4', lang: 'en', role: 'farmer', transcript: '12 quintal mango tomorrow morning from Srinivaspur to Bengaluru Yeshwantpur', translationEn: '12 quintal mango tomorrow morning from Srinivaspur to Bengaluru Yeshwantpur' },
  { id: 'vp_en_5', lang: 'en', role: 'farmer', transcript: '40 crates capsicum today afternoon from Narasapura to Bengaluru KR Market', translationEn: '40 crates capsicum today afternoon from Narasapura to Bengaluru KR Market' },
  { id: 'vp_en_6', lang: 'en', role: 'farmer', transcript: '8 quintal flowers tomorrow morning from Lakkur to Bengaluru KR Market', translationEn: '8 quintal flowers tomorrow morning from Lakkur to Bengaluru KR Market' },
  { id: 'vp_en_7', lang: 'en', role: 'farmer', transcript: '25 quintal carrot tomorrow morning from Bangarapet to Kolar APMC', translationEn: '25 quintal carrot tomorrow morning from Bangarapet to Kolar APMC' },
  { id: 'vp_en_8', lang: 'en', role: 'business', transcript: '18 quintal fertiliser tomorrow morning from Kolar Town to Srinivaspur', translationEn: '18 quintal fertiliser tomorrow morning from Kolar Town to Srinivaspur' },
  { id: 'vp_en_9', lang: 'en', role: 'transporter', transcript: 'Heading home to Srinivaspur from Kolar APMC with 20 quintal space', translationEn: 'Heading home to Srinivaspur from Kolar APMC with 20 quintal space' },

  // Hindi (9 phrases)
  { id: 'vp_hi_1', lang: 'hi', role: 'farmer', transcript: 'कल सुबह 20 क्विंटल टमाटर वेमगल से कोलार मंडी भेजना है', translationEn: 'Send 20 quintal tomato tomorrow morning from Vemgal to Kolar Mandi' },
  { id: 'vp_hi_2', lang: 'hi', role: 'farmer', transcript: 'आज शाम 15 क्विंटल बीन्स मालूर से बेंगलुरु केआर मार्केट भेजना है', translationEn: 'Send 15 quintal beans today evening from Malur to Bengaluru KR Market' },
  { id: 'vp_hi_3', lang: 'hi', role: 'farmer', transcript: 'कल सुबह 25 क्विंटल आलू मुलबगल से कोलार मंडी', translationEn: '25 quintal potato tomorrow morning from Mulbagal to Kolar Mandi' },
  { id: 'vp_hi_4', lang: 'hi', role: 'farmer', transcript: 'कल सुबह 18 क्विंटल आम श्रीनिवासपुर से यशवंतपुर मंडी', translationEn: '18 quintal mango tomorrow morning from Srinivaspur to Yeshwantpur Mandi' },
  { id: 'vp_hi_5', lang: 'hi', role: 'farmer', transcript: 'आज दोपहर 12 क्विंटल शिमला मिर्च नरसापुरा से केआर मार्केट', translationEn: '12 quintal capsicum today afternoon from Narasapura to KR Market' },
  { id: 'vp_hi_6', lang: 'hi', role: 'farmer', transcript: 'कल सुबह 10 क्विंटल गाजर बंगारपेट से कोलार मंडी', translationEn: '10 quintal carrot tomorrow morning from Bangarapet to Kolar Mandi' },
  { id: 'vp_hi_7', lang: 'hi', role: 'farmer', transcript: 'कल सुबह 8 क्विंटल गेंदा फूल मालूर से बेंगलुरु केआर मार्केट', translationEn: '8 quintal marigold flowers tomorrow morning from Malur to Bengaluru KR Market' },
  { id: 'vp_hi_8', lang: 'hi', role: 'business', transcript: 'कल सुबह 20 क्विंटल उर्वरक खाद कोलार नगर से श्रीनिवासपुर भेजना है', translationEn: 'Send 20 quintal fertiliser tomorrow morning from Kolar Town to Srinivaspur' },
  { id: 'vp_hi_9', lang: 'hi', role: 'transporter', transcript: 'मैं कोलार मंडी से श्रीनिवासपुर घर लौट रहा हूँ', translationEn: 'I am returning home to Srinivaspur from Kolar Mandi' },

  // Kannada (9 phrases)
  { id: 'vp_kn_1', lang: 'kn', role: 'farmer', transcript: 'ನಾಳೆ ಬೆಳಿಗ್ಗೆ 20 ಕ್ವಿಂಟಲ್ ಟೊಮೆಟೊ ವೇಮಗಲ್ ನಿಂದ ಕೋಲಾರ ಎಪಿಎಂಸಿ ಮಂಡಿಗೆ ಕಳುಹಿಸಬೇಕು', translationEn: 'Need to send 20 quintal tomato tomorrow morning from Vemgal to Kolar APMC' },
  { id: 'vp_kn_2', lang: 'kn', role: 'farmer', transcript: 'ಇಂದು ಸಂಜೆ 14 ಕ್ವಿಂಟಲ್ ಹುರಳಿಕಾಯಿ ಮಾಲೂರು ನಿಂದ ಬೆಂಗಳೂರು ಕೆಆರ್ ಮಾರುಕಟ್ಟೆ', translationEn: '14 quintal beans today evening from Malur to Bengaluru KR Market' },
  { id: 'vp_kn_3', lang: 'kn', role: 'farmer', transcript: 'ನಾಳೆ ಬೆಳಿಗ್ಗೆ 22 ಕ್ವಿಂಟಲ್ ಆಲೂಗಡ್ಡೆ ಮುಳಬಾಗಿಲು ನಿಂದ ಕೋಲಾರ ಎಪಿಎಂಸಿ ಮಂಡಿ', translationEn: '22 quintal potato tomorrow morning from Mulbagal to Kolar APMC' },
  { id: 'vp_kn_4', lang: 'kn', role: 'farmer', transcript: 'ನಾಳೆ ಬೆಳಿಗ್ಗೆ 16 ಕ್ವಿಂಟಲ್ ಮಾವಿನಹಣ್ಣು ಶ್ರೀನಿವಾಸಪುರ ನಿಂದ ಯಶವಂತಪುರ ಮಂಡಿ', translationEn: '16 quintal mango tomorrow morning from Srinivaspur to Yeshwantpur Mandi' },
  { id: 'vp_kn_5', lang: 'kn', role: 'farmer', transcript: 'ಇಂದು ಮಧ್ಯಾಹ್ನ 12 ಕ್ವಿಂಟಲ್ ದೊಣ್ಣಮೆಣಸಿನಕಾಯಿ ನರಸಾಪುರ ನಿಂದ ಬೆಂಗಳೂರು ಕೆಆರ್ ಮಾರುಕಟ್ಟೆ', translationEn: '12 quintal capsicum today afternoon from Narasapura to Bengaluru KR Market' },
  { id: 'vp_kn_6', lang: 'kn', role: 'farmer', transcript: 'ನಾಳೆ ಬೆಳಿಗ್ಗೆ 10 ಕ್ವಿಂಟಲ್ ಚೆಂಡು ಹೂವು ಲಕ್ಕೂರು ನಿಂದ ಬೆಂಗಳೂರು ಕೆಆರ್ ಮಾರುಕಟ್ಟೆ', translationEn: '10 quintal marigold flowers tomorrow morning from Lakkur to Bengaluru KR Market' },
  { id: 'vp_kn_7', lang: 'kn', role: 'farmer', transcript: 'ನಾಳೆ ಬೆಳಿಗ್ಗೆ 18 ಕ್ವಿಂಟಲ್ ಕ್ಯಾರೆಟ್ ಬಂಗಾರಪೇಟೆ ನಿಂದ ಕೋಲಾರ ಎಪಿಎಂಸಿ ಮಂಡಿ', translationEn: '18 quintal carrot tomorrow morning from Bangarapet to Kolar APMC' },
  { id: 'vp_kn_8', lang: 'kn', role: 'business', transcript: 'ನಾಳೆ ಬೆಳಿಗ್ಗೆ 20 ಕ್ವಿಂಟಲ್ ರಸಗೊಬ್ಬರ ಕೋಲಾರ ಪಟ್ಟಣ ನಿಂದ ಶ್ರೀನಿವಾಸಪುರ', translationEn: '20 quintal fertiliser tomorrow morning from Kolar Town to Srinivaspur' },
  { id: 'vp_kn_9', lang: 'kn', role: 'transporter', transcript: 'ನಾನು ಕೋಲಾರ ಮಂಡಿಯಿಂದ ಶ್ರೀನಿವಾಸಪುರ ಮನೆಗೆ ಹಿಂತಿರುಗುತ್ತಿದ್ದೇನೆ', translationEn: 'I am heading back home to Srinivaspur from Kolar Mandi' },
];
