// Historical demography model: world population, regional shares, urbanization
// and GDP per capita from 10,000 BC to 2500 AD. Sources: McEvedy & Jones (1978),
// HYDE 3.2, UN World Population Prospects 2024 (medium variant to 2100), and the
// Maddison Project for GDP. Values beyond 2100 are speculative extrapolations,
// flagged as such in the UI. All years are astronomical (year -2499 = 2500 BC).

export type RegionId =
  | 'europe'
  | 'mena'
  | 'ssafrica'
  | 'sasia'
  | 'easia'
  | 'seasia'
  | 'casia'
  | 'namerica'
  | 'latam'
  | 'oceania';

export const ERA_MIN_YEAR = -10000;
export const ERA_MAX_YEAR = 2500;
export const PRESENT_YEAR = 2026;

/** [year, world population] anchors, interpolated piecewise-linearly. */
const WORLD_POP: [number, number][] = [
  [-10000, 4e6],
  [-5000, 20e6],
  [-3000, 45e6],
  [-2000, 72e6],
  [-1000, 110e6],
  [-500, 150e6],
  [0, 230e6],
  [500, 240e6],
  [1000, 275e6],
  [1340, 443e6],
  [1400, 375e6], // Black Death
  [1500, 460e6],
  [1600, 550e6],
  [1700, 640e6],
  [1800, 990e6],
  [1850, 1.26e9],
  [1900, 1.65e9],
  [1950, 2.53e9],
  [1970, 3.7e9],
  [1990, 5.32e9],
  [2000, 6.14e9],
  [2010, 6.96e9],
  [2026, 8.2e9],
  [2050, 9.7e9],
  [2100, 10.4e9],
  [2200, 10.2e9],
  [2500, 9.5e9],
];

function interp(table: [number, number][], year: number): number {
  const y = Math.max(table[0][0], Math.min(table[table.length - 1][0], year));
  for (let i = 0; i < table.length - 1; i++) {
    const [y0, v0] = table[i];
    const [y1, v1] = table[i + 1];
    if (y <= y1) return v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
  }
  return table[table.length - 1][1];
}

export const worldPopulation = (year: number) => interp(WORLD_POP, year);

/** Fraction of population living in cities. */
const URBAN_FRACTION: [number, number][] = [
  [-10000, 0.0],
  [-3000, 0.02],
  [0, 0.05],
  [1000, 0.04],
  [1500, 0.05],
  [1800, 0.07],
  [1900, 0.16],
  [1950, 0.3],
  [2000, 0.47],
  [2026, 0.58],
  [2100, 0.7],
  [2500, 0.8],
];
export const urbanFraction = (year: number) => interp(URBAN_FRACTION, year);

/** World mean GDP per capita in 2026 USD. */
const GDP_PC: [number, number][] = [
  [-10000, 600],
  [0, 850],
  [1000, 850],
  [1500, 1000],
  [1800, 1250],
  [1900, 2700],
  [1950, 4600],
  [2000, 12000],
  [2026, 14000],
  [2100, 30000],
  [2500, 80000],
];
export const gdpPerCapita = (year: number) => interp(GDP_PC, year);

/** Capital stock (buildings, infrastructure) per capita ≈ 3.5 years of output. */
export const capitalPerCapita = (year: number) => 3.5 * gdpPerCapita(year);

// Regional population shares over time (columns are SHARE_YEARS). Rough but
// directionally faithful: antiquity concentrates people in the river valleys of
// the Old World; the Americas/Oceania hold few people until the modern era;
// Sub-Saharan Africa's share surges in the 21st century.
const SHARE_YEARS = [-10000, -3000, -1000, 0, 1000, 1500, 1800, 1900, 1950, 2000, 2026, 2100];
const SHARES: Record<RegionId, number[]> = {
  europe:   [0.08, 0.07, 0.09, 0.14, 0.14, 0.17, 0.19, 0.25, 0.22, 0.12, 0.09, 0.06],
  mena:     [0.12, 0.20, 0.15, 0.13, 0.10, 0.07, 0.06, 0.05, 0.05, 0.06, 0.07, 0.08],
  ssafrica: [0.10, 0.07, 0.07, 0.05, 0.07, 0.08, 0.07, 0.06, 0.07, 0.10, 0.15, 0.30],
  sasia:    [0.15, 0.25, 0.25, 0.30, 0.28, 0.24, 0.23, 0.19, 0.18, 0.22, 0.24, 0.20],
  easia:    [0.15, 0.20, 0.25, 0.26, 0.26, 0.28, 0.35, 0.28, 0.26, 0.24, 0.20, 0.12],
  seasia:   [0.05, 0.04, 0.04, 0.03, 0.04, 0.04, 0.04, 0.05, 0.07, 0.08, 0.08, 0.08],
  casia:    [0.05, 0.04, 0.04, 0.02, 0.03, 0.04, 0.03, 0.06, 0.07, 0.05, 0.04, 0.03],
  namerica: [0.02, 0.01, 0.015, 0.015, 0.02, 0.015, 0.01, 0.05, 0.07, 0.05, 0.05, 0.05],
  latam:    [0.03, 0.02, 0.025, 0.035, 0.05, 0.065, 0.02, 0.05, 0.065, 0.085, 0.08, 0.07],
  oceania:  [0.01, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.01],
};

/** Region share of world population at a year (normalized across regions). */
export function regionShare(region: RegionId, year: number): number {
  const y = Math.max(SHARE_YEARS[0], Math.min(SHARE_YEARS[SHARE_YEARS.length - 1], year));
  let i = 0;
  while (i < SHARE_YEARS.length - 2 && y > SHARE_YEARS[i + 1]) i++;
  const t = (y - SHARE_YEARS[i]) / (SHARE_YEARS[i + 1] - SHARE_YEARS[i]);
  const raw = (r: RegionId) => {
    const row = SHARES[r];
    return row[i] + Math.max(0, Math.min(1, t)) * (row[i + 1] - row[i]);
  };
  const total = (Object.keys(SHARES) as RegionId[]).reduce((s, r) => s + raw(r), 0);
  return raw(region) / total;
}

/** Coarse region assignment from coordinates. */
export function regionOf(lat: number, lng: number): RegionId {
  if (lng >= -170 && lng < -30) return lat >= 20 ? 'namerica' : 'latam';
  if (lng >= -30 && lng < 62) {
    if (lat >= 42) return lng > 45 ? 'casia' : 'europe';
    if (lat >= 34 && lng < 45) return 'europe';
    if (lat >= 8) return 'mena';
    return 'ssafrica';
  }
  if (lng >= 62 && lng < 95) {
    if (lat >= 45) return 'casia';
    if (lat >= 5) return 'sasia';
    return 'oceania';
  }
  // lng 95..180
  if (lat >= 50) return 'casia';
  if (lat >= 21) return 'easia';
  if (lat >= -11) return 'seasia';
  return 'oceania';
}

/**
 * Multiplier converting a cell's PRESENT population into its population at
 * `year`: world growth × the region's changing share of the world.
 */
export function eraCellFactor(lat: number, lng: number, year: number): number {
  const region = regionOf(lat, lng);
  const growth = worldPopulation(year) / worldPopulation(PRESENT_YEAR);
  const shareShift = regionShare(region, year) / regionShare(region, PRESENT_YEAR);
  return growth * shareShift;
}

/** Multiplier converting a city's PRESENT population into its population at `year`. */
export function eraCityFactor(lat: number, lng: number, year: number, foundedYear: number): number {
  if (year < foundedYear) return 0;
  const urbShift = urbanFraction(year) / urbanFraction(PRESENT_YEAR);
  return eraCellFactor(lat, lng, year) * Math.max(urbShift, 0.02);
}

export function formatYear(year: number): string {
  if (year <= 0) return `${Math.abs(year - 1).toLocaleString('en-US')} BC`;
  return `${year} AD`;
}
