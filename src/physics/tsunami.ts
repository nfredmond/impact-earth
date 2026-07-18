// Order-of-magnitude tsunami model for deep-water impacts.
// Initial cavity ≈ transient crater in water (capped by ocean depth); deep-water
// amplitude decays ~1/r from the cavity rim (Ward & Asphaug 2000 give ~r^-1;
// coastal run-up amplification 2–4×). Explicitly approximate — labeled as such.

import type { TsunamiResult } from '../types';

export function tsunamiFor(transientCraterM: number, oceanDepthM: number): TsunamiResult {
  const cavityRadiusM = transientCraterM / 2;
  // Initial rim wave amplitude: a fraction of cavity depth, capped by water depth.
  const cavityDepth = Math.min(transientCraterM / (2 * Math.SQRT2), oceanDepthM);
  const a0 = 0.4 * cavityDepth;
  const ranges = [100, 500, 1000, 3000];
  const amplitudeAtKm = ranges.map((km) => ({
    km,
    meters: Math.min(a0, (a0 * cavityRadiusM) / (km * 1000)),
  }));
  return {
    amplitudeAtKm,
    runupFactor: 3,
    description:
      'Deep-water wave amplitudes (~1/r decay from the impact cavity). Shoaling typically amplifies coastal run-up ~3×. Order-of-magnitude estimate.',
  };
}
