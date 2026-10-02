import { useMemo, useState } from 'react';
import { cities, haversineKm } from '../data/cities';
import { searchCities } from '../data/citySearch';
import { assessObserver, compassPoint, type ObserverLocation } from '../physics/observer';
import { useStore } from '../state/store';
import { useView } from '../state/view';
import { fmtKm } from './fmt';

export function ObserverPanel() {
  const scenario = useStore((s) => s.scenario);
  const result = useStore((s) => s.result);
  const observer = useView((s) => s.observer);
  const picking = useView((s) => s.pickingObserver);
  const setObserver = useView((s) => s.setObserver);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [coordinatesOpen, setCoordinatesOpen] = useState(false);
  const suggestions = useMemo(() => query.trim() ? searchCities(query) : [...cities]
    .sort((a, b) => haversineKm(scenario.lat, scenario.lng, a.lat, a.lng) - haversineKm(scenario.lat, scenario.lng, b.lat, b.lng)).slice(0, 3), [query, scenario.lat, scenario.lng]);
  const assessment = observer ? assessObserver(scenario, result, observer) : null;
  const orderedZones = assessment ? [...result.zones].sort((a, b) => Number(assessment.distanceKm <= b.radiusKm) - Number(assessment.distanceKm <= a.radiusKm)) : result.zones;

  const look = (target: 'observer' | 'route') => {
    useView.getState().lookAt(target);
    if (window.matchMedia('(max-width: 900px)').matches) window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const choose = (location: ObserverLocation) => {
    useStore.getState().setPlacing(false);
    setObserver(location);
    setQuery('');
    setEditing(false);
  };

  return (
    <section className="observer-panel" aria-label="Observer location">
      <div className="inspector-intro"><span className="observer-kicker">A place on Earth</span><h2>Watch from here</h2><p>Choose a place. Follow the distance from the event to the effects at that location.</p></div>
      {observer && <button className="text-button change-observer" onClick={() => setEditing(!editing)}>{editing ? 'Close search' : 'Change observer location'}</button>}
      {(!observer || editing) && <>
      <label className="search-label" htmlFor="observer-search">Find a city</label>
      <input id="observer-search" className="catalog-search" type="search" autoComplete="off" placeholder="Try Sacramento, Tokyo, Paris…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="place-results">
        <span className="small-label">{query.trim() ? 'Matching places' : 'Near ground zero'}</span>
        {suggestions.map((city) => (
          <button key={`${city.name}-${city.lat}-${city.lng}`} onClick={() => choose({ name: `${city.name}, ${city.country}`, lat: city.lat, lng: city.lng })}>
            <span><b>{city.name}</b><small>{city.country}</small></span><span>{fmtKm(haversineKm(scenario.lat, scenario.lng, city.lat, city.lng))}</span>
          </button>
        ))}
        {suggestions.length === 0 && <p className="empty-catalog">No matching cities in the offline catalog. Pick a point on the globe or enter coordinates.</p>}
      </div>
      <div className="observer-actions">
        <button className="btn observer-btn" aria-pressed={picking} onClick={() => {
          useStore.getState().setPlacing(false);
          useView.setState({ pickingObserver: !picking });
          if (window.matchMedia('(max-width: 900px)').matches) window.scrollTo({ top: 0, behavior: 'instant' });
        }}>{picking ? 'Cancel picking' : 'Pick on globe'}</button>
        <button className="text-button" aria-expanded={coordinatesOpen} onClick={() => setCoordinatesOpen(!coordinatesOpen)}>Coordinates</button>
      </div>
      {coordinatesOpen && <form className="coordinate-form" onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const lat = Number(data.get('lat'));
        const lng = Number(data.get('lng'));
        choose({ name: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`, lat, lng });
        setCoordinatesOpen(false);
      }}>
        <label>Latitude<input name="lat" type="number" min={-90} max={90} step="any" required placeholder="−90 to 90" /></label>
        <label>Longitude<input name="lng" type="number" min={-180} max={180} step="any" required placeholder="−180 to 180" /></label>
        <button className="btn" type="submit">Set observer</button>
      </form>}
      </>}
      {observer && assessment ? <>
        <div className="observer-readout" aria-live="polite">
          <span className="small-label">Your observation point</span>
          <h3>{observer.name}</h3>
          <div className="observer-distance">{fmtKm(assessment.distanceKm)}<span>from ground zero</span></div>
          <div className="observer-bearing">
            <svg viewBox="0 0 64 64" role="img" aria-label={assessment.bearing == null ? 'Direction undefined at this location' : `Ground zero is ${Math.round(assessment.bearing)} degrees from north`}>
              <circle cx="32" cy="32" r="25" fill="none" stroke="currentColor" opacity=".3" /><text x="32" y="8" textAnchor="middle">N</text>
              {assessment.bearing != null && <g transform={`rotate(${assessment.bearing} 32 32)`}><path d="M32 14L38 35L32 31L26 35Z" fill="currentColor" /><path d="M32 31V48" stroke="currentColor" opacity=".5" /></g>}
              <circle cx="32" cy="32" r="2" fill="currentColor" />
            </svg>
            <p>{assessment.bearing == null ? 'No unique compass bearing' : `${compassPoint(assessment.bearing)} · ${Math.round(assessment.bearing)}°`}<small>Initial direction to ground zero</small></p>
          </div>
          <div className="seg">
            <button className="seg-btn" onClick={() => look('observer')}>Go to observer</button>
            <button className="seg-btn" onClick={() => look('route')}>See the route</button>
          </div>
        </div>
        <div className="observer-effects">
          <h3>{assessment.zones.length ? `${assessment.zones.length} modeled zones reach here` : 'Outside the modeled local zones'}</h3>
          <p className="model-note">{assessment.zones.length ? 'Overlapping zones that contain this point appear first. Expand a row for its description.' : 'This does not establish safety. Effects outside these footprints are not resolved.'}</p>
          {orderedZones.map((zone) => {
            const reaches = assessment.distanceKm <= zone.radiusKm;
            return <details key={zone.id} className={`observer-zone${reaches ? ' reaches' : ''}`}>
              <summary><span className="zone-swatch" style={{ background: zone.color }} /><span>{zone.label}<small>{reaches ? 'Within footprint' : 'Outside footprint'} · {fmtKm(zone.radiusKm)} radius</small></span><b aria-hidden="true">{reaches ? '●' : '○'}</b></summary>
              <p>{zone.description}</p>
            </details>;
          })}
        </div>
        {result.global.severity !== 'none' && <div className="observer-global"><h4>Beyond the local effects</h4><p>The scenario also models global effects, including {result.global.coolingC.toFixed(1)} °C of cooling. Local zone boundaries do not bound those consequences.</p></div>}
        <details className="observer-method"><summary>How to read this view</summary><p>Distance follows a great circle on a spherical Earth with a 6,371 km radius. Bearing points toward ground zero, not the incoming object's trajectory. City names identify present-day locations even when the scenario year changes.</p><p>The view checks the app's circular effect radii. It does not calculate arrival times, terrain shielding, wind direction, or coastal tsunami exposure.</p><a href="https://simplemaps.com/data/world-cities" target="_blank" rel="noreferrer">City coordinates: SimpleMaps, CC BY 4.0</a></details>
        <button className="text-button remove-observer" onClick={() => useView.setState({ observer: null, footprint: false, pickingObserver: false })}>Clear observer</button>
      </> : <div className="observer-empty">
        <svg viewBox="0 0 280 140" aria-hidden="true"><path d="M15 130Q140 10 265 130" fill="none" stroke="#57718d" /><path d="M35 111Q140 0 245 111" fill="none" stroke="#8ddde3" strokeDasharray="3 6" /><circle cx="35" cy="112" r="5" fill="#ffab76" /><circle cx="245" cy="112" r="5" fill="#8ddde3" /><path d="M245 108V68M237 68H253" stroke="#8ddde3" /><text x="140" y="117" textAnchor="middle">One event. Your point of view.</text></svg>
        <p>The cyan marker and route will follow your selected location.</p>
      </div>}
    </section>
  );
}
