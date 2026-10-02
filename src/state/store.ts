import { create } from 'zustand';
import type { HumanImpact, Scenario, ScenarioParams, SimulationResult } from '../types';
import { simulate } from '../physics';
import { computeHumanImpact } from '../casualties/casualties';
import { loadPopGrid, type PopGrid } from '../data/popgrid';
import { EVENTS, eventById } from '../data/events';
import { PRESENT_YEAR } from '../casualties/eras';

export interface AppState {
  scenario: Scenario;
  /** Selected historical event id, or null for a custom scenario. */
  eventId: string | null;
  result: SimulationResult;
  grid: PopGrid | null;
  impact: HumanImpact | null;
  /** Extra years pinned for comparison (scenario.year is always shown first). */
  compareYears: number[];
  compareImpacts: HumanImpact[];
  /** Bumped to replay the cinematic. */
  animationNonce: number;
  /** When true, the next globe click sets ground zero. */
  placing: boolean;

  selectEvent(id: string): void;
  setParams(patch: Partial<ScenarioParams>): void;
  setLocation(lat: number, lng: number, placeName?: string): void;
  setYear(year: number): void;
  toggleCompareYear(year: number): void;
  setPlacing(placing: boolean): void;
  replay(): void;
  newCustom(kind: 'impact' | 'eruption'): void;
  loadScenario(scenario: Scenario, eventId: string | null, compareYears?: number[]): void;
}

const first = eventById('chicxulub') ?? EVENTS[0];

const initialScenario: Scenario = {
  params: { ...first.params },
  lat: first.lat,
  lng: first.lng,
  year: first.year,
  placeName: first.placeName,
};

function recompute(state: Pick<AppState, 'scenario' | 'grid' | 'compareYears'>) {
  const result = simulate(state.scenario.params);
  const impact = state.grid
    ? computeHumanImpact(result, state.scenario.lat, state.scenario.lng, state.scenario.year, state.grid)
    : null;
  const compareImpacts = state.grid
    ? state.compareYears.map((y) =>
        computeHumanImpact(result, state.scenario.lat, state.scenario.lng, y, state.grid!),
      )
    : [];
  return { result, impact, compareImpacts };
}

export const useStore = create<AppState>((set, get) => {
  // Kick off the population grid load immediately.
  loadPopGrid()
    .then((grid) => {
      const s = get();
      set({ grid, ...recompute({ scenario: s.scenario, grid, compareYears: s.compareYears }) });
    })
    .catch((err) => console.error('popgrid load failed', err));

  return {
    scenario: initialScenario,
    eventId: first.id,
    result: simulate(initialScenario.params),
    grid: null,
    impact: null,
    compareYears: [],
    compareImpacts: [],
    animationNonce: 0,
    placing: false,

    loadScenario(input, eventId, compareYears = []) {
      const scenario = { ...input, params: { ...input.params } };
      set({ scenario, eventId, compareYears, placing: false, ...recompute({ scenario, grid: get().grid, compareYears }) });
    },

    selectEvent(id) {
      const ev = eventById(id);
      if (!ev) return;
      const scenario: Scenario = {
        params: { ...ev.params },
        lat: ev.lat,
        lng: ev.lng,
        year: ev.year,
        placeName: ev.placeName,
      };
      const s = get();
      set({
        eventId: id,
        scenario,
        placing: false,
        animationNonce: s.animationNonce + 1,
        ...recompute({ scenario, grid: s.grid, compareYears: s.compareYears }),
      });
    },

    setParams(patch) {
      const s = get();
      const scenario: Scenario = {
        ...s.scenario,
        params: { ...s.scenario.params, ...patch } as ScenarioParams,
      };
      set({ scenario, ...recompute({ scenario, grid: s.grid, compareYears: s.compareYears }) });
    },

    setLocation(lat, lng, placeName) {
      const s = get();
      const scenario: Scenario = {
        ...s.scenario,
        lat,
        lng,
        placeName: placeName ?? `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
      };
      set({
        scenario,
        placing: false,
        animationNonce: s.animationNonce + 1,
        ...recompute({ scenario, grid: s.grid, compareYears: s.compareYears }),
      });
    },

    setYear(year) {
      const s = get();
      const scenario: Scenario = { ...s.scenario, year };
      set({ scenario, ...recompute({ scenario, grid: s.grid, compareYears: s.compareYears }) });
    },

    toggleCompareYear(year) {
      const s = get();
      const has = s.compareYears.includes(year);
      const compareYears = has
        ? s.compareYears.filter((y) => y !== year)
        : [...s.compareYears, year].slice(-3);
      set({ compareYears, ...recompute({ scenario: s.scenario, grid: s.grid, compareYears }) });
    },

    setPlacing(placing) {
      set({ placing });
    },

    replay() {
      set({ animationNonce: get().animationNonce + 1 });
    },

    newCustom(kind) {
      const s = get();
      const params: ScenarioParams =
        kind === 'impact'
          ? { kind: 'impact', diameterM: 500, impactorType: 'stony', velocityKmS: 17, angleDeg: 45, target: 'land', oceanDepthM: 3600 }
          : { kind: 'eruption', bulkVolumeKm3: 100 };
      const scenario: Scenario = { ...s.scenario, params, year: PRESENT_YEAR };
      set({
        eventId: null,
        scenario,
        placing: true,
        ...recompute({ scenario, grid: s.grid, compareYears: s.compareYears }),
      });
    },
  };
});
