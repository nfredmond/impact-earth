import * as THREE from 'three';

export const EARTH_RADIUS_KM = 6371;
const DEG = Math.PI / 180;

/** Lat/lng → unit-sphere position matching an equirectangular texture on THREE.SphereGeometry. */
export function latLngToVec3(lat: number, lng: number, r = 1): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/** Inverse of latLngToVec3. */
export function vec3ToLatLng(p: THREE.Vector3): { lat: number; lng: number } {
  const r = p.length();
  const lat = 90 - Math.acos(p.y / r) / DEG;
  let lng = Math.atan2(p.z, -p.x) / DEG - 180;
  if (lng < -180) lng += 360;
  return { lat, lng };
}

/** Angular radius (radians) on the globe for a ground distance in km. */
export const kmToAngle = (km: number) => km / EARTH_RADIUS_KM;

/**
 * Filled spherical ring band between angular radii a0..a1 around `center`
 * (unit vector), lifted slightly off the surface.
 */
export function ringBandGeometry(
  center: THREE.Vector3,
  a0: number,
  a1: number,
  altitude = 0.001,
  segments = 192,
): THREE.BufferGeometry {
  const { t1, t2 } = basisFor(center);
  const rings = 8;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const a = a0 + ((a1 - a0) * i) / rings;
    for (let j = 0; j <= segments; j++) {
      const b = (2 * Math.PI * j) / segments;
      const p = pointAt(center, t1, t2, a, b).multiplyScalar(1 + altitude);
      positions.push(p.x, p.y, p.z);
    }
  }
  const w = segments + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * w + j;
      indices.push(a, a + w, a + 1, a + 1, a + w, a + w + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Circle outline at angular radius `a` around `center`. */
export function ringLineGeometry(
  center: THREE.Vector3,
  a: number,
  altitude = 0.0015,
  segments = 256,
): THREE.BufferGeometry {
  const { t1, t2 } = basisFor(center);
  const positions: number[] = [];
  for (let j = 0; j <= segments; j++) {
    const b = (2 * Math.PI * j) / segments;
    const p = pointAt(center, t1, t2, a, b).multiplyScalar(1 + altitude);
    positions.push(p.x, p.y, p.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

function basisFor(center: THREE.Vector3) {
  const c = center.clone().normalize();
  const up = Math.abs(c.y) > 0.94 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const t1 = new THREE.Vector3().crossVectors(up, c).normalize();
  const t2 = new THREE.Vector3().crossVectors(c, t1).normalize();
  return { t1, t2 };
}

function pointAt(
  c: THREE.Vector3,
  t1: THREE.Vector3,
  t2: THREE.Vector3,
  a: number,
  b: number,
): THREE.Vector3 {
  return c
    .clone()
    .multiplyScalar(Math.cos(a))
    .addScaledVector(t1, Math.sin(a) * Math.cos(b))
    .addScaledVector(t2, Math.sin(a) * Math.sin(b));
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
