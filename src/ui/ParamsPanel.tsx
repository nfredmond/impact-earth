import { useStore } from '../state/store';
import { eventById } from '../data/events';
import { fmtEnergy, fmtKm, sig3 } from './fmt';

/** Log-scaled slider. */
function LogSlider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  display?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, unit, display, onChange } = props;
  const lmin = Math.log10(min);
  const lmax = Math.log10(max);
  const t = (Math.log10(Math.max(min, Math.min(max, value))) - lmin) / (lmax - lmin);
  return (
    <label className="control">
      <span className="control-label">
        {label}
        <b>
          {display ? display(value) : `${value >= 100 ? Math.round(value).toLocaleString('en-US') : value.toPrecision(3)} ${unit}`}
        </b>
      </span>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(t * 1000)}
        onChange={(e) => onChange(10 ** (lmin + (Number(e.target.value) / 1000) * (lmax - lmin)))}
      />
    </label>
  );
}

function LinSlider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step = 1, unit, onChange } = props;
  return (
    <label className="control">
      <span className="control-label">
        {label}
        <b>
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function ParamsPanel() {
  const scenario = useStore((s) => s.scenario);
  const result = useStore((s) => s.result);
  const eventId = useStore((s) => s.eventId);
  const setParams = useStore((s) => s.setParams);
  const setPlacing = useStore((s) => s.setPlacing);
  const placing = useStore((s) => s.placing);
  const replay = useStore((s) => s.replay);

  const ev = eventId ? eventById(eventId) : null;
  const p = scenario.params;

  return (
    <aside className="panel params" aria-label="Scenario parameters">
      <div className="eyebrow">Scenario console</div>
      <h2 className="params-title">{ev ? ev.name : p.kind === 'impact' ? 'Custom impact' : 'Custom eruption'}</h2>
      <div className="place-row">
        <span className="place-name" title={scenario.placeName}>
          {scenario.placeName}
        </span>
        <button className={`chip${placing ? ' active' : ''}`} onClick={() => setPlacing(!placing)}>
          {placing ? 'Click the globe…' : 'Move it'}
        </button>
      </div>

      {p.kind === 'impact' ? (
        <>
          <LogSlider
            label="Diameter"
            value={p.diameterM}
            min={10}
            max={25000}
            unit="m"
            display={(v) => (v >= 1000 ? `${(v / 1000).toPrecision(3)} km` : `${Math.round(v)} m`)}
            onChange={(v) => setParams({ diameterM: v })}
          />
          <LinSlider label="Velocity" value={p.velocityKmS} min={11} max={72} unit="km/s" onChange={(v) => setParams({ velocityKmS: v })} />
          <LinSlider label="Entry angle" value={p.angleDeg} min={5} max={90} unit="°" onChange={(v) => setParams({ angleDeg: v })} />
          <label className="control">
            <span className="control-label">Composition</span>
            <div className="seg">
              {(['comet', 'carbonaceous', 'stony', 'iron'] as const).map((t) => (
                <button
                  key={t}
                  className={`seg-btn${p.impactorType === t ? ' active' : ''}`}
                  onClick={() => setParams({ impactorType: t })}
                >
                  {t === 'carbonaceous' ? 'carbon.' : t}
                </button>
              ))}
            </div>
          </label>
          <label className="control">
            <span className="control-label">Target</span>
            <div className="seg">
              {(['land', 'ocean'] as const).map((t) => (
                <button key={t} className={`seg-btn${p.target === t ? ' active' : ''}`} onClick={() => setParams({ target: t })}>
                  {t}
                </button>
              ))}
            </div>
          </label>
          {p.target === 'ocean' && (
            <LinSlider label="Ocean depth" value={p.oceanDepthM} min={200} max={8000} step={100} unit="m" onChange={(v) => setParams({ oceanDepthM: v })} />
          )}
        </>
      ) : (
        <LogSlider
          label="Erupted volume"
          value={p.bulkVolumeKm3}
          min={0.1}
          max={5000}
          unit="km³"
          display={(v) => `${sig3(v)} km³ · VEI ${result.vei ?? ''}`}
          onChange={(v) => setParams({ bulkVolumeKm3: v })}
        />
      )}

      <div className="physics-readout">
        <div>
          <span>Energy</span>
          <b>{fmtEnergy(result.energyMt)}</b>
        </div>
        {result.airburst && (
          <div>
            <span>Airburst alt.</span>
            <b>{result.burstAltitudeKm!.toFixed(0)} km</b>
          </div>
        )}
        {result.craterFinalKm != null && !result.airburst && (
          <div>
            <span>Final crater</span>
            <b>{fmtKm(result.craterFinalKm)}</b>
          </div>
        )}
        {result.seismicMagnitude != null && result.seismicMagnitude > 4 && (
          <div>
            <span>Quake</span>
            <b>M {result.seismicMagnitude.toFixed(1)}</b>
          </div>
        )}
        {result.vei != null && (
          <div>
            <span>VEI</span>
            <b>{result.vei}</b>
          </div>
        )}
        {result.global.coolingC > 0.2 && (
          <div>
            <span>Global cooling</span>
            <b>−{result.global.coolingC.toFixed(1)} °C</b>
          </div>
        )}
      </div>
      <div className="comparisons">
        {result.comparisons.map((c) => (
          <div key={c} className="comparison-line">
            {c}
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={replay}>
        Replay the event
      </button>

      {ev && (
        <details className="facts" open={false}>
          <summary>{ev.category === 'whatif' ? 'The counterfactual' : 'What actually happened'}</summary>
          <p className="blurb">{ev.blurb}</p>
          <ul>
            {ev.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="legend">
        <div className="eyebrow">Damage rings</div>
        {result.zones.map((z) => (
          <div key={z.id} className="legend-row" title={z.description}>
            <i style={{ background: z.color }} />
            <span>{z.label}</span>
            <b>{fmtKm(z.radiusKm)}</b>
          </div>
        ))}
        {result.tsunami && (
          <div className="legend-note">
            Tsunami: {result.tsunami.amplitudeAtKm.map((a) => `${a.meters.toFixed(0)} m @ ${a.km} km`).join(' · ')} (deep water)
          </div>
        )}
      </div>
    </aside>
  );
}
