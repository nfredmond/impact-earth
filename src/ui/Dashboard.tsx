import { useState } from 'react';
import { useStore } from '../state/store';
import { AnimatedNumber } from './AnimatedNumber';
import { fmtCount, fmtUsd } from './fmt';
import { formatYear } from '../casualties/eras';
import { useView } from '../state/view';

const SEVERITY_LABEL: Record<string, string> = {
  none: 'Regional event',
  regional: 'Hemisphere-scale haze',
  continental: 'Continental catastrophe',
  'global-winter': 'Global winter',
  'mass-extinction': 'Mass extinction',
};

export function Dashboard() {
  const impact = useStore((s) => s.impact);
  const result = useStore((s) => s.result);
  const compareImpacts = useStore((s) => s.compareImpacts);
  const toggleCompareYear = useStore((s) => s.toggleCompareYear);
  const grid = useStore((s) => s.grid);
  const [showCities, setShowCities] = useState(false);

  if (!grid || !impact) {
    return (
      <div className="dashboard loading">
        <span className="eyebrow">Loading population of Earth…</span>
      </div>
    );
  }

  const severity = result.global.severity;

  return (
    <div className="dashboard">
      <button className="text-button assumptions-link" onClick={() => useView.setState({ inspector: 'sensitivity', mobilePanel: 'params', focus: false })}>Model estimates: inspect assumptions and sensitivity</button>
      <div className="stats">
        <div className="stat">
          <span className="stat-label">World population · {formatYear(impact.year)}</span>
          <AnimatedNumber value={impact.worldPop} format={fmtCount} />
        </div>
        <div className="stat">
          <span className="stat-label">Exposed in zones</span>
          <AnimatedNumber value={impact.populationExposed} format={fmtCount} />
        </div>
        <div className="stat deaths">
          <span className="stat-label">Direct deaths</span>
          <AnimatedNumber value={impact.directDeaths} format={fmtCount} />
        </div>
        {impact.famineDeaths > 1000 && (
          <div className="stat deaths">
            <span className="stat-label">Famine deaths</span>
            <AnimatedNumber value={impact.famineDeaths} format={fmtCount} />
          </div>
        )}
        <div className="stat deaths total">
          <span className="stat-label">Total deaths</span>
          <AnimatedNumber value={impact.totalDeaths} format={fmtCount} />
        </div>
        <div className="stat">
          <span className="stat-label">Injured</span>
          <AnimatedNumber value={impact.injured} format={fmtCount} />
        </div>
        <div className="stat">
          <span className="stat-label">Economic loss (2026 USD)</span>
          <AnimatedNumber value={impact.econLossUsd} format={fmtUsd} />
        </div>
        <div className="stat">
          <span className="stat-label">Share of world GDP</span>
          <AnimatedNumber
            value={impact.econLossShareOfGwp * 100}
            format={(n) => (n >= 100 ? `${(n / 100).toPrecision(3)} yrs` : `${n.toPrecision(3)}%`)}
          />
        </div>
        <button className="stat cities-toggle" onClick={() => setShowCities(!showCities)}>
          <span className="stat-label">Cities in zones</span>
          <span className="num">{impact.citiesLost.length}</span>
          <span className="expand-hint">{showCities ? '▾ hide' : '▸ list'}</span>
        </button>
      </div>

      {severity !== 'none' && (
        <div className={`global-banner sev-${severity}`}>
          <b>{SEVERITY_LABEL[severity]}</b>
          <span>{result.global.description}</span>
        </div>
      )}

      {impact.notes.map((n) => (
        <div key={n} className="note">
          {n}
        </div>
      ))}

      {showCities && impact.citiesLost.length > 0 && (
        <div className="cities-list">
          {impact.citiesLost.slice(0, 24).map((c) => (
            <div key={`${c.name}${c.lat}`} className="city-row">
              <span className="city-name">
                {c.name} <i>{c.country}</i>
              </span>
              <span className="city-zone">{c.zoneLabel}</span>
              <span className="city-pop">pop {fmtCount(c.popAtYear)}</span>
              <span className="city-deaths">{fmtCount(c.deaths)} dead</span>
            </div>
          ))}
          {impact.citiesLost.length > 24 && (
            <div className="city-row more">…and {impact.citiesLost.length - 24} more</div>
          )}
        </div>
      )}

      {compareImpacts.length > 0 && (
        <div className="compare">
          <div className="eyebrow">Same catastrophe, different centuries</div>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>World pop</th>
                <th>Total deaths</th>
                <th>Share of humanity</th>
                <th>Economic loss</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[impact, ...compareImpacts.filter((c) => c.year !== impact.year)].map((c) => (
                <tr key={c.year} className={c.year === impact.year ? 'current' : ''}>
                  <td>{formatYear(c.year)}</td>
                  <td>{fmtCount(c.worldPop)}</td>
                  <td className="deaths">{fmtCount(c.totalDeaths)}</td>
                  <td>{((c.totalDeaths / c.worldPop) * 100).toPrecision(2)}%</td>
                  <td>{fmtUsd(c.econLossUsd)}</td>
                  <td>
                    {c.year !== impact.year && (
                      <button className="chip" onClick={() => toggleCompareYear(c.year)}>
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="methodology-hint">
        Order-of-magnitude estimates · population &amp; GDP scaled to era · tsunami coastal losses not totaled
      </div>
    </div>
  );
}
