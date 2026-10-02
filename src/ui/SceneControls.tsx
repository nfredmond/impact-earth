import { useEffect } from 'react';
import { useStore } from '../state/store';
import { useView } from '../state/view';
import { eventById } from '../data/events';
import { fmtEnergy, fmtKm } from './fmt';
import { assessObserver, footprintDiameterKm } from '../physics/observer';

export function SceneControls() {
  const scenario = useStore((s) => s.scenario);
  const result = useStore((s) => s.result);
  const eventId = useStore((s) => s.eventId);
  const placing = useStore((s) => s.placing);
  const replay = useStore((s) => s.replay);
  const view = useView();
  const event = eventId ? eventById(eventId) : null;
  const assessment = view.observer ? assessObserver(scenario, result, view.observer) : null;
  const phase = !view.running ? 'Effects overview' : view.elapsed < (scenario.params.kind === 'impact' ? 2.1 : 0.4)
    ? (scenario.params.kind === 'impact' ? 'Incoming object' : 'Eruption begins')
    : view.elapsed < 4 ? (result.airburst ? 'Airburst' : scenario.params.kind === 'impact' ? 'Impact & expansion' : 'Column & surge')
    : 'Effects spread';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useView.setState({ focus: false, pickingObserver: false });
        useStore.getState().setPlacing(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div className="scene-heading">
        <span className="scene-kind">{result.airburst ? 'Airburst' : scenario.params.kind === 'impact' ? 'Asteroid impact' : 'Caldera eruption'}</span>
        <h1>{event?.name ?? (scenario.params.kind === 'impact' ? 'Custom impact' : 'Custom eruption')}</h1>
        <p>{Math.abs(scenario.lat).toFixed(2)}° {scenario.lat >= 0 ? 'N' : 'S'} &nbsp; {Math.abs(scenario.lng).toFixed(2)}° {scenario.lng >= 0 ? 'E' : 'W'} <span>{fmtEnergy(result.energyMt)}</span></p>
        <button className="observer-scene-link" onClick={() => {
          useView.setState({ inspector: 'observer', mobilePanel: 'params', focus: false });
          if (window.matchMedia('(max-width: 900px)').matches) document.querySelector('.mobile-nav')?.scrollIntoView({ behavior: 'instant' });
        }}><span className="observer-dot" />{view.observer && assessment ? <span>{view.observer.name}<small>{fmtKm(assessment.distanceKm)} from ground zero</small></span> : <span>Watch from your city<small>Choose an observer location</small></span>}</button>
      </div>
      <div className="scene-tools" aria-label="Globe controls">
        <button className="scene-tool" onClick={view.frameEvent} title="Return to the event location">◎ <span>Recenter</span></button>
        <button className="scene-tool" aria-pressed={view.focus} onClick={() => view.toggle('focus')} title="Hide panels. Escape restores them.">{view.focus ? '⊡' : '⛶'} <span>{view.focus ? 'Exit focus' : 'Focus'}</span></button>
      </div>
      {(placing || view.pickingObserver) && (
        <div className="placement-banner" role="status">
          {view.pickingObserver ? 'Choose your observation point' : 'Select a point on Earth'}
          <button className="chip" onClick={() => { useStore.getState().setPlacing(false); useView.setState({ pickingObserver: false }); }}>Cancel</button>
        </div>
      )}
      <div className="scene-bottom">
        {view.footprint && view.observer && footprintDiameterKm(result) != null && <div className="footprint-caption">Dashed cyan circle: hypothetical footprint at {view.observer.name}</div>}
        <div className="scene-layers" aria-label="Visible layers">
          {(['zones', 'clouds', 'haze', 'orbit'] as const).map((key) => (
            <button key={key} className="layer-toggle" aria-pressed={view[key]} onClick={() => view.toggle(key)}>
              <span aria-hidden="true" className="layer-dot" />{key === 'zones' ? 'Damage zones' : key === 'haze' ? 'Dust haze' : key === 'orbit' ? 'Auto orbit' : 'Clouds'}
            </button>
          ))}
        </div>
        <div className="playback">
          <button className="play-button" aria-label={view.running ? view.paused ? 'Resume animation' : 'Pause animation' : 'Replay animation'} onClick={() => view.running ? view.toggle('paused') : replay()}>
            {view.running && !view.paused ? 'Ⅱ' : '▶'}
          </button>
          <div className="playback-status">
            <div><span>{view.paused && view.running ? 'Paused' : phase}</span><span className="animation-note">Illustrative sequence</span></div>
            <progress aria-label="Animation progress" max={8} value={view.elapsed} />
          </div>
          <select aria-label="Animation speed" value={view.speed} onChange={(e) => view.setSpeed(Number(e.target.value))}>
            <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option>
          </select>
          <button className="restart-button" onClick={replay} aria-label="Restart animation" title="Restart animation">↺</button>
        </div>
        <p className="orbit-hint">Drag to orbit · Scroll or pinch to zoom</p>
      </div>
    </>
  );
}
