import { create } from 'zustand';
import type { Scenario } from '../types';
import { parseScenario } from '../lab/scenarios';
export const useLab = create<{ baseline: Scenario | null; pin(scenario: Scenario): void; clear(): void }>(set => ({
  baseline: null,
  pin: scenario => set({ baseline: parseScenario(scenario) }),
  clear: () => set({ baseline: null }),
}));
