import { useStore } from '../state/store';
import { EVENTS, WHATIFS } from '../data/events';

const GLYPH: Record<string, string> = { impact: '●', airburst: '◍', eruption: '▲', whatif: '✦' };

export function CatalogPanel() {
  const eventId = useStore((s) => s.eventId);
  const selectEvent = useStore((s) => s.selectEvent);
  const newCustom = useStore((s) => s.newCustom);
  const placing = useStore((s) => s.placing);

  const impacts = EVENTS.filter((e) => e.category !== 'eruption');
  const eruptions = EVENTS.filter((e) => e.category === 'eruption');

  return (
    <aside className="panel catalog" aria-label="Historical events">
      <div className="eyebrow">The catalog</div>
      <h2 className="catalog-title">Scars of the Solar System</h2>

      <div className="catalog-group">Impacts &amp; airbursts</div>
      <ul>
        {impacts.map((e) => (
          <li key={e.id}>
            <button
              className={`event-row${e.id === eventId ? ' selected' : ''}`}
              onClick={() => selectEvent(e.id)}
            >
              <span className={`glyph ${e.category}`}>{GLYPH[e.category]}</span>
              <span className="event-name">{e.name}</span>
              <span className="event-when">{e.when}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="catalog-group">Caldera eruptions</div>
      <ul>
        {eruptions.map((e) => (
          <li key={e.id}>
            <button
              className={`event-row${e.id === eventId ? ' selected' : ''}`}
              onClick={() => selectEvent(e.id)}
            >
              <span className={`glyph ${e.category}`}>{GLYPH[e.category]}</span>
              <span className="event-name">{e.name}</span>
              <span className="event-when">{e.when}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="catalog-group">What if…</div>
      <ul>
        {WHATIFS.map((e) => (
          <li key={e.id}>
            <button
              className={`event-row${e.id === eventId ? ' selected' : ''}`}
              onClick={() => selectEvent(e.id)}
            >
              <span className={`glyph ${e.category}`}>{GLYPH[e.category]}</span>
              <span className="event-name">{e.name}</span>
              <span className="event-when">{e.when.replace(' — hypothetical', '')}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="catalog-group">Your own catastrophe</div>
      <div className="custom-buttons">
        <button className="btn" onClick={() => newCustom('impact')}>
          New impact
        </button>
        <button className="btn" onClick={() => newCustom('eruption')}>
          New eruption
        </button>
      </div>
      {placing && <div className="placing-hint">Click anywhere on Earth to set ground zero.</div>}
    </aside>
  );
}
