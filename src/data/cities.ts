/**
 * City data loader.
 *
 * City data: simplemaps World Cities basic database
 * https://simplemaps.com/data/world-cities — licensed under CC BY 4.0
 * (https://creativecommons.org/licenses/by/4.0/). Built by scripts/build-popgrid.mjs.
 *
 * `founded` is the approximate year the city plausibly existed as a settlement
 * (negative = BC). Curated for famous/ancient cities; region-based default otherwise.
 */
import rawCities from './cities.json';

export interface City {
  name: string;
  lat: number;
  lng: number;
  pop: number;
  country: string;
  founded: number;
}

/** Curated founding years, keyed by "name|iso2" as spelled in the dataset. */
const FOUNDED: Record<string, number> = {
  // Middle East / Levant / Mesopotamia
  'Jericho|XW': -9000,
  'Damascus|SY': -6300,
  'Aleppo|SY': -5000,
  'Erbil|IQ': -5000,
  'Kirkuk|IQ': -3000,
  'Mosul|IQ': -2500,
  'Beirut|LB': -3000,
  'Jerusalem|IL': -2800,
  'Tel Aviv-Yafo|IL': -1800, // Jaffa
  'Amman|JO': -7000, // 'Ain Ghazal
  'Baghdad|IQ': 762,
  'An Najaf|IQ': 791,
  'Mecca|SA': 400,
  'Medina|SA': -600, // Yathrib
  'Sanaa|YE': -600,
  'Aden|YE': -500,
  'Riyadh|SA': 1737,
  'Kuwait City|KW': 1716,
  'Dubai|AE': 1833,
  'Doha|QA': 1825,
  'Muscat|OM': 100,
  // Anatolia / Caucasus
  'Istanbul|TR': -667, // Byzantium
  'Ankara|TR': -1000,
  'İzmir|TR': -3000, // Smyrna
  'Bursa|TR': -202, // Prusa
  'Konya|TR': -2000,
  'Adana|TR': -1500,
  'Antalya|TR': -150, // Attaleia
  'Trabzon|TR': -756, // Trapezus
  'Gaziantep|TR': -1000,
  'Diyarbakır|TR': -1500, // Amida
  'Yerevan|AM': -782, // Erebuni
  'Tbilisi|GE': 458,
  'Baku|AZ': 885,
  // Iran / Central Asia
  'Tehran|IR': 900,
  'Eşfahān|IR': -600,
  'Shīrāz|IR': -2000, // Tirazis
  'Tabrīz|IR': -700,
  'Mashhad|IR': 818,
  'Qom|IR': 300,
  'Yazd|IR': 400,
  'Ahvāz|IR': 250,
  'Samarkand|UZ': -700,
  'Bukhara|UZ': -500,
  'Tashkent|UZ': -200, // Chach
  'Kabul|AF': -1500,
  'Kandahār|AF': -750,
  'Herāt|AF': -500, // Aria
  'Almaty|KZ': 1854,
  // South Asia
  'Delhi|IN': -600,
  'Vārānasi|IN': -1200,
  'Patna|IN': -490, // Pataliputra
  'Ujjain|IN': -700,
  'Madurai|IN': -300,
  'Srīnagar|IN': -250,
  'Kolkāta|IN': 1690,
  'Mumbai|IN': 1500,
  'Chennai|IN': 1639, // Madras
  'Bangalore|IN': 1537,
  'Hyderābād|IN': 1591,
  'Ahmedabad|IN': 1411,
  'Jaipur|IN': 1727,
  'Āgra|IN': 1504,
  'Lucknow|IN': 1350,
  'Amritsar|IN': 1577,
  'Gwalior|IN': 727,
  'Bhopāl|IN': 1010,
  'Nāgpur|IN': 1702,
  'Pune|IN': 758,
  'Lahore|PK': 100,
  'Multan|PK': -3000,
  'Peshawar|PK': -500, // Purushapura
  'Karachi|PK': 1729, // Kolachi
  'Hyderabad City|PK': 1768,
  'Dhaka|BD': 620,
  'Kathmandu|NP': 723,
  'Colombo|LK': 500,
  // East Asia
  'Xi’an|CN': -1100,
  'Beijing|CN': -1000,
  'Luoyang|CN': -1600,
  'Zhengzhou|CN': -1600, // Shang
  'Anyang|CN': -1300, // Yin
  'Kaifeng Chengguanzhen|CN': -350,
  'Nanjing|CN': -472,
  'Hangzhou|CN': -222,
  'Suzhou|CN': -514,
  'Shaoxing|CN': -490,
  'Guangzhou|CN': -214, // Panyu
  'Chengdu|CN': -311,
  'Chongqing|CN': -316,
  'Wuhan|CN': 223,
  'Shanghai|CN': 751,
  'Tianjin|CN': 1404,
  'Harbin|CN': 1898,
  'Lhasa|CN': 633,
  'Kashgar|CN': -200,
  'Taiyuan|CN': -497,
  'Xianyang|CN': -350, // Qin capital
  'Hong Kong|HK': 1841,
  'Macau|MO': 1557,
  'Taipei|TW': 1709,
  'Tainan|TW': 1624,
  'Seoul|KR': -18, // Wiryeseong
  'Pyongyang|KP': -1000,
  'Tokyo|JP': 1457, // Edo
  'Kyōto|JP': 794, // Heian-kyo
  'Ōsaka|JP': 645, // Naniwa
  'Nara|JP': 710,
  'Nagoya|JP': 1610,
  'Yokohama|JP': 1859,
  'Sapporo|JP': 1868,
  'Nagasaki|JP': 1571,
  'Hiroshima|JP': 1589,
  'Sendai|JP': 1600,
  'Ulaanbaatar|MN': 1639,
  // Southeast Asia
  'Hanoi|VN': 1010, // Thang Long
  'Huế|VN': 1636,
  'Ho Chi Minh City|VN': 1698,
  'Bangkok|TH': 1782,
  'Chiang Mai|TH': 1296,
  'Phnom Penh|KH': 1372,
  'Vientiane|LA': 1560,
  'Rangoon|MM': 1043, // Dagon
  'Mandalay|MM': 1857,
  'Jakarta|ID': 1527, // Jayakarta
  'Yogyakarta|ID': 1755,
  'Surabaya|ID': 1293,
  'Singapore|SG': 1299, // Temasek
  'Kuala Lumpur|MY': 1857,
  'Manila|PH': 1258, // Maynila
  'Cebu City|PH': 1400,
  // Europe
  'Athens|GR': -3000,
  'Thessaloníki|GR': -315,
  'Rome|IT': -753,
  'Naples|IT': -600, // Parthenope
  'Milan|IT': -590,
  'Venice|IT': 421,
  'Florence|IT': -59,
  'Bologna|IT': -534, // Felsina
  'Genoa|IT': -500,
  'Turin|IT': -28,
  'Palermo|IT': -734,
  'Paris|FR': -250,
  'Marseille|FR': -600, // Massalia
  'Lyon|FR': -43, // Lugdunum
  'Bordeaux|FR': -300, // Burdigala
  'Toulouse|FR': -200,
  'Nice|FR': -350, // Nikaia
  'Strasbourg|FR': -12,
  'London|GB': 47, // Londinium
  'Edinburgh|GB': 638,
  'Dublin|IE': 841,
  'Madrid|ES': 865, // Mayrit
  'Barcelona|ES': -15, // Barcino
  'Sevilla|ES': -800, // Spal
  'Córdoba|ES': -206,
  'Granada|ES': -500, // Iliberri
  'Lisbon|PT': -1200, // Phoenician
  'Porto|PT': -300, // Portus Cale
  'Vienna|AT': -500, // Celtic, later Vindobona
  'Berlin|DE': 1237,
  'Hamburg|DE': 808,
  'Munich|DE': 1158,
  'Cologne|DE': -38,
  'Frankfurt|DE': 794,
  'Nuremberg|DE': 1050,
  'Leipzig|DE': 1015,
  'Dresden|DE': 1206,
  'Stuttgart|DE': 950,
  'Amsterdam|NL': 1275,
  'Brussels|BE': 979,
  'Zürich|CH': -15, // Turicum
  'Prague|CZ': 870,
  'Budapest|HU': -100, // Ak-Ink / Aquincum
  'Warsaw|PL': 1300,
  'Kraków|PL': 700,
  'Gdańsk|PL': 997,
  'Wrocław|PL': 985,
  'Bucharest|RO': 1459,
  'Sofia|BG': -700, // Serdica
  'Plovdiv|BG': -6000,
  'Belgrade|RS': -279, // Singidunum
  'Zagreb|HR': 1094,
  'Nicosia|CY': -1050, // Ledra
  'Valletta|MT': 1566,
  'Stockholm|SE': 1252,
  'Gothenburg|SE': 1621,
  'Oslo|NO': 1040,
  'Bergen|NO': 1070,
  'Copenhagen|DK': 1043,
  'Helsinki|FI': 1550,
  'Riga|LV': 1201,
  'Vilnius|LT': 1323,
  'Tallinn|EE': 1219,
  'Minsk|BY': 1067,
  'Kyiv|UA': 482,
  'Lviv|UA': 1256,
  'Odesa|UA': 1415, // Khadjibey
  'Kharkiv|UA': 1654,
  'Moscow|RU': 1147,
  'Saint Petersburg|RU': 1703,
  'Velikiy Novgorod|RU': 859,
  'Kazan|RU': 1005,
  'Nizhniy Novgorod|RU': 1221,
  'Yaroslavl|RU': 1010,
  'Smolensk|RU': 863,
  'Volgograd|RU': 1589, // Tsaritsyn
  'Rostov|RU': 1749, // Rostov-on-Don
  'Astrakhan|RU': 1558,
  'Novosibirsk|RU': 1893,
  'Irkutsk|RU': 1661,
  'Vladivostok|RU': 1860,
  'Yakutsk|RU': 1632,
  // Africa
  'Cairo|EG': 969, // Memphis -3100 nearby
  'Alexandria|EG': -331,
  'Giza|EG': -2500,
  'Aswān|EG': -3000, // Swenett
  'Tunis|TN': -400, // near Carthage -814
  'Tripoli|LY': -700, // Oea
  'Algiers|DZ': -300, // Icosium
  'Fès|MA': 789,
  'Marrakech|MA': 1070,
  'Casablanca|MA': 768, // Anfa
  'Rabat|MA': 1146,
  'Khartoum|SD': 1821,
  'Addis Ababa|ET': 1886,
  'Asmara|ER': 800,
  'Mogadishu|SO': 900,
  'Nairobi|KE': 1899,
  'Mombasa|KE': 900,
  'Dar es Salaam|TZ': 1865,
  'Kampala|UG': 1890,
  'Kinshasa|CD': 1881,
  'Luanda|AO': 1576,
  'Lagos|NG': 1400,
  'Ibadan|NG': 1829,
  'Kano|NG': 700, // Dala Hill
  'Benin City|NG': 1180,
  'Accra|GH': 1500,
  'Dakar|SN': 1857,
  'Abidjan|CI': 1903,
  'Cape Town|ZA': 1652,
  'Johannesburg|ZA': 1886,
  'Durban|ZA': 1824,
  'Harare|ZW': 1890,
  'Lusaka|ZM': 1905,
  'Maputo|MZ': 1781,
  'Antananarivo|MG': 1610,
  // Americas
  'Mexico City|MX': 1325, // Tenochtitlan
  'Guadalajara|MX': 1542,
  'Puebla|MX': 1531,
  'Oaxaca|MX': 1532, // Monte Alban -500 nearby
  'Mérida|MX': 1542, // T'ho
  'Veracruz|MX': 1519,
  'Guatemala City|GT': 1776,
  'Havana|CU': 1519,
  'Santo Domingo|DO': 1496,
  'San Juan|PR': 1521,
  'Panama City|PA': 1519,
  'Bogotá|CO': 1538,
  'Cartagena|CO': 1533,
  'Quito|EC': 980, // Quitu
  'Lima|PE': 1535,
  'Cusco|PE': 1100,
  'Santiago|CL': 1541,
  'Buenos Aires|AR': 1536,
  'Córdoba|AR': 1573,
  'Montevideo|UY': 1724,
  'Asunción|PY': 1537,
  'La Paz|BO': 1548,
  'Rio de Janeiro|BR': 1565,
  'São Paulo|BR': 1554,
  'Salvador|BR': 1549,
  'Recife|BR': 1537,
  'Caracas|VE': 1567,
  'New York|US': 1624,
  'Boston|US': 1630,
  'Philadelphia|US': 1682,
  'Washington|US': 1790,
  'Chicago|US': 1780,
  'New Orleans|US': 1718,
  'St. Louis|US': 1764,
  'San Francisco|US': 1776,
  'Los Angeles|US': 1781,
  'San Diego|US': 1769,
  'Seattle|US': 1851,
  'Houston|US': 1836,
  'Miami|US': 1896,
  'Detroit|US': 1701,
  'Baltimore|US': 1729,
  'Pittsburgh|US': 1758,
  'Honolulu|US': 1100, // Polynesian settlement
  'Quebec City|CA': 1608,
  'Montréal|CA': 1642,
  'Toronto|CA': 1793,
  'Vancouver|CA': 1886,
  'Halifax|CA': 1749,
  // Oceania
  'Sydney|AU': 1788,
  'Melbourne|AU': 1835,
  'Brisbane|AU': 1824,
  'Perth|AU': 1829,
  'Adelaide|AU': 1836,
  'Canberra|AU': 1913,
  'Auckland|NZ': 1840,
  'Christchurch|NZ': 1850,
  'Port Moresby|PG': 1873,
};

/** Americas iso2 codes (North, Central, South, Caribbean). */
const AMERICAS = new Set([
  'US', 'CA', 'MX', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'DO', 'HT',
  'JM', 'TT', 'BS', 'BB', 'LC', 'VC', 'GD', 'AG', 'KN', 'DM', 'PR', 'AR', 'BO',
  'BR', 'CL', 'CO', 'EC', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE', 'GF', 'FK', 'AW',
  'CW', 'SX', 'BQ', 'MQ', 'GP', 'BM', 'KY', 'TC', 'VG', 'VI', 'AI', 'MS', 'GL',
  'PM',
]);

/** Australia / NZ / Oceania iso2 codes. */
const OCEANIA = new Set([
  'AU', 'NZ', 'PG', 'FJ', 'SB', 'VU', 'NC', 'PF', 'WS', 'TO', 'TV', 'KI', 'FM',
  'MH', 'PW', 'NR', 'CK', 'NU', 'TK', 'WF', 'GU', 'MP', 'AS', 'UM',
]);

/** Sub-Saharan Africa iso2 codes (Sahara belt / North Africa excluded). */
const SUB_SAHARAN = new Set([
  'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI',
  'DJ', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR',
  'MG', 'MW', 'ML', 'MR', 'MU', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC',
  'SL', 'SO', 'ZA', 'SS', 'TZ', 'TG', 'UG', 'ZM', 'ZW', 'RE', 'YT', 'SH',
]);

function defaultFounded(iso2: string): number {
  if (AMERICAS.has(iso2) || OCEANIA.has(iso2)) return 1750;
  if (SUB_SAHARAN.has(iso2)) return 1600;
  return 1200; // Europe / Asia / North Africa / Middle East
}

export const cities: City[] = (rawCities as [string, number, number, number, string][]).map(
  ([name, lat, lng, pop, country]) => ({
    name,
    lat,
    lng,
    pop,
    country,
    founded: FOUNDED[`${name}|${country}`] ?? defaultFounded(country),
  }),
);

const EARTH_RADIUS_KM = 6371;

/** Great-circle (haversine) distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** All cities within radiusKm of (lat, lng). */
export function citiesWithin(lat: number, lng: number, radiusKm: number): City[] {
  return cities.filter((c) => haversineKm(lat, lng, c.lat, c.lng) <= radiusKm);
}
