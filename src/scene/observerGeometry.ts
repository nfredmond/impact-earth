import * as THREE from 'three';
import { latLngToVec3 } from './geo';
import type { ObserverLocation } from '../physics/observer';

/** Quaternion rotation handles coincident points, date-line crossings and antipodes. */
export function surfaceRoute(from: Pick<ObserverLocation, 'lat' | 'lng'>, to: Pick<ObserverLocation, 'lat' | 'lng'>, segments = 128) {
  const start = latLngToVec3(from.lat, from.lng);
  const end = latLngToVec3(to.lat, to.lng);
  const rotation = new THREE.Quaternion().setFromUnitVectors(start, end);
  return Array.from({ length: segments + 1 }, (_, i) => start.clone().applyQuaternion(new THREE.Quaternion().slerp(rotation, i / segments)));
}
