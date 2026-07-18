// Explosive caldera eruption model, parameterized by bulk tephra volume (km³).
// VEI per Newhall & Self (1982). Effect scaling calibrated against Krakatoa 1883
// (~20 km³, VEI 6), Tambora 1815 (~100 km³ bulk, VEI 7), Mazama/Crater Lake
// (~120 km³, VEI 7), Toba (~2800 km³, VEI 8), Yellowstone Lava Creek (~1000 km³, VEI 8).

import type { EffectZone, EruptionParams, SimulationResult } from '../types';
import { globalEffectsForEruption } from './globalEffects';
import { MT_TNT_J } from './impact';

export function veiForVolume(bulkVolumeKm3: number): number {
  if (bulkVolumeKm3 >= 1000) return 8;
  if (bulkVolumeKm3 >= 100) return 7;
  if (bulkVolumeKm3 >= 10) return 6;
  if (bulkVolumeKm3 >= 1) return 5;
  if (bulkVolumeKm3 >= 0.1) return 4;
  return 3;
}

export function simulateEruption(params: EruptionParams): SimulationResult {
  const v = Math.max(params.bulkVolumeKm3, 0.01);
  const vei = veiForVolume(v);

  // Thermal energy of erupted magma: bulk→DRE ≈ 0.4, ρ ≈ 2500 kg/m³,
  // ~1 MJ/kg usable (heat + mechanical); only ~a few % is explosive yield.
  const dreKm3 = v * 0.4;
  const energyJ = dreKm3 * 1e9 * 2500 * 1e6; // J (thermal); ~2.4e18 J per km³ DRE
  const energyMt = energyJ / MT_TNT_J;

  // Caldera collapse diameter: ~sqrt scaling; Mazama (120 km³) → ~10 km,
  // Yellowstone (1000) → ~50 km (Lava Creek caldera 45×85 km), Tambora → 6-7 km.
  const calderaKm = Math.min(90, 1.0 * Math.pow(v, 0.55));

  // Pyroclastic density current reach: Krakatoa ~40 km (over sea), Taupō 232 AD ~80 km
  // (30 km³!, exceptional), Yellowstone ignimbrite ~100+ km.
  const pdcKm = Math.min(180, 9 * Math.cbrt(v));

  // Exponential ashfall thinning, circularized: V = 2π T0 r0², r0 = 18·v^(1/3) km.
  const r0 = 18 * Math.cbrt(v); // km
  const t0M = (v / (2 * Math.PI * r0 * r0)) * 1000; // km→m thickness at vent
  const ashRadius = (thicknessM: number) =>
    t0M > thicknessM ? r0 * Math.log(t0M / thicknessM) : 0;

  const zones: EffectZone[] = [];
  zones.push({
    id: 'caldera',
    label: 'Caldera collapse',
    radiusKm: calderaKm / 2,
    lethality: 1,
    category: 'caldera',
    color: '#3b0a0a',
    description: `The ground itself founders into the emptied magma chamber, leaving a ${calderaKm.toFixed(0)} km caldera.`,
  });
  zones.push({
    id: 'pdc',
    label: 'Pyroclastic flows',
    radiusKm: pdcKm,
    lethality: 0.98,
    category: 'pdc',
    color: '#ff5a00',
    description: 'Ground-hugging avalanches of gas and rock at 700 °C moving 100+ km/h. Unsurvivable.',
  });
  const ashRings: [string, string, number, number, string][] = [
    ['ash1m', 'Ashfall ≥ 1 m', 1, 0.1, 'Roofs collapse under ash load; infrastructure buried; region uninhabitable for years.'],
    ['ash10cm', 'Ashfall ≥ 10 cm', 0.1, 0.005, 'Widespread roof damage, destroyed crops, undrivable roads, poisoned water.'],
    ['ash1cm', 'Ashfall ≥ 1 cm', 0.01, 0.0002, 'Grounded aviation, respiratory illness, a gray film over everything.'],
  ];
  for (const [id, label, tM, lethality, desc] of ashRings) {
    const rKm = ashRadius(tM);
    if (rKm > pdcKm) {
      zones.push({ id, label, radiusKm: rKm, lethality, category: 'ash', color: id === 'ash1m' ? '#6b6560' : id === 'ash10cm' ? '#8f887f' : '#b5ada1', description: desc });
    }
  }

  return {
    kind: 'eruption',
    energyJ,
    energyMt,
    vei,
    zones: zones.sort((a, b) => a.radiusKm - b.radiusKm),
    global: globalEffectsForEruption(v),
    comparisons: [
      `VEI ${vei} — ${vei >= 8 ? 'super-eruption' : vei === 7 ? 'colossal' : vei === 6 ? 'Krakatoa-class' : 'major eruption'}`,
      `${v.toFixed(0)} km³ of rock ejected — enough to bury Manhattan ${Math.max(1, Math.round((v * 1e9) / 5.9e7)).toLocaleString('en-US')} m deep`,
    ],
  };
}
