import type { Scenario } from '../types';
import type { ObserverLocation } from '../physics/observer';

export const SCENARIO_KEY = 'impact-earth.scenarios.v1';
export const MAX_SCENARIOS = 24;
export interface Experiment { scenario: Scenario; observer: ObserverLocation | null; baseline: Scenario | null }
export interface ScenarioFile extends Experiment { format: 'impact-earth-scenario'; version: 1; model: string; name: string }
export interface SavedScenario extends ScenarioFile { id: string; createdAt: string }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a scenario object.');
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`A number is outside the supported range (${min} to ${max}).`);
  return value;
}
function label(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`A name is missing or exceeds ${max} characters.`);
  return value.trim();
}
export function parseScenario(value: unknown): Scenario {
  const s = object(value), p = object(s.params);
  const location = { lat: number(s.lat, -90, 90), lng: number(s.lng, -180, 180), year: number(s.year, -10000, 2500), placeName: label(s.placeName, 160) };
  if (!Number.isInteger(location.year)) throw new Error('The scenario year must be a whole number.');
  if (p.kind === 'eruption') return { ...location, params: { kind: 'eruption', bulkVolumeKm3: number(p.bulkVolumeKm3, .1, 5000) } };
  if (p.kind !== 'impact' || !['stony', 'iron', 'comet', 'carbonaceous'].includes(String(p.impactorType)) || !['land', 'ocean'].includes(String(p.target))) throw new Error('Unsupported scenario type, material, or target.');
  return { ...location, params: { kind: 'impact', diameterM: number(p.diameterM, 10, 25000), velocityKmS: number(p.velocityKmS, 11, 72), angleDeg: number(p.angleDeg, 5, 90), oceanDepthM: number(p.oceanDepthM, 0, 8000), impactorType: p.impactorType as 'stony' | 'iron' | 'comet' | 'carbonaceous', target: p.target as 'land' | 'ocean' } };
}
export function parseFile(value: unknown): ScenarioFile {
  const f = object(value);
  if (f.format !== 'impact-earth-scenario' || f.version !== 1) throw new Error('This is not a supported Impact Earth scenario file.');
  let observer: ObserverLocation | null = null;
  if (f.observer !== null) { const o = object(f.observer); observer = { name: label(o.name, 160), lat: number(o.lat, -90, 90), lng: number(o.lng, -180, 180) }; }
  return { format: 'impact-earth-scenario', version: 1, model: label(f.model, 80), name: label(f.name, 80), scenario: parseScenario(f.scenario), observer, baseline: f.baseline === null ? null : parseScenario(f.baseline) };
}
export function decodeFile(text: string): ScenarioFile {
  if (text.length > 100000) throw new Error('Scenario files must be smaller than 100 KB.');
  try { return parseFile(JSON.parse(text)); } catch (error) { if (error instanceof SyntaxError) throw new Error('The file is not valid JSON.'); throw error; }
}
export function makeFile(name: string, experiment: Experiment): ScenarioFile {
  return parseFile({ ...experiment, format: 'impact-earth-scenario', version: 1, model: 'impact-earth-physics-1.0', name });
}
export function readScenarios(storage: StorageLike): SavedScenario[] {
  const raw = storage.getItem(SCENARIO_KEY);
  if (raw === null) return [];
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values) || values.length > MAX_SCENARIOS) throw new Error('The scenario notebook could not be read. Export a backup before changing stored data.');
  const records = values.map(value => {
    const v = object(value), file = parseFile(v);
    const id = label(v.id, 80), createdAt = label(v.createdAt, 80);
    if (!Number.isFinite(Date.parse(createdAt))) throw new Error('A saved date could not be read.');
    return { ...file, id, createdAt };
  });
  if (new Set(records.map(r => r.id)).size !== records.length) throw new Error('Duplicate notebook entries could not be read.');
  return records;
}
export function saveScenario(storage: StorageLike, file: ScenarioFile): SavedScenario[] {
  const records = readScenarios(storage);
  if (records.length >= MAX_SCENARIOS) throw new Error('The notebook holds 24 scenarios. Remove one before saving another.');
  const next = [{ ...parseFile(file), id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...records];
  storage.setItem(SCENARIO_KEY, JSON.stringify(next));
  return next;
}
export function removeScenario(storage: StorageLike, id: string): SavedScenario[] {
  const next = readScenarios(storage).filter(record => record.id !== id);
  storage.setItem(SCENARIO_KEY, JSON.stringify(next));
  return next;
}
export function downloadScenario(file: ScenarioFile) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(parseFile(file), null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'impact-earth-scenario.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
