import { haversineKm } from '../data/cities';
import type { Scenario, SimulationResult } from '../types';

export interface ObserverLocation {
  name: string;
  lat: number;
  lng: number;
}

/** Initial compass bearing from observer to source; undefined at coincident or antipodal points. */
export function bearingTo(lat: number, lng: number, targetLat: number, targetLng: number): number | null {
  const rad = Math.PI / 180;
  const a = lat * rad;
  const b = targetLat * rad;
  const delta = (targetLng - lng) * rad;
  const y = Math.sin(delta) * Math.cos(b);
  const x = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(delta);
  if (Math.hypot(x, y) < 1e-12) return null;
  return (Math.atan2(y, x) / rad + 360) % 360;
}

export function assessObserver(scenario: Pick<Scenario, 'lat' | 'lng'>, result: SimulationResult, observer: ObserverLocation) {
  const distanceKm = haversineKm(scenario.lat, scenario.lng, observer.lat, observer.lng);
  return {
    distanceKm,
    bearing: bearingTo(observer.lat, observer.lng, scenario.lat, scenario.lng),
    // Zones overlap. A location can receive several effects at once.
    zones: result.zones.filter((zone) => distanceKm <= zone.radiusKm),
  };
}

export function footprintDiameterKm(result: SimulationResult): number | null {
  if (result.kind === 'impact') return result.airburst ? null : result.craterFinalKm ?? null;
  const caldera = result.zones.find((zone) => zone.category === 'caldera');
  return caldera ? caldera.radiusKm * 2 : null;
}

export const compassPoint = (bearing: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing / 45) % 8];
