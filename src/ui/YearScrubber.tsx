// The time machine: a nonlinear era rail from 10,000 BC to 2500 AD.
// Track space is allotted to where history is dense, not to raw years.

import { useStore } from '../state/store';
import { formatYear } from '../casualties/eras';

/** Piecewise anchors: [track position 0..1, year]. */
const ANCHORS: [number, number][] = [
  [0.0, -10000],
  [0.12, -2000],
  [0.24, 0],
  [0.38, 1500],
  [0.48, 1800],
  [0.58, 1900],
  [0.72, 2000],
  [0.88, 2100],
  [1.0, 2500],
];

export function tToYear(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [t0, y0] = ANCHORS[i];
    const [t1, y1] = ANCHORS[i + 1];
    if (x <= t1) return Math.round(y0 + ((x - t0) / (t1 - t0)) * (y1 - y0));
  }
  return 2500;
}

export function yearToT(year: number): number {
  const y = Math.max(-10000, Math.min(2500, year));
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [t0, y0] = ANCHORS[i];
    const [t1, y1] = ANCHORS[i + 1];
    if (y <= y1) return t0 + ((y - y0) / (y1 - y0)) * (t1 - t0);
  }
  return 1;
}

const TICKS = [-10000, -2000, 0, 1500, 1800, 1900, 2000, 2100, 2500];
const QUICK_YEARS: [string, number][] = [
  ['2500 BC', -2499],
  ['1 AD', 1],
  ['1888', 1888],
  ['1908', 1908],
  ['1999', 1999],
  ['Today', 2026],
  ['2100', 2100],
];

export function YearScrubber() {
  const year = useStore((s) => s.scenario.year);
  const setYear = useStore((s) => s.setYear);
  const compareYears = useStore((s) => s.compareYears);
  const toggleCompareYear = useStore((s) => s.toggleCompareYear);

  return (
    <div className="scrubber">
      <div className="scrubber-head">
        <span className="eyebrow">Time machine</span>
        <span className="scrubber-year">{formatYear(year)}</span>
        <button
          className="chip chip-pin"
          onClick={() => toggleCompareYear(year)}
          title="Pin this year for side-by-side comparison"
        >
          {compareYears.includes(year) ? 'Unpin year' : 'Pin year'}
        </button>
        <div className="quick-years">
          {QUICK_YEARS.map(([label, y]) => (
            <button
              key={label}
              className={`chip${y === year ? ' active' : ''}`}
              onClick={() => setYear(y)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="scrubber-track">
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(yearToT(year) * 1000)}
          onChange={(e) => setYear(tToYear(Number(e.target.value) / 1000))}
          aria-label="Scenario year"
          autoComplete="off"
        />
        <div className="ticks" aria-hidden>
          {TICKS.map((y) => (
            <span key={y} className="tick" style={{ left: `${yearToT(y) * 100}%` }}>
              <i />
              {y === -10000 ? '10000 BC' : y === -2000 ? '2000 BC' : y === 0 ? '1 AD' : y}
            </span>
          ))}
          {compareYears.map((y) => (
            <span key={`pin${y}`} className="pin-mark" style={{ left: `${yearToT(y) * 100}%` }} title={formatYear(y)} />
          ))}
        </div>
      </div>
    </div>
  );
}
