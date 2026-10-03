import { useMemo } from 'react';
import { useStore } from '../state/store';
import { useLab } from '../state/lab';
import { useView } from '../state/view';
import { simulate } from '../physics';
import { computeHumanImpact } from '../casualties/casualties';
import { fmtCount, fmtEnergy, fmtKm } from './fmt';
import { formatYear } from '../casualties/eras';
import { haversineKm } from '../data/cities';

export function ComparePanel() {
  const scenario = useStore(s => s.scenario), result = useStore(s => s.result), impact = useStore(s => s.impact), grid = useStore(s => s.grid);
  const baseline = useLab(s => s.baseline);
  const before = useMemo(() => baseline ? simulate(baseline.params) : null, [baseline]);
  const people = useMemo(() => baseline && before && grid ? computeHumanImpact(before, baseline.lat, baseline.lng, baseline.year, grid) : null, [baseline, before, grid]);
  const rows = before ? [
    { label: 'Energy', a: before.energyMt, b: result.energyMt, format: fmtEnergy },
    { label: 'Outer zone radius', a: Math.max(0, ...before.zones.map(z => z.radiusKm)), b: Math.max(0, ...result.zones.map(z => z.radiusKm)), format: fmtKm },
    { label: 'Crater diameter', a: before.craterFinalKm ?? 0, b: result.craterFinalKm ?? 0, format: fmtKm },
    { label: 'Cooling', a: before.global.coolingC, b: result.global.coolingC, format: (v: number) => `${v.toFixed(2)} °C` },
    ...(people && impact ? [{ label: 'Population exposed', a: people.populationExposed, b: impact.populationExposed, format: fmtCount }, { label: 'Estimated deaths', a: people.totalDeaths, b: impact.totalDeaths, format: fmtCount }] : []),
  ] : [];
  const changes = baseline ? [
    ...(baseline.params.kind !== scenario.params.kind ? ['Event type'] : []),
    ...Object.keys(scenario.params).filter(key => key !== 'kind' && JSON.stringify(scenario.params[key as keyof typeof scenario.params]) !== JSON.stringify(baseline.params[key as keyof typeof baseline.params])).map(key => ({ diameterM: 'Diameter', velocityKmS: 'Entry speed', angleDeg: 'Entry angle', impactorType: 'Composition', target: 'Target surface', oceanDepthM: 'Ocean depth', bulkVolumeKm3: 'Erupted volume' })[key] ?? key),
    ...(baseline.lat !== scenario.lat || baseline.lng !== scenario.lng ? ['Location'] : []),
    ...(baseline.year !== scenario.year ? ['Year'] : []),
  ] : [];
  return <section className="lab-panel" aria-label="Scenario comparison">
    <div className="inspector-intro"><h2>Change one thing.</h2><p>Pin a baseline, then adjust the current scenario. The baseline stays fixed until you replace it.</p></div>
    <button className="btn observer-btn" onClick={() => useLab.getState().pin(scenario)}>{baseline ? 'Replace baseline with current' : 'Pin current scenario'}</button>
    {baseline && before ? <>
      <div className="baseline-label"><span>Baseline</span><strong>{baseline.placeName}</strong><small>{formatYear(baseline.year)} · {baseline.params.kind === 'impact' ? 'Impact' : 'Eruption'}</small></div>
      <p className="model-note">{changes.length ? `Changed inputs: ${changes.join(', ')}.` : 'No inputs changed yet. Open Scenario to adjust one.'}</p>
      <div className="lab-actions"><button className="btn" onClick={() => useView.setState({ inspector: 'scenario' })}>Edit current inputs</button><button className="btn" onClick={() => {
        const extent = Math.max(...result.zones.map(z => z.radiusKm), haversineKm(scenario.lat, scenario.lng, baseline.lat, baseline.lng) + Math.max(0, ...before.zones.map(z => z.radiusKm))) * 1.15;
        useView.setState({ mapMode: 'local', mapCenter: 'event', mapRadius: [50,150,500,1500,5000,10000].find(r => r >= extent) ?? 10000 }); if (window.matchMedia('(max-width: 900px)').matches) window.scrollTo({ top: 0 });
      }}>View both footprints</button></div>
      <p className="model-note">Baseline outcome: {before.kind === 'eruption' ? 'Eruption' : before.airburst ? 'Airburst' : 'Surface impact'}. Current: {result.kind === 'eruption' ? 'Eruption' : result.airburst ? 'Airburst' : 'Surface impact'}.</p>
      <table className="lab-table"><caption>Current minus baseline · rounded values</caption><thead><tr><th>Measure</th><th>Baseline</th><th>Current</th></tr></thead><tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}<small className="delta">{row.a === row.b ? 'Unchanged' : `≈ ${row.b > row.a ? '+' : '−'}${row.format(Math.abs(row.b - row.a))}`}</small></th><td>{row.format(row.a)}</td><td>{row.format(row.b)}</td></tr>)}</tbody></table>
      <p className="model-note">Zero crater diameter means no crater is modeled. Outer zone compares the farthest modeled effect, which can differ by event type. Death and cooling estimates depend on simplified assumptions.</p>
      <div className="lab-actions"><button className="text-button" onClick={() => useStore.getState().loadScenario(baseline, null)}>Restore baseline as current</button><button className="text-button" onClick={() => useLab.getState().clear()}>Clear baseline</button></div>
    </> : <div className="lab-empty"><p>Try a 55 m stone asteroid. Pin it, change the material to iron, then return here to see what changes.</p><p>Use Notebook to save the current scenario together with its baseline.</p></div>}
  </section>;
}
