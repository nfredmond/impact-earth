import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { useLab } from '../state/lab';
import { useView } from '../state/view';
import { INPUTS, sweep, type SensitivityInput } from '../lab/sensitivity';
import { fmtEnergy, fmtKm } from './fmt';

export function SensitivityPanel() {
  const scenario = useStore(s => s.scenario);
  const [choice, setChoice] = useState<SensitivityInput>('diameterM'), [spread, setSpread] = useState(20);
  const key = scenario.params.kind === 'eruption' ? 'bulkVolumeKm3' : choice === 'bulkVolumeKm3' ? 'diameterM' : choice;
  const input = INPUTS[key];
  const rows = useMemo(() => sweep(scenario, key, spread), [scenario, key, spread]);
  const max = Math.max(...rows.map(r => r.result.energyMt));
  return <section className="lab-panel" aria-label="Sensitivity experiment">
    <div className="inspector-intro"><h2>Test the assumption.</h2><p>Change one input below and above its current value. All other inputs remain fixed.</p></div>
    <label className="lab-field">Input<select value={key} onChange={e => setChoice(e.target.value as SensitivityInput)}>{(scenario.params.kind === 'eruption' ? ['bulkVolumeKm3'] : ['diameterM', 'velocityKmS', 'angleDeg']).map(k => <option key={k} value={k}>{INPUTS[k as SensitivityInput].label}</option>)}</select></label>
    <label className="lab-field">Variation<select value={spread} onChange={e => setSpread(Number(e.target.value))}>{[10,20,30,50].map(n => <option key={n} value={n}>±{n}% of current input</option>)}</select></label>
    <p className="sensitivity-warning">These are sensitivity cases, not confidence intervals or event probabilities. The middle case is your current input, not a best estimate.</p>
    <div className="sensitivity-cases">{rows.map((row, i) => <article key={i}>
      <header><span>{['Lower input', 'Current input', 'Higher input'][i]}</span><strong>{Number(row.value.toPrecision(4))} {input.unit}</strong></header>
      <div className="sensitivity-bar" aria-hidden="true"><i style={{ width: `${max ? row.result.energyMt / max * 100 : 0}%` }} /></div>
      <dl><div><dt>Energy</dt><dd>{fmtEnergy(row.result.energyMt)}</dd></div><div><dt>Outcome</dt><dd>{row.result.kind === 'eruption' ? `VEI ${row.result.vei}` : row.result.airburst ? 'Airburst' : 'Surface impact'}</dd></div><div><dt>Outer zone</dt><dd>{fmtKm(Math.max(0, ...row.result.zones.map(z => z.radiusKm)))}</dd></div></dl>
      {i !== 1 && <button className="text-button" onClick={() => { useLab.getState().pin(scenario); useStore.getState().loadScenario(row.scenario, null); useView.setState({ inspector: 'compare' }); }}>Compare this case with current</button>}
    </article>)}</div>
    <p className="model-note">Inputs stop at supported limits: {input.min} to {input.max} {input.unit}. Cases can coincide at a limit. Energy bars share one zero-based scale.</p>
    <details className="assumption-notes" open><summary>What drives these results</summary><p>{scenario.params.kind === 'impact' ? 'Diameter and composition determine mass. Entry speed and angle affect atmospheric energy loss, airburst, and surface impact. Changing composition also changes density and strength.' : 'Bulk erupted volume drives this model’s energy, caldera, ash, and global-effect estimates. It does not resolve a particular volcano’s plumbing or eruption sequence.'}</p><p>Effect zones use circular radii. Population results use a gridded population estimate scaled to the selected era. Death estimates add assumed zone lethality and modeled famine effects. Economic estimates depend on those losses and era-level economic assumptions.</p><p>Terrain, buildings, emergency response, and local vulnerability remain unresolved. Future and ancient scenarios add demographic uncertainty. The three cases do not quantify these omitted uncertainties.</p></details>
  </section>;
}
