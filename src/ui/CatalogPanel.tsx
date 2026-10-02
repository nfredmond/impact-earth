import { useState } from 'react';
import { useStore } from '../state/store';
import { EVENTS, WHATIFS } from '../data/events';
import { useStory } from '../state/story';

const GLYPH: Record<string, string> = { impact: '●', airburst: '◍', eruption: '▲', whatif: '✦' };

export function CatalogPanel() {
  const eventId = useStore((s) => s.eventId);
  const selectEvent = useStore((s) => s.selectEvent);
  const newCustom = useStore((s) => s.newCustom);
  const placing = useStore((s) => s.placing);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const matches = (e: typeof EVENTS[number]) => `${e.name} ${e.placeName}`.toLowerCase().includes(query.trim().toLowerCase());
  const impacts = filter === 'all' || filter === 'impact' ? EVENTS.filter((e) => e.category !== 'eruption' && matches(e)) : [];
  const eruptions = filter === 'all' || filter === 'eruption' ? EVENTS.filter((e) => e.category === 'eruption' && matches(e)) : [];
  const whatifs = filter === 'all' || filter === 'whatif' ? WHATIFS.filter(matches) : [];
  const count = impacts.length + eruptions.length + whatifs.length;

  return (
    <aside className="panel catalog" aria-label="Historical events">
      <button className="story-invitation" onClick={() => useStory.getState().start()}>
        <svg viewBox="0 0 190 60" aria-hidden="true"><path d="M35 0L139 44" stroke="#ffba79" strokeWidth="2"/><path d="M76 4L139 44" stroke="#ffba79" strokeWidth=".5"/><circle cx="139" cy="44" r="5" fill="#ffddb2"/><path d="M0 60Q100 36 190 60" fill="none" stroke="#78afbd"/></svg>
        <span>A guided story</span><strong>Experience Tunguska</strong><small>Follow the event. Try an experiment.</small>
      </button>
      <div className="catalog-header">
        <h2 className="catalog-title">Explore events</h2>
        <span className="catalog-count">{count}</span>
      </div>
      <input className="catalog-search" type="search" aria-label="Search events" placeholder="Search event or place" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="catalog-filters" aria-label="Event types">
        {[['all', 'All'], ['impact', 'Impacts'], ['eruption', 'Eruptions'], ['whatif', 'What if']].map(([value, label]) => (
          <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>
      {count === 0 && <p className="empty-catalog">No matching events. Try another name or event type.</p>}

      {impacts.length > 0 && <div className="catalog-group">Impacts &amp; airbursts</div>}
      <ul>
        {impacts.map((e) => (
          <li key={e.id}>
            <button
              className={`event-row${e.id === eventId ? ' selected' : ''}`}
              aria-pressed={e.id === eventId}
              onClick={() => selectEvent(e.id)}
            >
              <span className={`glyph ${e.category}`}>{GLYPH[e.category]}</span>
              <span className="event-name">{e.name}</span>
              <span className="event-when">{e.when}</span>
            </button>
          </li>
        ))}
      </ul>

      {eruptions.length > 0 && <div className="catalog-group">Caldera eruptions</div>}
      <ul>
        {eruptions.map((e) => (
          <li key={e.id}>
            <button
              className={`event-row${e.id === eventId ? ' selected' : ''}`}
              aria-pressed={e.id === eventId}
              onClick={() => selectEvent(e.id)}
            >
              <span className={`glyph ${e.category}`}>{GLYPH[e.category]}</span>
              <span className="event-name">{e.name}</span>
              <span className="event-when">{e.when}</span>
            </button>
          </li>
        ))}
      </ul>

      {whatifs.length > 0 && <div className="catalog-group">What if…</div>}
      <ul>
        {whatifs.map((e) => (
          <li key={e.id}>
            <button
              className={`event-row${e.id === eventId ? ' selected' : ''}`}
              aria-pressed={e.id === eventId}
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
