import { BASELINE_RESULT, MATERIALS, STORY_MODEL, summarize, tunguskaScenario } from './tunguska';
import { simulate } from '../physics';
import type { ImpactorType, Scenario } from '../types';
import type { StorySummary } from './tunguska';

export const NOTEBOOK_KEY = 'impact-earth.tunguska-notes.v1';
export interface FieldNote {
  schema: 1;
  id: string;
  createdAt: string;
  title: string;
  model: string;
  material: ImpactorType;
  distanceKm: number;
  baseline: StorySummary;
  experiment: StorySummary;
  inputs: Scenario;
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export function makeNote(title: string, material: ImpactorType, distanceKm: number): FieldNote {
  const inputs = tunguskaScenario(material);
  return { schema: 1, id: crypto.randomUUID(), createdAt: new Date().toISOString(), title: title.trim().slice(0, 80) || 'Tunguska field note', model: STORY_MODEL, material, distanceKm, baseline: summarize(BASELINE_RESULT), experiment: summarize(simulate(inputs.params)), inputs };
}
function isSummary(value: unknown): value is StorySummary {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.airburst === 'boolean' && ['energyMt', 'altitudeKm', 'craterKm', 'outerRadiusKm'].every(k => typeof s[k] === 'number' && Number.isFinite(s[k]) && (s[k] as number) >= 0);
}
export function readNotes(storage: StorageLike): FieldNote[] {
  const raw = storage.getItem(NOTEBOOK_KEY);
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 12 || !data.every(n => {
    if (!n || n.schema !== 1 || typeof n.id !== 'string' || typeof n.title !== 'string' || n.title.length > 80 || typeof n.model !== 'string' || typeof n.createdAt !== 'string' || !Number.isFinite(Date.parse(n.createdAt))) return false;
    if (!MATERIALS.some(m => m.value === n.material) || ![20, 60, 120].includes(n.distanceKm) || !isSummary(n.baseline) || !isSummary(n.experiment)) return false;
    const p = n.inputs?.params;
    return p?.kind === 'impact' && p.impactorType === n.material && ['diameterM', 'velocityKmS', 'angleDeg', 'oceanDepthM'].every(k => typeof p[k] === 'number' && Number.isFinite(p[k])) && ['lat', 'lng', 'year'].every(k => typeof n.inputs[k] === 'number' && Number.isFinite(n.inputs[k])) && typeof n.inputs.placeName === 'string' && ['land', 'ocean'].includes(p.target);
  })) throw new Error('Saved notes could not be read. Existing data has been left intact.');
  return data as FieldNote[];
}
export function saveNote(storage: StorageLike, note: FieldNote): FieldNote[] {
  const notes = readNotes(storage);
  if (notes.length >= 12) throw new Error('Your notebook holds 12 notes. Remove a note before saving another.');
  const next = [note, ...notes];
  storage.setItem(NOTEBOOK_KEY, JSON.stringify(next));
  return next;
}
export function removeNote(storage: StorageLike, id: string): FieldNote[] {
  const next = readNotes(storage).filter(n => n.id !== id);
  storage.setItem(NOTEBOOK_KEY, JSON.stringify(next));
  return next;
}
