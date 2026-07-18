import type { ScenarioParams, SimulationResult } from '../types';
import { simulateImpact } from './impact';
import { simulateEruption } from './caldera';

export function simulate(params: ScenarioParams): SimulationResult {
  return params.kind === 'impact' ? simulateImpact(params) : simulateEruption(params);
}

export { simulateImpact, simulateEruption };
