import { useEffect, useId, useRef, useState } from 'react';
import { footprintDiameterKm } from '../physics/observer';
import { useStore } from '../state/store';
import { useView } from '../state/view';
import { fmtKm, sig3 } from './fmt';

const TOWER_HEIGHT_M = 330;

export function ScalePanel() {
  const scenario = useStore((s) => s.scenario);
  const result = useStore((s) => s.result);
  const observer = useView((s) => s.observer);
  const footprint = useView((s) => s.footprint);
  const [reference, setReference] = useState<'tower' | 'kilometer'>('tower');
  const [studio, setStudio] = useState(false);
  const isImpact = scenario.params.kind === 'impact';
  const sizeM = scenario.params.kind === 'impact' ? scenario.params.diameterM : Math.cbrt(scenario.params.bulkVolumeKm3) * 1000;
  const referenceM = reference === 'tower' ? TOWER_HEIGHT_M : 1000;
  const diameterKm = footprintDiameterKm(result);
  const ratio = sizeM / referenceM;

  return <section className="scale-panel" aria-label="Scale comparisons">
    <div className="inspector-intro"><span className="scale-kicker">Make the size tangible</span><h2>A sense of scale</h2><p>{isImpact ? 'The incoming object, measured against a familiar height.' : 'The erupted material, gathered into one equivalent cube.'}</p></div>
    <div className="scale-reference seg">
      <button className={`seg-btn${reference === 'tower' ? ' active' : ''}`} aria-pressed={reference === 'tower'} onClick={() => setReference('tower')}>Eiffel Tower</button>
      <button className={`seg-btn${reference === 'kilometer' ? ' active' : ''}`} aria-pressed={reference === 'kilometer'} onClick={() => setReference('kilometer')}>1 km ruler</button>
    </div>
    <ScaleGraphic isImpact={isImpact} sizeM={sizeM} reference={reference} />
    <button className="btn open-studio" onClick={() => setStudio(true)}>Open scale studio</button>
    {studio && <ScaleStudio onClose={() => setStudio(false)} />}
    <div className="scale-ratio"><b>{sig3(ratio)}×</b><span>{isImpact ? 'the reference height in diameter' : 'the reference height along each edge'}</span></div>
    {reference === 'tower' && <a className="source-link" href="https://www.toureiffel.paris/en/news/history-and-culture/300-330-meters-story-towers-height" target="_blank" rel="noreferrer">330 m including antenna. Source: Eiffel Tower</a>}
    <div className="footprint-card">
      <h3>{isImpact ? 'The crater footprint' : 'The caldera footprint'}</h3>
      {diameterKm != null ? <>
        <div className="footprint-stats"><span><b>{fmtKm(diameterKm)}</b>modeled diameter</span><span><b>{sig3(Math.PI * (diameterKm / 2) ** 2)} km²</b>circular area</span></div>
        <p>Place an outline of this size at your observer location to compare it with the surrounding geography.</p>
        {observer ? <><button className="btn observer-btn footprint-toggle" aria-pressed={footprint} onClick={() => {
          useView.setState({ footprint: !footprint });
          useView.getState().lookAt('observer');
          if (window.matchMedia('(max-width: 900px)').matches) window.scrollTo({ top: 0, behavior: 'instant' });
        }}>{footprint ? 'Hide' : 'Show'} footprint at {observer.name}</button><p className="model-note">Cyan dashed outline is a size comparison. Ground zero and calculated effects stay at the event location.</p></> : <button className="btn observer-btn" onClick={() => useView.setState({ inspector: 'observer' })}>Choose a comparison location</button>}
      </> : <p className="model-note">{result.airburst ? 'This object bursts in the atmosphere. The model does not produce a surface crater.' : 'No crater footprint is available for this scenario.'}</p>}
    </div>
  </section>;
}


function ScaleGraphic({ isImpact, sizeM, reference }: { isImpact: boolean; sizeM: number; reference: 'tower' | 'kilometer' }) {
  const id = useId();
  const referenceM = reference === 'tower' ? TOWER_HEIGHT_M : 1000;
  const factor = 170 / Math.max(sizeM, referenceM);
  const objectPx = sizeM * factor;
  const referencePx = referenceM * factor;
  return (
    <figure className="scale-figure">
      <svg viewBox="0 0 320 270" role="img" aria-label={`${isImpact ? 'Object diameter' : 'Equivalent cube side'} ${fmtKm(sizeM / 1000)}, compared with ${referenceM} meters. Both use the same linear scale.`}>
        <defs><radialGradient id={`${id}-shade`} cx="30%" cy="25%"><stop stopColor="#d9b090" /><stop offset=".55" stopColor="#79635c" /><stop offset="1" stopColor="#272a35" /></radialGradient><pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#71879c" strokeOpacity=".12" /></pattern></defs>
        <rect width="320" height="225" fill={`url(#${id}-grid)`} />
        <path d="M16 222H306" stroke="#8395ac" strokeWidth="1" />
        {reference === 'tower' ? <g transform={`translate(${67 - referencePx * .19} ${220 - referencePx}) scale(${referencePx / 330})`} fill="#9ed9df" stroke="#9ed9df" strokeWidth="3">
          <path d="M62.7 0L59 45L52 110L42 177L32 225L0 330H30L48 266Q62.7 240 77 266L95 330H125.4L93 225L83 177L73 110L66 45Z" fillOpacity=".2" />
          <path d="M42 177H83M32 225H93M54 105H72M33 225L83 177M92 225L42 177M48 265H77M52 110L83 177M73 110L42 177" fill="none" />
        </g> : <g stroke="#9ed9df"><path d={`M67 ${220 - referencePx}V220M54 ${220 - referencePx}H80M54 220H80`} strokeWidth="2" />{[.25, .5, .75].map((part) => <path key={part} d={`M61 ${220 - referencePx * part}H73`} />)}</g>}
        {isImpact ? <g><circle cx="221" cy={220 - objectPx / 2} r={objectPx / 2} fill={`url(#${id}-shade)`} stroke="#e4b28c" strokeWidth=".8" /><ellipse cx={221 - objectPx * .17} cy={220 - objectPx * .65} rx={objectPx * .1} ry={objectPx * .07} fill="#302d36" opacity=".6" /><circle cx={221 + objectPx * .19} cy={220 - objectPx * .33} r={objectPx * .07} fill="#302d36" opacity=".5" /></g> : <rect x={221 - objectPx / 2} y={220 - objectPx} width={objectPx} height={objectPx} fill="#8f7c6a" fillOpacity=".7" stroke="#e4b28c" />}
        <text x="67" y="244" textAnchor="middle">{reference === 'tower' ? 'Eiffel Tower' : 'Reference length'}</text><text x="67" y="261" textAnchor="middle" className="svg-value">{fmtKm(referenceM / 1000)}</text>
        <text x="221" y="244" textAnchor="middle">{isImpact ? 'Object diameter' : 'Cube side'}</text><text x="221" y="261" textAnchor="middle" className="svg-value">{fmtKm(sizeM / 1000)}</text>
      </svg>
      <figcaption>Shared linear scale. {isImpact ? 'Object shape is illustrative.' : 'Cube represents bulk volume, not plume dimensions.'}{Math.min(referencePx, objectPx) < 1 ? ' The smaller shape may be difficult to see at this scale.' : ''}</figcaption>
    </figure>
  );
}

function ScaleStudio({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const params = useStore((s) => s.scenario.params);
  const setParams = useStore((s) => s.setParams);
  const original = useRef(params);
  const [reference, setReference] = useState<'tower' | 'kilometer'>('tower');
  const isImpact = params.kind === 'impact';
  const sizeM = params.kind === 'impact' ? params.diameterM : Math.cbrt(params.bulkVolumeKm3) * 1000;
  const value = params.kind === 'impact' ? params.diameterM : params.bulkVolumeKm3;
  const change = (next: number) => setParams(params.kind === 'impact' ? { diameterM: next } : { bulkVolumeKm3: next });
  useEffect(() => { dialog.current?.showModal(); }, []);

  return <dialog className="scale-studio" ref={dialog} aria-labelledby="studio-title" onClose={onClose} onCancel={(e) => e.stopPropagation()}>
    <header><div><span className="scale-kicker">An experiment in scale</span><h2 id="studio-title">{isImpact ? 'Explore object size.' : 'Compare erupted volumes.'}</h2></div><button className="studio-close" aria-label="Close scale studio" onClick={() => dialog.current?.close()}>×</button></header>
    <div className="studio-body">
      <ScaleGraphic isImpact={isImpact} sizeM={sizeM} reference={reference} />
      <div className="studio-controls">
        <span className="small-label">{isImpact ? 'Incoming diameter' : 'Equivalent cube side'}</span>
        <div className="studio-dimension">{fmtKm(sizeM / 1000)}</div>
        <p>{isImpact ? 'Change the diameter to see how the object compares with a familiar height. The scenario updates as you explore.' : 'Each square face shows the side of a cube holding the bulk erupted volume. This is a volume comparison, not the shape of the ash cloud.'}</p>
        <div className="scale-reference seg"><button className={`seg-btn${reference === 'tower' ? ' active' : ''}`} onClick={() => setReference('tower')} aria-pressed={reference === 'tower'}>Eiffel Tower</button><button className={`seg-btn${reference === 'kilometer' ? ' active' : ''}`} onClick={() => setReference('kilometer')} aria-pressed={reference === 'kilometer'}>1 km ruler</button></div>
        <label className="studio-slider"><span>{isImpact ? 'Diameter' : 'Erupted volume'}<b>{isImpact ? fmtKm(value / 1000) : `${sig3(value)} km³`}</b></span><input type="range" aria-label={isImpact ? 'Studio object diameter' : 'Studio erupted volume'} aria-valuetext={isImpact ? fmtKm(value / 1000) : `${sig3(value)} cubic kilometers`} min={isImpact ? 1 : -1} max={Math.log10(isImpact ? 25000 : 5000)} step={0.005} value={Math.log10(value)} onChange={(e) => change(10 ** Number(e.target.value))} /></label>
        <div className="studio-presets">{(isImpact ? [20, 60, 500, 14000] : [1, 20, 100, 1000]).map((size) => <button className="chip" key={size} onClick={() => change(size)}>{isImpact ? fmtKm(size / 1000) : `${size} km³`}</button>)}</div>
        <div className="studio-ratio"><b>{sig3(sizeM / (reference === 'tower' ? TOWER_HEIGHT_M : 1000))}×</b> the reference height</div>
        <button className="text-button" onClick={() => setParams(original.current)}>Restore starting dimensions</button>
        {reference === 'tower' && <a className="source-link" href="https://www.toureiffel.paris/en/news/history-and-culture/300-330-meters-story-towers-height" target="_blank" rel="noreferrer">Eiffel Tower: 330 m including antenna</a>}
      </div>
    </div>
    <footer>One linear scale for both objects. Diagram shapes are illustrative.</footer>
  </dialog>;
}
