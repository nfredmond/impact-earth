import { haversineKm } from '../data/cities';
import { bearingTo } from '../physics/observer';
export interface Location { lat: number; lng: number }
const RAD = Math.PI / 180;
/** Azimuthal equidistant coordinates in kilometers, north at negative y. */
export function projectLocal(center: Location, point: Location): { x: number; y: number } {
  const distance = haversineKm(center.lat, center.lng, point.lat, point.lng);
  const bearing = (bearingTo(center.lat, center.lng, point.lat, point.lng) ?? 0) * RAD;
  return { x: distance * Math.sin(bearing), y: -distance * Math.cos(bearing) };
}
export function destination(center: Location, distanceKm: number, bearing: number): Location {
  const a = center.lat * RAD, b = bearing * RAD, d = distanceKm / 6371;
  const lat = Math.asin(Math.sin(a) * Math.cos(d) + Math.cos(a) * Math.sin(d) * Math.cos(b));
  const lng = center.lng * RAD + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(a), Math.cos(d) - Math.sin(a) * Math.sin(lat));
  return { lat: lat / RAD, lng: ((lng / RAD + 540) % 360) - 180 };
}
export function unprojectLocal(center: Location, x: number, y: number): Location {
  return destination(center, Math.hypot(x, y), Math.atan2(x, -y) / RAD);
}
export function linePath(line: number[][], center: Location, radius: number): string {
  let output = '', previous = false;
  for (const [lng, lat] of line) {
    const p = projectLocal(center, { lat, lng });
    if (Math.hypot(p.x, p.y) > Math.min(19000, radius * 2)) { previous = false; continue; }
    output += `${previous ? 'L' : 'M'}${(400 + p.x * 310 / radius).toFixed(1)},${(360 + p.y * 310 / radius).toFixed(1)}`;
    previous = true;
  }
  return output;
}
export function circlePath(origin: Location, km: number, center: Location, radius: number): string {
  return linePath(Array.from({ length: 181 }, (_, i) => { const p = destination(origin, Math.min(km, 19000), i * 2); return [p.lng, p.lat]; }), center, radius);
}
