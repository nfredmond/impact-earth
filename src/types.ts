// Shared domain types for Impact Earth.

export type ImpactorType = 'comet' | 'carbonaceous' | 'stony' | 'iron';

export const IMPACTOR_DENSITY: Record<ImpactorType, number> = {
  comet: 600,
  carbonaceous: 1500,
  stony: 3000,
  iron: 7860,
};

export type TargetType = 'land' | 'ocean';

/** Parameters describing an asteroid/comet impact scenario. */
export interface ImpactParams {
  kind: 'impact';
  /** Impactor diameter in meters. */
  diameterM: number;
  /** Impactor composition (sets density). */
  impactorType: ImpactorType;
  /** Entry velocity in km/s (11–72). */
  velocityKmS: number;
  /** Entry angle from horizontal in degrees (5–90). */
  angleDeg: number;
  /** Target surface. */
  target: TargetType;
  /** Ocean depth in meters (used when target === 'ocean'). */
  oceanDepthM: number;
}

/** Parameters describing a caldera / explosive eruption scenario. */
export interface EruptionParams {
  kind: 'eruption';
  /** Bulk tephra volume in km³ (drives VEI). */
  bulkVolumeKm3: number;
}

export type ScenarioParams = ImpactParams | EruptionParams;

export type ZoneCategory =
  | 'crater'
  | 'fireball'
  | 'blast'
  | 'thermal'
  | 'seismic'
  | 'ejecta'
  | 'tsunami'
  | 'pdc'
  | 'ash'
  | 'caldera';

/** One circular damage zone centred on ground zero. */
export interface EffectZone {
  id: string;
  label: string;
  radiusKm: number;
  /** Fraction of people inside this zone (but outside deadlier inner zones) who die. */
  lethality: number;
  category: ZoneCategory;
  color: string;
  description: string;
}

export type GlobalSeverity =
  | 'none'
  | 'regional'
  | 'continental'
  | 'global-winter'
  | 'mass-extinction';

export interface GlobalEffects {
  severity: GlobalSeverity;
  /** Peak global mean cooling in °C. */
  coolingC: number;
  /** Fraction of world population (outside direct-effect zones) dying of famine/collapse. */
  famineFraction: number;
  description: string;
}

export interface TsunamiResult {
  /** Deep-water wave amplitude at listed ranges (km → meters). */
  amplitudeAtKm: { km: number; meters: number }[];
  /** Rough coastal run-up multiplier applied for exposure calc. */
  runupFactor: number;
  description: string;
}

export interface SimulationResult {
  kind: 'impact' | 'eruption';
  energyJ: number;
  energyMt: number;
  massKg?: number;
  /** True if the bolide detonated in the atmosphere. */
  airburst?: boolean;
  burstAltitudeKm?: number;
  /** Velocity at surface (or burst) in km/s. */
  finalVelocityKmS?: number;
  craterFinalKm?: number;
  craterTransientKm?: number;
  craterDepthKm?: number;
  seismicMagnitude?: number;
  vei?: number;
  /** Sorted innermost→outermost. */
  zones: EffectZone[];
  global: GlobalEffects;
  tsunami?: TsunamiResult;
  /** Interesting derived comparisons ("X Hiroshimas"). */
  comparisons: string[];
}

/** A full scenario = physics params + a place + a year. */
export interface Scenario {
  params: ScenarioParams;
  lat: number;
  lng: number;
  /** Astronomical year (negative = BC; -2499 corresponds to 2500 BC). */
  year: number;
  /** Display name of the location. */
  placeName: string;
}

export interface CityLoss {
  name: string;
  country: string;
  lat: number;
  lng: number;
  /** Estimated population at scenario year. */
  popAtYear: number;
  /** Estimated deaths in that city. */
  deaths: number;
  zoneLabel: string;
}

export interface HumanImpact {
  year: number;
  worldPop: number;
  /** Direct deaths from physical effect zones. */
  directDeaths: number;
  /** Famine / global-winter deaths beyond the zones. */
  famineDeaths: number;
  totalDeaths: number;
  injured: number;
  citiesLost: CityLoss[];
  /** Total population living inside the outermost zone. */
  populationExposed: number;
  /** Economic loss in 2026 USD. */
  econLossUsd: number;
  /** Loss as a share of gross world product of that era. */
  econLossShareOfGwp: number;
  notes: string[];
}

export interface HistoricalEvent {
  id: string;
  name: string;
  /** e.g. "66 million years ago", "June 30, 1908" */
  when: string;
  /** Astronomical year for the "actual" scenario (clamped to the era model range). */
  year: number;
  lat: number;
  lng: number;
  placeName: string;
  params: ScenarioParams;
  /** Short dramatic summary of what actually happened. */
  blurb: string;
  /** Longer facts, shown in detail panel / report. */
  facts: string[];
  category: 'impact' | 'airburst' | 'eruption' | 'whatif';
}
