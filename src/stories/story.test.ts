import { afterEach, describe, expect, it, vi } from 'vitest';
import { simulate } from '../physics';
import { haversineKm } from '../data/cities';
import { BASELINE_RESULT, BASELINE_SCENARIO, storyObserver, tunguskaScenario } from './tunguska';
import { makeNote, NOTEBOOK_KEY, readNotes, removeNote, saveNote } from './notebook';
import { buildFieldNoteHtml } from './exportNote';

const memoryStorage = () => {
  const values = new Map<string,string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key,value); } };
};
afterEach(() => vi.restoreAllMocks());

describe('Tunguska experiment', () => {
  it('changes only material and produces a different atmospheric outcome', () => {
    const iron = tunguskaScenario('iron');
    expect({ ...iron, params: { ...iron.params, impactorType: 'stony' } }).toEqual(BASELINE_SCENARIO);
    expect(BASELINE_RESULT.airburst).toBe(true);
    expect(simulate(iron.params).airburst).toBe(false);
    expect(BASELINE_SCENARIO.params).toMatchObject({ impactorType: 'stony' });
  });
  it('places the experiment point the requested distance due south', () => {
    const observer = storyObserver(120);
    expect(haversineKm(BASELINE_SCENARIO.lat, BASELINE_SCENARIO.lng, observer.lat, observer.lng)).toBeCloseTo(120, 6);
    expect(observer.lat).toBeLessThan(BASELINE_SCENARIO.lat);
    expect(observer.lng).toBe(BASELINE_SCENARIO.lng);
  });
});

describe('field notes', () => {
  it('persists independent notes and removes only the selected note', () => {
    const storage = memoryStorage();
    const first = makeNote('First', 'iron', 60), second = makeNote('Second', 'comet', 120);
    saveNote(storage, first); saveNote(storage, second);
    expect(readNotes(storage)).toEqual([second, first]);
    expect(removeNote(storage, first.id)).toEqual([second]);
    expect(readNotes(storage)).toEqual([second]);
  });
  it.each(['not JSON', JSON.stringify([{ schema: 2 }]), JSON.stringify([{ ...makeNote('Bad', 'iron', 60), distanceKm: -30 }]), JSON.stringify([{ ...makeNote('Bad', 'iron', 60), material: 'unknown' }]), JSON.stringify([{ ...makeNote('Bad', 'iron', 60), experiment: { energyMt: null } }])])('does not overwrite unreadable stored notes: %s', raw => {
    const storage = memoryStorage(); storage.setItem(NOTEBOOK_KEY,raw);
    expect(() => saveNote(storage,makeNote('New','iron',60))).toThrow();
    expect(storage.getItem(NOTEBOOK_KEY)).toBe(raw);
  });
  it('reports a storage failure without claiming a save', () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error('quota exceeded'); };
    expect(() => saveNote(storage,makeNote('Note','iron',60))).toThrow('quota exceeded');
    expect(readNotes(storage)).toEqual([]);
  });
  it('keeps all existing notes when the notebook is full', () => {
    const storage = memoryStorage();
    for (let i=0;i<12;i++) saveNote(storage,makeNote(`Note ${i}`,'iron',60));
    const before = storage.getItem(NOTEBOOK_KEY);
    expect(()=>saveNote(storage,makeNote('Thirteenth','iron',60))).toThrow('12 notes');
    expect(storage.getItem(NOTEBOOK_KEY)).toBe(before);
  });
  it('exports escaped text and saved results rather than silently recomputing', () => {
    const note = makeNote('<img src=x onerror=alert(1)>', 'iron', 60);
    note.experiment.energyMt = 1234;
    const html = buildFieldNoteHtml(note);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
    expect(html).toContain('1,230 Mt');
    expect(html).toContain('not measurements');
  });
});
