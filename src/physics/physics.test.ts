// Validation against published values for famous events.
import { describe, expect, it } from 'vitest';
import { simulateImpact } from './impact';
import { simulateEruption, veiForVolume } from './caldera';
import type { ImpactParams } from '../types';

const impact = (p: Partial<ImpactParams>): ImpactParams => ({
  kind: 'impact',
  diameterM: 100,
  impactorType: 'stony',
  velocityKmS: 17,
  angleDeg: 45,
  target: 'land',
  oceanDepthM: 3600,
  ...p,
});

describe('atmospheric entry', () => {
  it('Chelyabinsk: ~19 m stony at 19 km/s → ~0.5 Mt airburst at 25–40 km', () => {
    const r = simulateImpact(impact({ diameterM: 19, velocityKmS: 19, angleDeg: 18, impactorType: 'stony' }));
    expect(r.airburst).toBe(true);
    expect(r.burstAltitudeKm!).toBeGreaterThan(20);
    expect(r.burstAltitudeKm!).toBeLessThan(45);
    expect(r.energyMt).toBeGreaterThan(0.3);
    expect(r.energyMt).toBeLessThan(0.8);
  });

  it('Tunguska: ~55 m stony at 15 km/s → 5–20 Mt airburst below 15 km', () => {
    const r = simulateImpact(impact({ diameterM: 55, velocityKmS: 15, angleDeg: 35 }));
    expect(r.airburst).toBe(true);
    expect(r.burstAltitudeKm!).toBeGreaterThan(3);
    expect(r.burstAltitudeKm!).toBeLessThan(15);
    expect(r.energyMt).toBeGreaterThan(4);
    expect(r.energyMt).toBeLessThan(20);
    // Devastation ring (5 psi) should be tens of km, like the ~2150 km² blowdown.
    const blast5 = r.zones.find((z) => z.id === 'blast5')!;
    expect(blast5.radiusKm).toBeGreaterThan(10);
    expect(blast5.radiusKm).toBeLessThan(60);
  });

  it('Barringer: 50 m iron at 13 km/s reaches the ground → ~1.2 km crater', () => {
    const r = simulateImpact(impact({ diameterM: 50, impactorType: 'iron', velocityKmS: 13, angleDeg: 45 }));
    expect(r.airburst).toBe(false);
    expect(r.craterFinalKm!).toBeGreaterThan(0.8);
    expect(r.craterFinalKm!).toBeLessThan(1.8);
  });
});

describe('crater scaling', () => {
  it('Chicxulub: 14 km stony at 20 km/s → ~150–200 km final crater, ~1e8 Mt, M>10 quake', () => {
    const r = simulateImpact(impact({ diameterM: 14000, velocityKmS: 20, angleDeg: 60 }));
    expect(r.airburst).toBe(false);
    expect(r.craterFinalKm!).toBeGreaterThan(140);
    expect(r.craterFinalKm!).toBeLessThan(210);
    expect(r.energyMt).toBeGreaterThan(5e7);
    expect(r.energyMt).toBeLessThan(5e8);
    expect(r.seismicMagnitude!).toBeGreaterThan(10);
    expect(r.global.severity).toBe('mass-extinction');
  });

  it('small stony bodies airburst, large ones crater', () => {
    expect(simulateImpact(impact({ diameterM: 30 })).airburst).toBe(true);
    expect(simulateImpact(impact({ diameterM: 300 })).airburst).toBe(false);
  });

  it('ocean impact produces a tsunami result', () => {
    const r = simulateImpact(impact({ diameterM: 1000, target: 'ocean' }));
    expect(r.tsunami).toBeDefined();
    expect(r.tsunami!.amplitudeAtKm[0].meters).toBeGreaterThan(10);
  });
});

describe('eruptions', () => {
  it('VEI classification', () => {
    expect(veiForVolume(20)).toBe(6); // Krakatoa
    expect(veiForVolume(120)).toBe(7); // Mazama
    expect(veiForVolume(2800)).toBe(8); // Toba
  });

  it('Tambora-class VEI 7 → ~0.5–1.5 °C cooling', () => {
    const r = simulateEruption({ kind: 'eruption', bulkVolumeKm3: 100 });
    expect(r.vei).toBe(7);
    expect(r.global.coolingC).toBeGreaterThan(0.4);
    expect(r.global.coolingC).toBeLessThan(1.6);
  });

  it('Toba-class VEI 8 → 3–6 °C volcanic winter with major famine risk', () => {
    const r = simulateEruption({ kind: 'eruption', bulkVolumeKm3: 2800 });
    expect(r.global.coolingC).toBeGreaterThan(3);
    expect(r.global.famineFraction).toBeGreaterThan(0.02);
    const pdc = r.zones.find((z) => z.category === 'pdc')!;
    expect(pdc.radiusKm).toBeGreaterThan(60);
  });

  it('zones are sorted innermost to outermost', () => {
    const r = simulateEruption({ kind: 'eruption', bulkVolumeKm3: 500 });
    const radii = r.zones.map((z) => z.radiusKm);
    expect([...radii].sort((a, b) => a - b)).toEqual(radii);
  });
});
