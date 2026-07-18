// Global climate consequences of very large impacts and eruptions.
// Calibration points: Chicxulub (~1e8 Mt) → mass extinction, impact winter of
// years (Toon et al. 1997; Brugger et al. 2017 model ~26 °C peak cooling);
// Toba VEI 8 → 3–5 °C multi-year cooling; Tambora 1815 (VEI 7) → ~0.5–1 °C,
// "Year Without a Summer"; Pinatubo 1991 (VEI 6) → ~0.5 °C for a year.

import type { GlobalEffects } from '../types';

/** Global effects from impact energy (megatons TNT). */
export function globalEffectsForEnergy(energyMt: number): GlobalEffects {
  if (energyMt < 1e4) {
    return { severity: 'none', coolingC: 0, famineFraction: 0, description: 'Effects remain regional; no measurable global climate impact.' };
  }
  if (energyMt < 1e6) {
    return {
      severity: 'regional',
      coolingC: 0.1,
      famineFraction: 0,
      description: 'Dust briefly hazes the stratosphere; spectacular sunsets, negligible climate shift.',
    };
  }
  if (energyMt < 1e7) {
    const t = (Math.log10(energyMt) - 6) / 1; // 0..1 across 1e6–1e7
    const cooling = 1 + 4 * t;
    return {
      severity: 'continental',
      coolingC: cooling,
      famineFraction: 0.002 + 0.028 * t,
      description: `Sub-continental devastation and ~${cooling.toFixed(1)} °C global cooling for several years. Harvests fail across whole latitude bands.`,
    };
  }
  if (energyMt < 5e7) {
    const t = (Math.log10(energyMt) - 7) / Math.log10(5); // 0..1 across 1e7–5e7
    const cooling = 5 + 10 * t;
    return {
      severity: 'global-winter',
      coolingC: cooling,
      famineFraction: 0.15 + 0.35 * t,
      description: `Impact winter: soot and dust cut sunlight for years, ~${cooling.toFixed(0)} °C cooling. Global agriculture collapses; civilization-threatening famine.`,
    };
  }
  return {
    severity: 'mass-extinction',
    coolingC: 20,
    famineFraction: 0.9,
    description:
      'Chicxulub-class catastrophe. Global firestorms, years of darkness, ~20 °C+ cooling, ocean food-chain collapse. A mass-extinction boundary event — the end of the world as any species knows it.',
  };
}

/** Global effects from eruption size (bulk tephra volume, km³) and stratospheric sulfur. */
export function globalEffectsForEruption(bulkVolumeKm3: number): GlobalEffects {
  const coolingCal = calibratedCooling(Math.max(bulkVolumeKm3, 0.01));
  const famine = famineFractionForCooling(coolingCal);
  let severity: GlobalEffects['severity'] = 'none';
  if (coolingCal >= 3) severity = 'global-winter';
  else if (coolingCal >= 0.8) severity = 'continental';
  else if (coolingCal >= 0.2) severity = 'regional';
  return {
    severity,
    coolingC: coolingCal,
    famineFraction: famine,
    description: describeVolcanicWinter(coolingCal),
  };
}

function calibratedCooling(bulkVolumeKm3: number): number {
  // Piecewise log-interpolation through (10 km³, 0.4 °C), (100, 0.8), (500, 2), (1000, 3.5), (3000, 5).
  const pts: [number, number][] = [
    [1, 0.1],
    [10, 0.4],
    [100, 0.8],
    [500, 2.0],
    [1000, 3.5],
    [3000, 5.0],
  ];
  const lv = Math.log10(Math.max(bulkVolumeKm3, 1));
  for (let i = 0; i < pts.length - 1; i++) {
    const [v0, c0] = pts[i];
    const [v1, c1] = pts[i + 1];
    if (lv <= Math.log10(v1)) {
      const t = (lv - Math.log10(v0)) / (Math.log10(v1) - Math.log10(v0));
      return c0 + Math.max(0, Math.min(1, t)) * (c1 - c0);
    }
  }
  return 5.0;
}

/** Excess famine mortality as a fraction of world population, from multi-year cooling. */
export function famineFractionForCooling(coolingC: number): number {
  // Calibration: Tambora (~0.6 °C, 1815, ~1e9 people) → order 1e5–1e6 excess deaths ≈ 0.03–0.1 %.
  // A VEI-8 (~3.5 °C) today is credibly estimated to threaten 1e8–1e9 via food-system collapse ≈ 5–15 %.
  if (coolingC <= 0.2) return 0;
  return Math.min(0.5, 0.001 * Math.pow(coolingC / 0.6, 2.2));
}

function describeVolcanicWinter(coolingC: number): string {
  if (coolingC < 0.2) return 'No significant global climate effect.';
  if (coolingC < 0.8)
    return `Stratospheric sulfate veil cools the globe ~${coolingC.toFixed(1)} °C for 1–3 years — vivid sunsets, patchy harvest failures (Pinatubo-class).`;
  if (coolingC < 3)
    return `A "Year Without a Summer": ~${coolingC.toFixed(1)} °C cooling, frosts in summer, failed harvests and food riots on multiple continents (Tambora-class).`;
  return `Volcanic winter: ~${coolingC.toFixed(1)} °C global cooling sustained for up to a decade. Growing seasons collapse worldwide; a genuine civilizational stress test (Toba-class).`;
}
