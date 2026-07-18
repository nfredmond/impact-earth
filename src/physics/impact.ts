// Impact physics following Collins, Melosh & Marcus (2005),
// "Earth Impact Effects Program: A Web-based computer program for calculating
// the regional environmental consequences of a meteoroid impact on Earth",
// Meteoritics & Planetary Science 40, 817–840. Airblast scaling follows
// Glasstone & Dolan (1977) as adapted by that paper.

import { IMPACTOR_DENSITY, type EffectZone, type ImpactParams, type SimulationResult } from '../types';
import { globalEffectsForEnergy } from './globalEffects';
import { tsunamiFor } from './tsunami';

export const MT_TNT_J = 4.184e15;
const G = 9.81;
const RHO_AIR0 = 1.225; // kg/m³ at sea level
const SCALE_H = 8000; // m, atmospheric scale height
const CD = 2; // drag coefficient
const PANCAKE_FACTOR = 7; // burst when the debris cloud reaches 7× initial diameter
const RHO_TARGET_LAND = 2500; // sedimentary rock
const RHO_WATER = 1000;

const airDensity = (zM: number) => RHO_AIR0 * Math.exp(-zM / SCALE_H);

export interface EntryResult {
  airburst: boolean;
  /** Altitude of breakup onset (m), undefined if it never breaks up. */
  breakupAltM?: number;
  /** Airburst altitude (m) if airburst. */
  burstAltM?: number;
  /** Velocity at the surface or at burst (m/s). */
  finalVelocity: number;
  /** Kinetic energy remaining at surface/burst (J). */
  finalEnergyJ: number;
}

/**
 * Atmospheric entry with the "pancake" fragmentation model.
 * Uses the analytic dispersion profile of Collins et al. (2005) eq. 16–18 with a
 * numerical velocity integration, so both airburst altitude and ground velocity
 * come out of one consistent simulation.
 */
export function simulateEntry(params: ImpactParams): EntryResult {
  const L0 = params.diameterM;
  const rhoI = IMPACTOR_DENSITY[params.impactorType];
  const v0 = params.velocityKmS * 1000;
  const theta = (params.angleDeg * Math.PI) / 180;
  const sinT = Math.sin(theta);
  const mass = (Math.PI / 6) * rhoI * L0 ** 3;

  // Impactor strength (Pa), empirical fit from Collins et al. eq. 10.
  const strength = 10 ** (2.107 + 0.0624 * Math.sqrt(rhoI));

  // Intact-entry check (eq. 11): If ≥ 1 means drag never exceeds strength.
  const intactFactor = (4.07 * CD * SCALE_H * strength) / (rhoI * L0 * v0 * v0 * sinT);

  let z = 100_000;
  let v = v0;
  let broken = false;
  let zBreak = 0;
  let vBreak = v0;
  let dispersionL = 0; // eq. 16 length scale, set at breakup

  const dz = 25; // m
  while (z > 0) {
    const rho = airDensity(z);
    // Current pancaked diameter (eq. 17) once broken.
    let L = L0;
    if (broken) {
      const spread = (2 * SCALE_H / dispersionL) * (Math.exp((zBreak - z) / (2 * SCALE_H)) - 1);
      L = L0 * Math.sqrt(1 + spread * spread);
      if (L >= PANCAKE_FACTOR * L0) {
        // Airburst: essentially all kinetic energy from breakup onward is
        // deposited in this layer, so the effective yield is the KE at breakup.
        return {
          airburst: true,
          breakupAltM: zBreak,
          burstAltM: z,
          finalVelocity: v,
          finalEnergyJ: 0.5 * mass * vBreak * vBreak,
        };
      }
    }
    // dv/ds = -CD ρ A v / (2 m), ds = dz / sinθ
    const area = (Math.PI / 4) * L * L;
    v -= ((CD * rho * area * v) / (2 * mass)) * (dz / sinT);
    if (v < 100) v = 100; // numerical floor; tiny bodies ablate — handled by caller
    if (!broken && intactFactor < 1 && rho * v * v > strength) {
      broken = true;
      zBreak = z;
      vBreak = v;
      dispersionL = L0 * sinT * Math.sqrt(rhoI / (CD * airDensity(z)));
    }
    z -= dz;
  }

  return {
    airburst: false,
    breakupAltM: broken ? zBreak : undefined,
    finalVelocity: v,
    finalEnergyJ: 0.5 * mass * v * v,
  };
}

/** Transient + final crater dimensions (Collins et al. eq. 21–27). All meters. */
export function craterDimensions(
  diameterM: number,
  rhoI: number,
  velocityMS: number,
  angleDeg: number,
  rhoTarget: number,
) {
  const sinT = Math.sin((angleDeg * Math.PI) / 180);
  const transient =
    1.161 *
    (rhoI / rhoTarget) ** (1 / 3) *
    diameterM ** 0.78 *
    velocityMS ** 0.44 *
    G ** -0.22 *
    sinT ** (1 / 3);
  const dcM = 3200; // simple→complex transition diameter on Earth
  let finalD: number;
  let depth: number;
  if (transient * 1.25 < dcM) {
    finalD = 1.25 * transient;
    depth = transient / (2 * Math.SQRT2); // transient depth; breccia fill shallows it
  } else {
    finalD = (1.17 * transient ** 1.13) / dcM ** 0.13;
    depth = 400 * (finalD / 1000) ** 0.3; // complex crater depth, m (eq. 28 in km form)
  }
  return { transientM: transient, finalM: finalD, depthM: depth };
}

/** Peak overpressure (Pa) at ground range rM from a burst of eKt kilotons at altitude zbM. */
export function overpressureAt(rM: number, eKt: number, zbM: number): number {
  const scale = Math.cbrt(Math.max(eKt, 1e-6));
  // Scale to 1-kt equivalent geometry, use slant range from the burst point.
  const r1 = Math.hypot(rM, zbM) / scale;
  const px = 75_000; // Pa
  const rx = 290; // m, crossover range for 1 kt
  const ratio = rx / Math.max(r1, 1);
  return px * ratio * (1 + 3 * ratio ** 1.3);
}

/** Ground range (m) at which overpressure equals target Pa (bisection). */
export function rangeForOverpressure(targetPa: number, eKt: number, zbM: number): number {
  if (overpressureAt(0, eKt, zbM) < targetPa) return 0;
  let lo = 0;
  let hi = 5e7;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (overpressureAt(mid, eKt, zbM) > targetPa) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Range (m) at which thermal exposure reaches threshold (MJ/m², scaled by yield). */
function thermalRange(energyJ: number, thresholdMJ: number): number {
  const eMt = energyJ / MT_TNT_J;
  const eta = 3e-3; // luminous efficiency
  const phi = thresholdMJ * 1e6 * Math.max(eMt, 1e-9) ** (1 / 6);
  return Math.sqrt((eta * energyJ) / (2 * Math.PI * phi));
}

const PSI = 6894.76; // Pa

// The point-source blast/thermal scalings lose validity at planetary scale:
// curvature, atmospheric thinning and energy escaping to space bound the reach
// of any surface effect. Cap rings at ~1/4 of Earth's circumference.
const MAX_RING_KM = 6000;

function capRadius(rKm: number): { rKm: number; capped: boolean } {
  return rKm > MAX_RING_KM ? { rKm: MAX_RING_KM, capped: true } : { rKm, capped: false };
}

/** Full impact simulation: entry, crater, and all damage zones. */
export function simulateImpact(params: ImpactParams): SimulationResult {
  const rhoI = IMPACTOR_DENSITY[params.impactorType];
  const L0 = params.diameterM;
  const v0 = params.velocityKmS * 1000;
  const mass = (Math.PI / 6) * rhoI * L0 ** 3;
  const energy0 = 0.5 * mass * v0 * v0;

  const entry = simulateEntry(params);
  const energyJ = entry.finalEnergyJ;
  const energyMt = energyJ / MT_TNT_J;
  const eKt = energyMt * 1000;
  const zbM = entry.airburst ? entry.burstAltM! : 0;

  const zones: EffectZone[] = [];
  let craterFinalKm: number | undefined;
  let craterTransientKm: number | undefined;
  let craterDepthKm: number | undefined;
  let seismicMagnitude: number | undefined;

  if (!entry.airburst) {
    // Shallow water (less than ~2 impactor diameters) barely cushions the blow:
    // the crater forms in the seabed rock, not the water column.
    const deepWater = params.target === 'ocean' && params.oceanDepthM > 2 * L0;
    const rhoT = deepWater ? RHO_WATER : RHO_TARGET_LAND;
    const crater = craterDimensions(L0, rhoI, entry.finalVelocity, params.angleDeg, rhoT);
    craterFinalKm = crater.finalM / 1000;
    craterTransientKm = crater.transientM / 1000;
    craterDepthKm = crater.depthM / 1000;
    seismicMagnitude = 0.67 * Math.log10(energyJ) - 5.87;

    if (params.target === 'land' || crater.transientM > params.oceanDepthM * 10) {
      zones.push({
        id: 'crater',
        label: 'Crater',
        radiusKm: craterFinalKm / 2,
        lethality: 1,
        category: 'crater',
        color: '#3b0a0a',
        description: `Excavated crater ${craterFinalKm.toFixed(1)} km across, ${(craterDepthKm * 1000).toFixed(0)} m deep. Nothing survives.`,
      });
    }

    // Ejecta blanket: thickness te = Dtc⁴ / (112 r³); radius where te = 10 cm.
    const dtc = crater.transientM;
    const rEjecta10cm = capRadius(Math.cbrt(dtc ** 4 / (112 * 0.1)) / 1000).rKm;
    if (rEjecta10cm > (craterFinalKm ?? 0)) {
      zones.push({
        id: 'ejecta',
        label: 'Ejecta blanket ≥10 cm',
        radiusKm: rEjecta10cm,
        lethality: 0.02,
        category: 'ejecta',
        color: '#7c5c33',
        description: 'Buried under at least 10 cm of hot ejected debris; roof fires and collapse.',
      });
    }
  }

  // Fireball + thermal (suppressed for high airbursts where the fireball never nears the ground).
  const fireballKm = (0.002 * Math.cbrt(energyJ)) / 1000;
  const highBurst = entry.airburst && zbM > fireballKm * 1000 * 3;
  if (!highBurst && energyMt > 1e-4) {
    zones.push({
      id: 'fireball',
      label: 'Fireball',
      radiusKm: Math.max(fireballKm, zbM / 3000),
      lethality: 1,
      category: 'fireball',
      color: '#ff5a00',
      description: `Fireball ${(2 * fireballKm).toFixed(1)} km across — vaporization and total incineration.`,
    });
  }
  if (energyMt > 1e-3) {
    const thermal: [string, number, number, string][] = [
      ['ignition', 1.0, 0.6, 'Clothing and structures ignite; firestorm zone.'],
      ['burns3', 0.42, 0.3, 'Third-degree burns to exposed skin.'],
      ['burns2', 0.25, 0.05, 'Second-degree burns to exposed skin.'],
    ];
    for (const [id, mj, lethality, desc] of thermal) {
      const raw = thermalRange(energyJ, mj) / 1000;
      const { rKm, capped } = capRadius(raw);
      if (rKm > fireballKm) {
        zones.push({
          id: `thermal-${id}`,
          label:
            id === 'ignition' ? 'Firestorm ignition' : id === 'burns3' ? '3rd-degree burns' : '2nd-degree burns',
          radiusKm: rKm,
          lethality,
          category: 'thermal',
          color: id === 'ignition' ? '#ff8c1a' : id === 'burns3' ? '#ffb347' : '#ffd27f',
          description: capped ? `${desc} (Reach capped by planetary curvature.)` : desc,
        });
      }
    }
  }

  // Air blast rings.
  if (eKt > 0.01) {
    const blast: [string, string, number, number, string][] = [
      ['blast20', 'Total destruction (20 psi)', 20, 0.9, 'Reinforced buildings level; near-total fatalities.'],
      ['blast5', 'Heavy damage (5 psi)', 5, 0.15, 'Most residential buildings collapse.'],
      ['blast1', 'Moderate damage (1 psi)', 1, 0.01, 'Windows shatter, light structural damage, widespread injuries.'],
    ];
    for (const [id, label, psi, lethality, desc] of blast) {
      const raw = rangeForOverpressure(psi * PSI, eKt, zbM) / 1000;
      const { rKm, capped } = capRadius(raw);
      if (rKm > 0.05) {
        zones.push({
          id,
          label,
          radiusKm: rKm,
          lethality,
          category: 'blast',
          color: psi === 20 ? '#c0182f' : psi === 5 ? '#e04a5a' : '#f08f9b',
          description: capped ? `${desc} (Reach capped by planetary curvature.)` : desc,
        });
      }
    }
  }

  // Seismic shaking ring (serious damage ≈ MMI ≥ VII within this range).
  if (seismicMagnitude !== undefined && seismicMagnitude > 6) {
    const rKm = seismicRadiusKm(seismicMagnitude, 7.5);
    if (rKm > 1) {
      zones.push({
        id: 'seismic',
        label: `Severe shaking (M${seismicMagnitude.toFixed(1)})`,
        radiusKm: rKm,
        lethality: 0.005,
        category: 'seismic',
        color: '#8a6ee0',
        description: 'Earthquake shaking equivalent to MMI VII+ — structural damage to ordinary buildings.',
      });
    }
  }

  const isOcean = params.target === 'ocean';
  const tsunami = isOcean && !entry.airburst ? tsunamiFor(craterTransientKm! * 1000, params.oceanDepthM) : undefined;

  const global = globalEffectsForEnergy(energyMt);

  const zonesSorted = zones.sort((a, b) => a.radiusKm - b.radiusKm);
  return {
    kind: 'impact',
    energyJ,
    energyMt,
    massKg: mass,
    airburst: entry.airburst,
    burstAltitudeKm: entry.airburst ? zbM / 1000 : undefined,
    finalVelocityKmS: entry.finalVelocity / 1000,
    craterFinalKm,
    craterTransientKm,
    craterDepthKm,
    seismicMagnitude,
    zones: zonesSorted,
    global,
    tsunami,
    comparisons: buildComparisons(energyMt, energy0 / MT_TNT_J),
  };
}

/** Range at which effective felt magnitude drops to a given MMI-equivalent (Collins et al. eq. 33–35). */
export function seismicRadiusKm(magnitude: number, effectiveTarget: number): number {
  // Invert the piecewise attenuation M_eff(r): search outward.
  const meff = (rKm: number) => {
    if (rKm < 60) return magnitude - 0.0238 * rKm;
    if (rKm < 700) return magnitude - 0.0048 * rKm - 1.1644;
    return magnitude - 1.66 * Math.log10(rKm / 111.19) - 6.399;
  };
  if (meff(1) < effectiveTarget) return 0;
  let lo = 1;
  let hi = 20000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (meff(mid) > effectiveTarget) lo = mid;
    else hi = mid;
  }
  return lo;
}

function buildComparisons(energyMt: number, entryMt: number): string[] {
  const out: string[] = [];
  const hiroshima = energyMt / 0.015;
  if (hiroshima >= 1) {
    out.push(
      `${fmtBig(hiroshima)}× the Hiroshima bomb` +
        (energyMt >= 50 ? `, ${fmtBig(energyMt / 50)}× the Tsar Bomba` : ''),
    );
  } else {
    out.push(`${(energyMt * 1000).toFixed(1)} kt TNT equivalent`);
  }
  if (energyMt > 1e7) out.push('Exceeds the entire global nuclear arsenal by orders of magnitude');
  if (entryMt > energyMt * 1.5) out.push(`${Math.round(((entryMt - energyMt) / entryMt) * 100)}% of entry energy shed in the atmosphere`);
  return out;
}

function fmtBig(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toPrecision(3)} billion`;
  if (n >= 1e6) return `${(n / 1e6).toPrecision(3)} million`;
  if (n >= 1e3) return `${Math.round(n).toLocaleString('en-US')}`;
  return `${Math.round(n)}`;
}
