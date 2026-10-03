import type { Scenario, SimulationResult } from '../types';
import { simulate } from '../physics';
export type SensitivityInput = 'diameterM' | 'velocityKmS' | 'angleDeg' | 'bulkVolumeKm3';
export const INPUTS = {
  diameterM: { label: 'Diameter', unit: 'm', min: 10, max: 25000 },
  velocityKmS: { label: 'Entry speed', unit: 'km/s', min: 11, max: 72 },
  angleDeg: { label: 'Entry angle', unit: '°', min: 5, max: 90 },
  bulkVolumeKm3: { label: 'Erupted volume', unit: 'km³', min: .1, max: 5000 },
};
export interface SensitivityRow { value: number; scenario: Scenario; result: SimulationResult }
export function sweep(scenario: Scenario, key: SensitivityInput, percent: number): SensitivityRow[] {
  if (!Number.isFinite(percent) || percent <= 0 || percent > 50) throw new Error('Choose a spread greater than zero and at most 50 percent.');
  if ((scenario.params.kind === 'eruption') !== (key === 'bulkVolumeKm3')) throw new Error('This input does not apply to the scenario.');
  const value = scenario.params.kind === 'eruption' ? scenario.params.bulkVolumeKm3 : scenario.params[key as 'diameterM' | 'velocityKmS' | 'angleDeg'];
  const bounds = INPUTS[key];
  return [-1, 0, 1].map(step => {
    const next = Math.max(bounds.min, Math.min(bounds.max, value * (1 + step * percent / 100)));
    const changed: Scenario = { ...scenario, params: { ...scenario.params, [key]: next } };
    return { value: next, scenario: changed, result: simulate(changed.params) };
  });
}
