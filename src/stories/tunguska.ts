import { eventById } from '../data/events';
import { simulate } from '../physics';
import type { ImpactorType, Scenario, SimulationResult } from '../types';
import type { ObserverLocation } from '../physics/observer';

export const STORY_MODEL = 'impact-earth-1.0.0/story-1';
export const STORY_SOURCES = [
  { label: 'NASA: the 1908 event', url: 'https://www.nasa.gov/history/115-years-ago-the-tunguska-asteroid-impact-event/' },
  { label: 'NASA: reconstructing Tunguska', url: 'https://www.nasa.gov/solar-system/tunguska-revisited-111-year-old-mystery-impact-inspires-new-more-optimistic-asteroid-predictions/' },
];
export const MATERIALS: { value: ImpactorType; label: string; description: string }[] = [
  { value: 'stony', label: 'Stone', description: 'The catalog baseline' },
  { value: 'iron', label: 'Iron', description: 'Denser and stronger' },
  { value: 'carbonaceous', label: 'Carbon-rich', description: 'Lower density' },
  { value: 'comet', label: 'Comet-like', description: 'Low-density material' },
];
export function tunguskaScenario(material: ImpactorType = 'stony'): Scenario {
  const event = eventById('tunguska')!;
  if (event.params.kind !== 'impact') throw new Error('Tunguska requires impact parameters');
  return { lat: event.lat, lng: event.lng, year: event.year, placeName: event.placeName, params: { ...event.params, impactorType: material } };
}
export function storyObserver(distanceKm: number): ObserverLocation {
  const source = tunguskaScenario();
  return { name: `Experiment point: ${distanceKm} km south`, lat: source.lat - distanceKm / 6371 * 180 / Math.PI, lng: source.lng };
}
export interface StorySummary {
  airburst: boolean;
  energyMt: number;
  altitudeKm: number;
  craterKm: number;
  outerRadiusKm: number;
}
export function summarize(result: SimulationResult): StorySummary {
  return { airburst: !!result.airburst, energyMt: result.energyMt, altitudeKm: result.burstAltitudeKm ?? 0, craterKm: result.craterFinalKm ?? 0, outerRadiusKm: Math.max(0, ...result.zones.map(z => z.radiusKm)) };
}
export const BASELINE_SCENARIO = tunguskaScenario();
export const BASELINE_RESULT = simulate(BASELINE_SCENARIO.params);
