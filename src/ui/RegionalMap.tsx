import { useEffect, useId, useMemo, useState } from 'react';
import { cities, haversineKm } from '../data/cities';
import { useStore } from '../state/store';
import { useView } from '../state/view';
import { useLab } from '../state/lab';
import { circlePath, destination, linePath, projectLocal, unprojectLocal } from '../scene/regional';
import { bearingTo, footprintDiameterKm } from '../physics/observer';
import { simulate } from '../physics';
import { fmtKm } from './fmt';
interface Geography { coasts: number[][][]; rivers: number[][][] }
let cached: Promise<Geography> | null = null;
function geography() {
  if (!cached) cached = fetch(import.meta.env.BASE_URL + 'data/regional-geography.json').then(r => { if (!r.ok) throw new Error('Geography unavailable'); return r.json(); }).catch(error => { cached = null; throw error; });
  return cached;
}
export function RegionalMap() {
  const scenario = useStore(s => s.scenario), result = useStore(s => s.result), placing = useStore(s => s.placing);
  const observer = useView(s => s.observer), target = useView(s => s.mapCenter), radius = useView(s => s.mapRadius), picking = useView(s => s.pickingObserver), zones = useView(s => s.zones);
  const baseline = useLab(s => s.baseline);
  const footprint = useView(s => s.footprint);
  const baselineResult = useMemo(() => baseline ? simulate(baseline.params) : null, [baseline]);
  const center = target === 'observer' && observer ? observer : target === 'baseline' && baseline ? baseline : scenario;
  const centerLat = center.lat, centerLng = center.lng;
  const [data, setData] = useState<Geography | null>(null), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const id = useId();
  useEffect(() => { let active = true; geography().then(d => { if (active) { setData(d); setError(false); } }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, [attempt]);
  const geographyPaths = useMemo(() => { const origin = { lat: centerLat, lng: centerLng }; return data ? { coasts: data.coasts.map(l => linePath(l, origin, radius)).join(''), rivers: data.rivers.map(l => linePath(l, origin, radius)).join('') } : null; }, [data, centerLat, centerLng, radius]);
  const places = useMemo(() => {
    const boxes: { x: number; y: number; width: number }[] = [];
    return cities.filter(c => haversineKm(centerLat, centerLng, c.lat, c.lng) < radius * .85).sort((a, b) => b.pop - a.pop).flatMap(c => {
      const p = projectLocal({ lat: centerLat, lng: centerLng }, c), x = 400 + p.x * 310 / radius, y = 360 + p.y * 310 / radius, width = Math.min(c.name.length * 12 + 20, 200);
      if (boxes.length >= 9 || boxes.some(b => Math.abs(b.y - y) < 37 && x < b.x + b.width && x + width > b.x) || x + width > 715) return [];
      boxes.push({ x, y, width }); return [{ ...c, x, y }];
    });
  }, [centerLat, centerLng, radius]);
  const point = (p: { lat: number; lng: number }) => { const v = projectLocal(center, p); return { x: 400 + v.x * 310 / radius, y: 360 + v.y * 310 / radius }; };
  const ground = point(scenario), watch = observer ? point(observer) : null;
  const choose = (lat: number, lng: number, name: string) => {
    if (placing) useStore.getState().setLocation(lat, lng, name);
    else { useView.getState().setObserver({ name, lat, lng }); useView.setState({ inspector: 'observer', mobilePanel: 'params' }); }
  };
  const outside = observer && haversineKm(center.lat, center.lng, observer.lat, observer.lng) > radius;
  const route = observer ? linePath(Array.from({ length: 81 }, (_, i) => { const p = destination(scenario, haversineKm(scenario.lat, scenario.lng, observer.lat, observer.lng) * i / 80, bearingTo(scenario.lat, scenario.lng, observer.lat, observer.lng) ?? 0); return [p.lng, p.lat]; }), center, radius) : '';
  return <section className="regional-map" aria-label="Local observer map">
    <header className="regional-heading"><h1>Read the ground.</h1><p>{'name' in center ? center.name : center.placeName} · {radius.toLocaleString()} km radius</p></header>
    <svg className={placing || picking ? 'regional-canvas picking' : 'regional-canvas'} viewBox="0 0 800 720" role="group" aria-label={`Regional map centered at ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}. Distance rings, effect zones, coastlines, rivers, and present-day cities.`} onClick={e => {
      if (!placing && !picking) return;
      const matrix = e.currentTarget.getScreenCTM(); if (!matrix) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
      if (Math.hypot(p.x - 400, p.y - 360) > 310) return;
      const location = unprojectLocal(center, (p.x - 400) * radius / 310, (p.y - 360) * radius / 310);
      choose(location.lat, location.lng, `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`);
    }}>
      <defs><clipPath id={id}><circle cx="400" cy="360" r="310" /></clipPath></defs>
      <circle cx="400" cy="360" r="310" className="regional-disc" />
      <g clipPath={`url(#${id})`}>
        {geographyPaths && <><path d={geographyPaths.rivers} className="regional-rivers" /><path d={geographyPaths.coasts} className="regional-coasts" /></>}
        {[.25, .5, .75, 1].map(n => <g key={n}><circle cx="400" cy="360" r={310 * n} className="distance-ring" /><text x="405" y={358 - 310 * n} className="map-distance">{fmtKm(radius * n)}</text></g>)}
        <path d="M90 360H710M400 50V670" className="distance-ring" />
        {zones && [...result.zones].reverse().map(z => <path key={z.id} d={circlePath(scenario, z.radiusKm, center, radius)} fill="none" stroke={z.color} strokeWidth="1.8"><title>{z.label}: {fmtKm(z.radiusKm)} radius</title></path>)}
        {baseline && baselineResult && <path d={circlePath(baseline, Math.max(...baselineResult.zones.map(z => z.radiusKm), 0), center, radius)} className="baseline-footprint"><title>Baseline outer effect zone</title></path>}
        {footprint && observer && footprintDiameterKm(result) !== null && <path d={circlePath(observer, footprintDiameterKm(result)! / 2, center, radius)} fill="none" stroke="#e8ecf4" strokeWidth="2" strokeDasharray="2 4"><title>Hypothetical crater or caldera outline at observer</title></path>}
        {watch && <path d={route} className="observer-route" />}
        {places.map(c => <g key={`${c.lat}-${c.lng}`} role="button" tabIndex={0} aria-label={`Observe from ${c.name}, ${c.country}`} onClick={e => { e.stopPropagation(); choose(c.lat, c.lng, `${c.name}, ${c.country}`); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(c.lat, c.lng, `${c.name}, ${c.country}`); } }} className="map-city"><circle cx={c.x} cy={c.y} r="3" /><text x={c.x + 7} y={c.y + 4}>{c.name}</text></g>)}
        <g className="map-ground"><circle cx={ground.x} cy={ground.y} r="7" /><text x={ground.x + 11} y={ground.y - 12}>Ground zero</text></g>
        {baseline && <g className="map-observer"><path d={`M${point(baseline).x-6} ${point(baseline).y}h12m-6 -6v12`} /><title>Baseline ground zero</title></g>}
        {watch && <g className="map-observer"><circle cx={watch.x} cy={watch.y} r="7" /><text x={watch.x + 11} y={watch.y + 20}>Observer</text></g>}
      </g>
      <text x="400" y="32" textAnchor="middle" className="map-north">N ↑</text>
      <path d="M92 685v8h77.5v-8" className="map-scale" /><text x="92" y="711" className="map-distance">{fmtKm(radius / 4)} at center</text>
    </svg>
    <div className="regional-tools"><label>Center<select aria-label="Map center" value={target} onChange={e => useView.setState({ mapCenter: e.target.value as typeof target })}><option value="event">Ground zero</option><option value="observer" disabled={!observer}>Observer</option><option value="baseline" disabled={!baseline}>Baseline</option></select></label><label>Radius<select aria-label="Map radius" value={radius} onChange={e => useView.setState({ mapRadius: Number(e.target.value) })}>{[50,150,500,1500,5000,10000].map(r => <option value={r} key={r}>{r.toLocaleString()} km</option>)}</select></label><button className="btn" aria-pressed={zones} onClick={() => useView.getState().toggle('zones')}>Effect zones</button><button className="btn" onClick={() => useView.getState().toggle('focus')}>{useView.getState().focus ? 'Exit focus' : 'Focus'}</button></div>
    {(placing || picking) && <div className="regional-picking" role="status">{placing ? 'Select ground zero on the map.' : 'Select an observer on the map.'}<button className="btn" onClick={() => { useStore.getState().setPlacing(false); useView.setState({ pickingObserver: false }); }}>Cancel</button></div>}
    <footer className="regional-footer">
      {outside && <button className="text-button" onClick={() => useView.setState({ mapCenter: 'observer' })}>Observer is outside this view. Center on observer.</button>}
      {error ? <p role="status">Geography could not load. Distances and zones remain available. <button className="text-button" onClick={() => setAttempt(attempt + 1)}>Retry geography</button></p> : !data ? <p role="status">Loading offline geography…</p> : null}
      <p>Solid rings: current effect zones. {baseline ? 'Dashed cyan: baseline outer zone. ' : ''}Distances from map center are to scale. Select a city to observe from it.</p>
      {footprint && observer && footprintDiameterKm(result) !== null && <p>Dotted white: hypothetical crater or caldera size at the observer. This does not move ground zero.</p>}
      <details><summary>Effect zone key</summary><ul>{result.zones.map(z => <li key={z.id}><span style={{ color: z.color }}>● </span>{z.label}: {fmtKm(z.radiusKm)} radius</li>)}</ul><p>Zones extending beyond this view may have no visible boundary. Zoom out or inspect the Observer panel to check a point.</p></details>
      <details><summary>Map sources and limits</summary><p>Present-day coastlines and rivers: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth, 1:50 million</a>. City coordinates: <a href="https://simplemaps.com/data/world-cities" target="_blank" rel="noreferrer">SimpleMaps, CC BY 4.0</a>. Generalized regional context, not street detail or historical geography. Distances between other points distort away from the center. Zones do not account for terrain or wind.</p></details>
    </footer>
  </section>;
}
