import { describe, expect, it } from 'vitest';
import { assessObserver, bearingTo, footprintDiameterKm } from './observer';
import { simulate } from './index';
import { haversineKm } from '../data/cities';
import { searchCities } from '../data/citySearch';
import { surfaceRoute } from '../scene/observerGeometry';
import { latLngToVec3 } from '../scene/geo';

const scenario = { lat: 0, lng: 0 };
const result = simulate({ kind: 'eruption', bulkVolumeKm3: 1000 });

describe('observer geometry and exposure', () => {
  it('uses the short surface distance across the date line', () => {
    const assessment = assessObserver({ lat: 0, lng: 179 }, result, { name: 'Across the date line', lat: 0, lng: -179 });
    expect(assessment.distanceKm).toBeCloseTo(222.3899, 3);
    expect(assessment.bearing).toBeCloseTo(270, 8);
  });

  it('includes every overlapping zone at ground zero', () => {
    expect(assessObserver(scenario, result, { ...scenario, name: 'Ground zero' }).zones.map((z) => z.id)).toEqual(result.zones.map((z) => z.id));
  });

  it('includes a boundary point and excludes a point just beyond the radius', () => {
    const radiusKm = haversineKm(0, 0, 0, 1);
    const fixture = { ...result, zones: [{ ...result.zones[0], radiusKm }] };
    expect(assessObserver(scenario, fixture, { name: 'Boundary', lat: 0, lng: 1 }).zones).toHaveLength(1);
    expect(assessObserver(scenario, fixture, { name: 'Outside', lat: 0, lng: 1.0001 }).zones).toHaveLength(0);
  });

  it('does not invent local effects on the opposite side of Earth', () => {
    expect(assessObserver(scenario, result, { name: 'Antipode', lat: 0, lng: 180 }).zones).toHaveLength(0);
  });

  it('reports compass direction toward the source and omits ambiguous bearings', () => {
    expect(bearingTo(0, 0, 10, 0)).toBeCloseTo(0, 8);
    expect(bearingTo(0, 0, 0, 10)).toBeCloseTo(90, 8);
    expect(bearingTo(0, 0, -10, 0)).toBeCloseTo(180, 8);
    expect(bearingTo(0, 0, 0, -10)).toBeCloseTo(270, 8);
    expect(bearingTo(0, 0, 0, 0)).toBeNull();
    expect(bearingTo(0, 0, 0, 180)).toBeNull();
  });

  it('does not draw a surface crater for an airburst', () => {
    expect(footprintDiameterKm({ ...result, kind: 'impact', airburst: true, craterFinalKm: 2 })).toBeNull();
    expect(footprintDiameterKm({ ...result, kind: 'impact', airburst: false, craterFinalKm: 2 })).toBe(2);
    expect(footprintDiameterKm(result)).toBeCloseTo(result.zones.find((z) => z.category === 'caldera')!.radiusKm * 2);
  });

  it.each([
    [{ lat: 0, lng: 179 }, { lat: 0, lng: -179 }],
    [{ lat: 0, lng: 0 }, { lat: 0, lng: 180 }],
    [{ lat: 90, lng: 0 }, { lat: -90, lng: 0 }],
    [{ lat: 38, lng: -121 }, { lat: 38, lng: -121 }],
  ])('keeps a route on the sphere with exact endpoints: %j to %j', (from, to) => {
    const points = surfaceRoute(from, to);
    expect(points[0].distanceTo(latLngToVec3(from.lat, from.lng))).toBeLessThan(1e-8);
    expect(points.at(-1)!.distanceTo(latLngToVec3(to.lat, to.lng))).toBeLessThan(1e-8);
    for (const point of points) expect(point.length()).toBeCloseTo(1, 8);
  });

  it('finds accented city names with unaccented input and ranks exact matches first', () => {
    expect(searchCities('sao paulo')[0].name).toBe('São Paulo');
    expect(searchCities('Paris')[0].name).toBe('Paris');
    expect(searchCities('no-city-with-this-name')).toEqual([]);
    expect(searchCities('   ')).toEqual([]);
  });
});
