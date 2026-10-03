import { useState } from 'react';
import { decodeFile, downloadScenario, makeFile, readScenarios, removeScenario, saveScenario, type SavedScenario, type ScenarioFile } from '../lab/scenarios';
import { useStore } from '../state/store';
import { useView } from '../state/view';
import { useLab } from '../state/lab';
import { useStory } from '../state/story';
import { formatYear } from '../casualties/eras';

export function ScenarioLibrary({ close }: { close(): void }) {
  const [initial] = useState(() => { try { return { records: readScenarios(localStorage), error: '' }; } catch { return { records: [] as SavedScenario[], error: 'Saved scenarios could not be read. Existing data has been left intact.' }; } });
  const [records, setRecords] = useState<SavedScenario[]>(initial.records), [name, setName] = useState('My experiment');
  const [error, setError] = useState(initial.error), [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<ScenarioFile | null>(null), [pending, setPending] = useState<string | null>(null);
  const act = (fn: () => void) => { try { fn(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'The notebook could not be updated.'); setNotice(''); } };
  const current = () => makeFile(name, { scenario: useStore.getState().scenario, observer: useView.getState().observer, baseline: useLab.getState().baseline });
  const open = (file: ScenarioFile) => {
    if (useStory.getState().active) useStory.getState().close(true);
    useStore.getState().loadScenario(file.scenario, null);
    if (file.baseline) useLab.getState().pin(file.baseline); else useLab.getState().clear();
    useView.setState({ observer: file.observer, pickingObserver: false, footprint: false, inspector: file.baseline ? 'compare' : 'scenario', mobilePanel: 'params', mapCenter: 'event', focus: false });
    useView.getState().frameEvent(); close();
  };
  return <div className="scenario-library">
    <p>Keep an impact or eruption with its observer and comparison baseline. Files contain editable inputs. Opening a scenario recalculates results with the installed model.</p>
    <form onSubmit={e => { e.preventDefault(); act(() => { setRecords(saveScenario(localStorage, current())); setNotice('Scenario saved on this device.'); }); }}>
      <label className="lab-field">Scenario name<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
      <div className="lab-actions"><button className="story-primary" type="submit">Save current scenario</button><button className="btn" type="button" onClick={() => act(() => downloadScenario(current()))}>Export current JSON</button></div>
    </form>
    <label className="lab-field import-scenario">Import a scenario file<input type="file" accept=".json,application/json" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; setPreview(null); setNotice(''); if (!file) return;
      try { if (file.size > 100000) throw new Error('Scenario files must be smaller than 100 KB.'); const parsed = decodeFile(await file.text()); setPreview(parsed); setError(''); }
      catch (e) { setError(e instanceof Error ? e.message : 'The file could not be read.'); }
    }} /></label>
    {preview && <div className="import-preview"><h3>{preview.name}</h3><p>{preview.scenario.placeName} · {formatYear(preview.scenario.year)} · {preview.scenario.params.kind}</p><p>{preview.scenario.lat.toFixed(3)}°, {preview.scenario.lng.toFixed(3)}° · {preview.baseline ? 'Includes baseline' : 'No baseline'} · Model: {preview.model}</p><button className="btn" onClick={() => act(() => { setRecords(saveScenario(localStorage, preview)); setPreview(null); setNotice('Imported into the notebook. Open it below to change the current scenario.'); })}>Import into notebook</button><button className="text-button" onClick={() => setPreview(null)}>Cancel import</button></div>}
    {error && <p className="save-notice" role="alert">{error}</p>}{notice && <p role="status" className="save-notice">{notice}</p>}
    <h3>Saved scenarios <small>{records.length} / 24</small></h3>
    {!records.length && <p className="model-note">Save the current scenario or import a file to begin.</p>}
    <ul className="note-list scenario-list">{records.map(record => <li key={record.id}><h3>{record.name}</h3><p>{record.scenario.placeName} · {formatYear(record.scenario.year)} · {record.scenario.params.kind}{record.baseline ? ' · with baseline' : ''}</p><div className="note-actions"><button className="btn" onClick={() => open(record)}>Open scenario</button><button className="btn" onClick={() => act(() => downloadScenario(record))}>Export JSON</button>{pending === record.id ? <><button className="text-button" onClick={() => act(() => { setRecords(removeScenario(localStorage, record.id)); setPending(null); })}>Confirm removal</button><button className="text-button" onClick={() => setPending(null)}>Cancel</button></> : <button className="text-button" onClick={() => setPending(record.id)}>Remove</button>}</div></li>)}</ul>
    <p className="model-note">Stored locally. Clearing app data removes saved scenarios. Export JSON files to keep independent copies.</p>
  </div>;
}
