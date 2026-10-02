import { useEffect, useRef, useState } from 'react';
import { useStory } from '../state/story';
import { useStore } from '../state/store';
import { useView } from '../state/view';
import { BASELINE_RESULT, BASELINE_SCENARIO, MATERIALS, STORY_SOURCES, storyObserver } from '../stories/tunguska';
import { makeNote, saveNote } from '../stories/notebook';
import { downloadFieldNote } from '../stories/exportNote';
import { assessObserver } from '../physics/observer';
import { AtmosphereDiagram } from './AtmosphereDiagram';
import { fmtEnergy, fmtKm } from './fmt';
import type { SimulationResult } from '../types';

const CHAPTERS = [
  { short: 'The event', title: 'A morning over Siberia.', text: 'On June 30, 1908, an object from space exploded over the Tunguska region. Witnesses described a fireball, a flash, and a powerful blast.', evidence: 'Historical account', source: 0 },
  { short: 'The airburst', title: 'The atmosphere changes everything.', text: 'As the object enters denser air, it slows and breaks apart. This preset releases its energy above the ground. The burst height below comes from the app, not a direct measurement of the event.', evidence: 'Model explanation', source: 1 },
  { short: 'The observer', title: 'Put distance into perspective.', text: 'Choose an observation point south of the event. Follow its route on Earth and see which modeled zones reach it. These points are experiments, not historical witness locations.', evidence: 'Location experiment', source: null },
  { short: 'The experiment', title: 'Same size. Different material.', text: 'Keep diameter, speed, and entry angle fixed. Change the composition and compare the outcome with the stone baseline. Composition changes density, mass, and strength together.', evidence: 'Hypothetical comparison', source: null },
  { short: 'Your field note', title: 'Keep what you discovered.', text: 'Your experiment has a fixed baseline, a changed material, and an observation point. Save those choices with the model results, or download a standalone note.', evidence: 'Your model results', source: null },
];

export function StoryStage() {
  const chapter = useStory(s => s.chapter);
  const material = useStory(s => s.material);
  const result = useStore(s => s.result);
  const label = MATERIALS.find(m => m.value === material)!.label;
  const diagrams = chapter === 1 || chapter === 3;
  return <div className={`story-stage-content${diagrams ? ' diagram-stage' : ''}`}>
    <div className="story-stage-title"><span>Tunguska / 30 June 1908</span><h1>{chapter === 0 ? <>The day the<br/>sky broke.</> : chapter === 1 ? 'An explosion in the air.' : chapter === 2 ? 'A point on the ground.' : chapter === 3 ? 'Change the rock.' : 'An experiment to keep.'}</h1></div>
    {diagrams ? <div className={`story-diagrams${chapter === 3 ? ' is-comparison' : ''}`}>
      <AtmosphereDiagram result={BASELINE_RESULT} label="Stone baseline" ceiling={Math.max(30, Math.ceil((result.burstAltitudeKm ?? 0) / 10) * 10)}/>
      {chapter === 3 && <AtmosphereDiagram result={result} label={`${label} experiment`} ceiling={Math.max(30, Math.ceil((result.burstAltitudeKm ?? 0) / 10) * 10)}/>}
      <p className="diagram-key">Height uses a {Math.max(30, Math.ceil((result.burstAltitudeKm ?? 0) / 10) * 10)} km scale. Object, trail, and glow are illustrative. {chapter === 3 ? 'Both panels use the same scale.' : 'This diagram does not show elapsed time.'}</p>
    </div> : <div className="story-map-caption"><span>{chapter === 0 ? '60.886° N / 101.894° E' : 'Cyan marks the experiment observer'}</span><p>{chapter === 0 ? 'Podkamennaya Tunguska, Siberia' : 'Drag to orbit. Scroll or pinch to zoom.'}</p><button className="btn" onClick={() => useView.getState().lookAt(chapter >= 2 ? 'route' : 'event')}>Reset view</button></div>}
  </div>;
}

function ResultComparison({ result }: { result: SimulationResult }) {
  return <div className="story-comparison"><table><caption>Calculated outcomes</caption><thead><tr><th scope="col">Result</th><th scope="col">Stone</th><th scope="col">Experiment</th></tr></thead><tbody>
    <tr><th scope="row">Outcome</th><td>Airburst</td><td>{result.airburst ? 'Airburst' : 'Surface impact'}</td></tr>
    <tr><th scope="row">Energy</th><td>{fmtEnergy(BASELINE_RESULT.energyMt)}</td><td>{fmtEnergy(result.energyMt)}</td></tr>
    <tr><th scope="row">Burst height</th><td>{fmtKm(BASELINE_RESULT.burstAltitudeKm ?? 0)}</td><td>{result.airburst ? fmtKm(result.burstAltitudeKm ?? 0) : 'Surface'}</td></tr>
    <tr><th scope="row">Crater width</th><td>None modeled</td><td>{result.airburst ? 'None modeled' : fmtKm(result.craterFinalKm ?? 0)}</td></tr>
  </tbody></table></div>;
}

export function StoryExperience() {
  const story = useStory();
  const result = useStore(s => s.result);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState('My Tunguska experiment');
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState(false);
  const chapter = CHAPTERS[story.chapter];
  const observer = storyObserver(story.distanceKm);
  const assessment = assessObserver(BASELINE_SCENARIO, result, observer);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); if (body.current) body.current.scrollTop = 0; }, [story.chapter]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) useStory.getState().explore();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const save = () => {
    try { saveNote(localStorage, makeNote(title, story.material, story.distanceKm)); setSaveError(false); setNotice('Saved on this device. Open Field notes to find it again.'); }
    catch (error) { setSaveError(true); setNotice(error instanceof Error && error.message.includes('12 notes') ? error.message : 'Could not save on this device. Download a note to keep a copy. Existing notes are unchanged.'); }
  };
  return <aside className="story-reader" aria-label="Tunguska guided story">
    <nav className="story-chapters" aria-label="Story chapters">{CHAPTERS.map((ch, i) => <button key={ch.short} aria-label={`Chapter ${i+1}: ${ch.short}`} aria-current={story.chapter === i ? 'step' : undefined} onClick={() => { setNotice(''); story.go(i); }}><span>{String(i+1).padStart(2,'0')}</span><small>{ch.short}</small></button>)}</nav>
    <div className="story-reader-body" ref={body}>
      <div className="story-evidence">{chapter.evidence}<span>{story.chapter+1} / 5</span></div>
      <h2 ref={heading} tabIndex={-1}>{chapter.title}</h2><p className="story-prose">{chapter.text}</p>
      {story.chapter === 0 && <><div className="story-history"><span>From the field record</span><p>The first scientific expedition to reach the site arrived in 1927. Fallen trees still recorded the force of the explosion.</p></div><p className="story-prose secondary">Follow the evidence, inspect the model, then change one assumption yourself. Advance at your own pace.</p></>}
      {story.chapter === 1 && <><div className="story-inputs"><span>Catalog inputs</span><dl><div><dt>Diameter</dt><dd>55 m</dd></div><div><dt>Entry speed</dt><dd>15 km/s</dd></div><div><dt>Entry angle</dt><dd>35°</dd></div></dl></div><div className="story-callout"><b>{fmtKm(BASELINE_RESULT.burstAltitudeKm ?? 0)}</b><span>Calculated burst altitude</span></div><p className="model-note">The object's original properties remain uncertain. This preset is one model configuration, not a unique reconstruction.</p></>}
      {story.chapter === 2 && <><fieldset className="story-distance"><legend>Distance south of ground zero</legend>{[20,60,120].map(km=><button key={km} aria-pressed={story.distanceKm === km} onClick={()=>story.setDistance(km)}>{km} km</button>)}</fieldset><div className="story-observer-result"><strong>{assessment.zones.length ? `${assessment.zones.length} modeled ${assessment.zones.length === 1 ? "zone reaches" : "zones reach"} this point` : 'Outside the modeled local zones'}</strong>{assessment.zones.length ? <ul>{assessment.zones.map(z=><li key={z.id}><span style={{ background: z.color }}/>{z.label}</li>)}</ul> : <p>Being outside these circles is not a finding of safety.</p>}</div><p className="model-note">Circular zones simplify the event. The model does not resolve terrain shielding, blast direction, sightlines, or arrival times.</p><button className="btn" onClick={()=>{ useView.getState().lookAt('observer'); if (window.matchMedia('(max-width: 900px)').matches) window.scrollTo({ top: 0, behavior: 'instant' }); }}>Look at the observer</button></>}
      {story.chapter === 3 && <><fieldset className="story-materials"><legend>Experiment material</legend>{MATERIALS.map(m=><button key={m.value} aria-pressed={story.material===m.value} onClick={()=>story.setMaterial(m.value)}><b>{m.label}</b><small>{m.description}</small></button>)}</fieldset><ResultComparison result={result}/><p className="model-note">Both objects are 55 m across and enter at 15 km/s and 35°. Composition is the changed input. Energy is TNT equivalent.</p></>}
      {story.chapter === 4 && <><ResultComparison result={result}/><p className="model-note">Observation point: {story.distanceKm} km south. {assessment.zones.length} modeled local zones reach it.</p><label className="story-note-label" htmlFor="story-note-title">Name your field note</label><input id="story-note-title" className="catalog-search" maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/><div className="story-save-actions"><button className="story-primary" onClick={save}>Save field note</button><button className="btn" onClick={()=>downloadFieldNote(makeNote(title,story.material,story.distanceKm))}>Download note</button></div>{notice && <p className="save-notice" role={saveError ? 'alert' : 'status'}>{notice}</p>}<button className="text-button" onClick={()=>story.close(true)}>Continue with this scenario in the simulator</button></>}
      {chapter.source !== null && <a className="story-source" href={STORY_SOURCES[chapter.source].url} target="_blank" rel="noreferrer">{STORY_SOURCES[chapter.source].label} ↗</a>}
    </div>
    <footer className="story-navigation"><div><button className="btn" disabled={story.chapter===0} onClick={()=>{setNotice('');story.go(story.chapter-1);}}>Back</button>{story.chapter<4 ? <button className="story-primary" onClick={()=>{setNotice('');story.go(story.chapter+1);}}>Next: {CHAPTERS[story.chapter+1].short}</button> : <button className="btn" onClick={()=>story.close()}>Return to previous scenario</button>}</div><button className="text-button" onClick={story.explore}>Pause story and explore</button></footer>
  </aside>;
}
