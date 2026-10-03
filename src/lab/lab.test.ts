import { expect, it } from 'vitest';
import { makeFile, decodeFile, parseScenario, readScenarios, saveScenario, removeScenario, SCENARIO_KEY } from './scenarios';
import { sweep } from './sensitivity';
import { useLab } from '../state/lab';
import { destination, projectLocal, unprojectLocal, circlePath } from '../scene/regional';
import { haversineKm } from '../data/cities';
import { tunguskaScenario } from '../stories/tunguska';
import { EVENTS } from '../data/events';

const memory = () => { const map = new Map<string, string>(); return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } }; };
const experiment = () => ({ scenario: tunguskaScenario(), observer: { name: 'Test observer', lat: 38, lng: -121 }, baseline: tunguskaScenario('iron') });
it('round-trips an impact, observer, and baseline without retaining extra fields', () => {
  const file = makeFile('Experiment', experiment());
  const copy = decodeFile(JSON.stringify({ ...file, unexpected: 'ignored' }));
  expect(copy).toEqual(file);
  copy.scenario.lat = 0;
  expect(file.scenario.lat).toBe(60.886);
  expect(copy.observer).toEqual(experiment().observer);
  expect(copy.baseline?.params).toMatchObject({ impactorType: 'iron' });
});
it('accepts the catalog and round-trips an eruption', () => {
  for (const e of EVENTS) expect(parseScenario({ params: e.params, lat: e.lat, lng: e.lng, year: e.year, placeName: e.placeName })).toMatchObject({ params: e.params });
  const s = { ...tunguskaScenario(), params: { kind: 'eruption' as const, bulkVolumeKm3: 120 } };
  expect(decodeFile(JSON.stringify(makeFile('Eruption', { scenario: s, observer: null, baseline: null }))).scenario).toEqual(s);
});
it('rejects malformed, oversized, unknown-version and invalid-location files', () => {
  const file = makeFile('Test', experiment());
  expect(() => decodeFile('{')).toThrow('JSON');
  expect(() => decodeFile(' '.repeat(100001))).toThrow('100 KB');
  expect(() => decodeFile(JSON.stringify({ ...file, version: 2 }))).toThrow('supported');
  expect(() => decodeFile(JSON.stringify({ ...file, observer: { name: 'Outside', lat: 91, lng: 0 } }))).toThrow('range');
  expect(() => parseScenario({ ...file.scenario, year: 2026.5 })).toThrow('whole');
  expect(() => makeFile('', experiment())).toThrow('name');
  expect(() => parseScenario({ ...file.scenario, lng: Infinity })).toThrow('range');
  expect(() => decodeFile(JSON.stringify({ ...file, baseline: { ...file.scenario, lat: -91 } }))).toThrow('range');
});
it('rejects unsafe physics parameters before opening an imported scenario', () => {
  const s = tunguskaScenario();
  for (const patch of [{ diameterM: 0 }, { diameterM: '55' }, { velocityKmS: 100 }, { angleDeg: 0 }, { oceanDepthM: -1 }, { impactorType: 'plastic' }, { target: 'unknown' }, { kind: 'unknown' }]) expect(() => parseScenario({ ...s, params: { ...s.params, ...patch } })).toThrow();
  expect(() => parseScenario({ ...s, params: { kind: 'eruption', bulkVolumeKm3: 9000 } })).toThrow();
});
it('persists separate saves, removes only the selected record, and honors capacity', () => {
  const storage = memory(), file = makeFile('First', experiment());
  const first = saveScenario(storage, file)[0];
  const next = saveScenario(storage, { ...file, name: 'Second' });
  expect(next).toHaveLength(2);
  expect(readScenarios(storage)[0].name).toBe('Second');
  expect(removeScenario(storage, first.id).map(r => r.name)).toEqual(['Second']);
  for (let i = 1; i < 24; i++) saveScenario(storage, file);
  const before = storage.getItem(SCENARIO_KEY);
  expect(() => saveScenario(storage, file)).toThrow('24');
  expect(storage.getItem(SCENARIO_KEY)).toBe(before);
});
it('keeps corrupt storage intact and propagates write failures', () => {
  const storage = memory(), file = makeFile('First', experiment());
  storage.setItem(SCENARIO_KEY, '{broken');
  expect(() => saveScenario(storage, file)).toThrow();
  expect(storage.getItem(SCENARIO_KEY)).toBe('{broken');
  expect(() => saveScenario({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, file)).toThrow('quota');
  const one = { ...file, id: 'same', createdAt: new Date().toISOString() };
  storage.setItem(SCENARIO_KEY, JSON.stringify([one, one]));
  expect(() => readScenarios(storage)).toThrow('Duplicate');
});
it('pins an independent baseline that survives edits to the original', () => {
  const s = tunguskaScenario(); useLab.getState().pin(s);
  if (s.params.kind === 'impact') s.params.diameterM = 500;
  s.lat = 0;
  expect(useLab.getState().baseline?.params).toMatchObject({ diameterM: 55 });
  expect(useLab.getState().baseline?.lat).toBe(60.886);
  useLab.getState().clear(); expect(useLab.getState().baseline).toBeNull();
});
it('sweeps one input while preserving location, composition and the source scenario', () => {
  const s = tunguskaScenario(), before = structuredClone(s), rows = sweep(s, 'diameterM', 20);
  expect(rows.map(r => r.value)).toEqual([44, 55, 66]);
  expect(rows[0].result.energyMt).toBeLessThan(rows[2].result.energyMt);
  for (const r of rows) { expect(r.scenario.lat).toBe(s.lat); expect(r.scenario.params).toMatchObject({ impactorType: 'stony', velocityKmS: 15, angleDeg: 35 }); }
  expect(s).toEqual(before);
});
it('clamps sweeps at supported limits and handles eruption volume', () => {
  const s = tunguskaScenario(); if (s.params.kind === 'impact') s.params.velocityKmS = 72;
  expect(sweep(s, 'velocityKmS', 50).map(r => r.value)).toEqual([36,72,72]);
  const e = { ...s, params: { kind: 'eruption' as const, bulkVolumeKm3: 100 } };
  expect(sweep(e, 'bulkVolumeKm3', 20).map(r => r.value)).toEqual([80,100,120]);
  expect(() => sweep(e, 'angleDeg', 20)).toThrow('apply');
  expect(() => sweep(s, 'diameterM', 0)).toThrow('spread');
  expect(() => sweep(s, 'diameterM', NaN)).toThrow('spread');
});
it('preserves radial distance and bearing near the date line and poles', () => {
  for (const center of [{ lat: 0, lng: 179.9 }, { lat: 89, lng: 20 }, { lat: -85, lng: -179 }]) {
    for (const bearing of [0,90,180,270]) {
      const p = destination(center, 150, bearing), projected = projectLocal(center, p);
      expect(haversineKm(center.lat, center.lng, p.lat, p.lng)).toBeCloseTo(150, 6);
      expect(projected.x).toBeCloseTo(150 * Math.sin(bearing * Math.PI / 180), 6);
      expect(projected.y).toBeCloseTo(-150 * Math.cos(bearing * Math.PI / 180), 6);
      const back = unprojectLocal(center, projected.x, projected.y);
      expect(haversineKm(back.lat, back.lng, p.lat, p.lng)).toBeLessThan(.00001);
      expect(p.lng).toBeGreaterThanOrEqual(-180); expect(p.lng).toBeLessThan(180);
    }
  }
});
it('projects a 50 km circle at half the radius of a 100 km map', () => {
  const path = circlePath({ lat: 0, lng: 0 }, 50, { lat: 0, lng: 0 }, 100);
  expect(path).toContain('M400.0,205.0');
  expect(path).toContain('L555.0,360.0');
  expect(path).not.toContain('NaN');
});
