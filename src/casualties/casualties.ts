// Human-consequence model: integrates the population grid over damage zones,
// scales to the scenario year, prices the losses. Everything here is an
// order-of-magnitude estimate and is labeled as such in the UI and reports.

import type { CityLoss, HumanImpact, SimulationResult } from '../types';
import type { PopGrid } from '../data/popgrid';
import { cities } from '../data/cities';
import {
  capitalPerCapita,
  eraCellFactor,
  eraCityFactor,
  gdpPerCapita,
  worldPopulation,
} from './eras';

const EARTH_R = 6371; // km

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Property-destruction fraction for a zone (for economic losses). */
function damageFraction(zoneId: string, lethality: number): number {
  const base: Record<string, number> = {
    crater: 1, fireball: 1, pdc: 1, caldera: 1,
    blast20: 0.95, blast5: 0.6, blast1: 0.12,
    'thermal-ignition': 0.7, 'thermal-burns3': 0.15, 'thermal-burns2': 0.05,
    ash1m: 0.8, ash10cm: 0.25, ash1cm: 0.02,
    ejecta: 0.4, seismic: 0.15,
  };
  return base[zoneId] ?? Math.min(1, lethality * 1.5);
}

export function computeHumanImpact(
  result: SimulationResult,
  lat: number,
  lng: number,
  year: number,
  grid: PopGrid,
): HumanImpact {
  const zones = result.zones; // sorted innermost → outermost
  const worldPop = worldPopulation(year);
  const notes: string[] = [];

  let directDeaths = 0;
  let injured = 0;
  let populationExposed = 0;
  let econDirect = 0;

  if (zones.length > 0) {
    const maxR = zones[zones.length - 1].radiusKm;
    // Walk every grid cell in the bounding box; assign it to the innermost zone
    // containing it (zones are concentric, lethality already accounts for overlap).
    const latSpan = (maxR / 111.32) + grid.cellDeg;
    const latMin = Math.max(-90, lat - latSpan);
    const latMax = Math.min(90, lat + latSpan);
    for (let cl = latMin; cl <= latMax; cl += grid.cellDeg) {
      const cosLat = Math.max(0.02, Math.cos((cl * Math.PI) / 180));
      const lngSpan = Math.min(180, maxR / (111.32 * cosLat) + grid.cellDeg);
      for (let cg = lng - lngSpan; cg <= lng + lngSpan; cg += grid.cellDeg) {
        const wrapped = ((cg + 540) % 360) - 180;
        const pop = grid.cellPop(cl, wrapped);
        if (pop <= 0) continue;
        const d = haversineKm(lat, lng, cl, wrapped);
        if (d > maxR) continue;
        const zone = zones.find((z) => d <= z.radiusKm);
        if (!zone) continue;
        const popAtYear = pop * eraCellFactor(cl, wrapped, year);
        populationExposed += popAtYear;
        const deaths = popAtYear * zone.lethality;
        directDeaths += deaths;
        injured += popAtYear * Math.min(0.9, zone.lethality * 1.6 + 0.03) - deaths;
        econDirect += popAtYear * damageFraction(zone.id, zone.lethality) * capitalPerCapita(year);
      }
    }
  }

  // Global famine among those outside the direct zones.
  const famineDeaths = Math.max(0, (worldPop - populationExposed) * result.global.famineFraction);
  if (famineDeaths > 0) {
    notes.push(
      `Famine estimate assumes ${(result.global.famineFraction * 100).toFixed(1)}% excess mortality from ${result.global.coolingC.toFixed(1)} °C global cooling and harvest collapse.`,
    );
  }

  if (result.tsunami) {
    notes.push(
      'Ocean impact: tsunami casualties on distant coasts are NOT included in the totals — coastal exposure depends on local bathymetry beyond this model. Wave estimates shown separately.',
    );
  }

  // Cities: report any city inside a zone, with deaths from its innermost zone.
  const citiesLost: CityLoss[] = [];
  if (zones.length > 0) {
    const maxR = zones[zones.length - 1].radiusKm;
    for (const c of cities) {
      const d = haversineKm(lat, lng, c.lat, c.lng);
      if (d > maxR) continue;
      const zone = zones.find((z) => d <= z.radiusKm)!;
      const popAtYear = c.pop * eraCityFactor(c.lat, c.lng, year, c.founded);
      if (popAtYear < 100) continue;
      citiesLost.push({
        name: c.name,
        country: c.country,
        lat: c.lat,
        lng: c.lng,
        popAtYear,
        deaths: popAtYear * zone.lethality,
        zoneLabel: zone.label,
      });
    }
    citiesLost.sort((a, b) => b.deaths - a.deaths);
  }

  const totalDeaths = Math.min(worldPop, directDeaths + famineDeaths);
  // Lost economic output: ~10 years of the deceased's production, plus direct capital.
  const econLoss = econDirect + totalDeaths * 10 * gdpPerCapita(year);
  const gwp = worldPop * gdpPerCapita(year);

  return {
    year,
    worldPop,
    directDeaths,
    famineDeaths,
    totalDeaths,
    injured: Math.max(0, injured),
    citiesLost,
    populationExposed,
    econLossUsd: econLoss,
    econLossShareOfGwp: Math.min(50, econLoss / gwp),
    notes,
  };
}
