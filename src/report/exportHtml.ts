// Self-contained HTML report generator. Inline CSS + SVG only — the exported
// file has zero external dependencies and prints cleanly.

import type { HistoricalEvent, HumanImpact, Scenario, SimulationResult } from '../types';
import { cities } from '../data/cities';
import { formatYear } from '../casualties/eras';
import { fmtCount, fmtEnergy, fmtKm, fmtUsd, sig3 } from '../ui/fmt';
import { assessObserver, compassPoint, type ObserverLocation } from '../physics/observer';

export interface ReportInput {
  scenario: Scenario;
  result: SimulationResult;
  impact: HumanImpact | null;
  compareImpacts: HumanImpact[];
  event: HistoricalEvent | null;
  observer?: ObserverLocation | null;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function mapSvg(input: ReportInput): string {
  const { scenario, result } = input;
  const x = (lng: number) => (lng + 180) * 2;
  const y = (lat: number) => (90 - lat) * 2;
  const dots = cities
    .map((c) => {
      const r = c.pop > 5e6 ? 1.6 : c.pop > 1e6 ? 1.0 : 0.55;
      return `<circle cx="${x(c.lng).toFixed(1)}" cy="${y(c.lat).toFixed(1)}" r="${r}" fill="#5b7ea8" opacity="0.65"/>`;
    })
    .join('');
  const gx = x(scenario.lng);
  const gy = y(scenario.lat);
  const cosLat = Math.max(0.2, Math.cos((scenario.lat * Math.PI) / 180));
  const rings = [...result.zones]
    .reverse()
    .map((z) => {
      const rDeg = z.radiusKm / 111.32;
      return `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(rDeg * 2 / cosLat).toFixed(2)}" ry="${(rDeg * 2).toFixed(2)}" fill="${z.color}" fill-opacity="0.18" stroke="${z.color}" stroke-width="0.8"/>`;
    })
    .join('');
  return `<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="World map with damage rings">
    <rect width="720" height="360" fill="#0a0f1a"/>
    ${dots}${rings}
    <g stroke="#ffffff" stroke-width="1.2"><line x1="${gx - 6}" y1="${gy}" x2="${gx + 6}" y2="${gy}"/><line x1="${gx}" y1="${gy - 6}" x2="${gx}" y2="${gy + 6}"/></g>
  </svg>`;
}

export function buildReportHtml(input: ReportInput): string {
  const { scenario, result, impact, compareImpacts, event } = input;
  const p = scenario.params;
  const title = event ? event.name : p.kind === 'impact' ? 'Custom impact' : 'Custom eruption';
  const observation = input.observer ? assessObserver(scenario, result, input.observer) : null;
  const observerHtml = input.observer && observation ? `<section aria-label="Observation point">
    <h2>Observation point: ${esc(input.observer.name)}</h2>
    <p>${input.observer.lat.toFixed(3)}°, ${input.observer.lng.toFixed(3)}°. ${fmtKm(observation.distanceKm)} from ground zero.
    ${observation.bearing == null ? 'No unique compass bearing.' : `Initial bearing toward ground zero: ${Math.round(observation.bearing)}° ${compassPoint(observation.bearing)}.`}</p>
    ${observation.zones.length ? `<p>Modeled local zones that include this point:</p><ul>${observation.zones.map((zone) => `<li>${esc(zone.label)} (${fmtKm(zone.radiusKm)} radius)</li>`).join('')}</ul>` : '<p>Outside the modeled local zones. This does not establish safety.</p>'}
    <p class="note">Distance follows a great circle on a spherical Earth with a 6,371 km radius. City names refer to present-day locations. The view checks overlapping circular footprints; it does not calculate arrival times, terrain shielding, wind direction, or coastal tsunami exposure. Global effects can extend beyond the local zones.</p>
  </section>` : '';

  const paramRows =
    p.kind === 'impact'
      ? [
          ['Impactor diameter', p.diameterM >= 1000 ? `${(p.diameterM / 1000).toPrecision(3)} km` : `${Math.round(p.diameterM)} m`],
          ['Composition', p.impactorType],
          ['Entry velocity', `${p.velocityKmS.toFixed(1)} km/s`],
          ['Entry angle', `${p.angleDeg.toFixed(0)}° from horizontal`],
          ['Target', p.target === 'ocean' ? `ocean (${p.oceanDepthM} m deep)` : 'land'],
        ]
      : [
          ['Bulk erupted volume', `${sig3(p.bulkVolumeKm3)} km³`],
          ['VEI', `${result.vei}`],
        ];

  const physRows: [string, string][] = [
    ['Released energy', `${fmtEnergy(result.energyMt)} (${result.energyJ.toExponential(2)} J)`],
  ];
  if (result.airburst) physRows.push(['Airburst altitude', `${result.burstAltitudeKm!.toFixed(1)} km — never reaches the ground`]);
  if (!result.airburst && result.craterFinalKm != null)
    physRows.push(['Final crater', `${fmtKm(result.craterFinalKm)} across, ~${fmtKm(result.craterDepthKm ?? 0)} deep`]);
  if (result.seismicMagnitude != null && result.seismicMagnitude > 4)
    physRows.push(['Seismic shock', `magnitude ${result.seismicMagnitude.toFixed(1)}`]);
  if (result.global.coolingC > 0.2) physRows.push(['Global cooling', `~${result.global.coolingC.toFixed(1)} °C`]);

  const impacts = impact ? [impact, ...compareImpacts.filter((c) => c.year !== impact.year)] : compareImpacts;

  const humanTable = impacts.length
    ? `<table><thead><tr><th>Year</th><th>World population</th><th>Exposed</th><th>Direct deaths</th><th>Famine deaths</th><th>Total deaths</th><th>Share of humanity</th><th>Economic loss (2026 USD)</th></tr></thead><tbody>${impacts
        .map(
          (c) =>
            `<tr><td>${formatYear(c.year)}</td><td>${fmtCount(c.worldPop)}</td><td>${fmtCount(c.populationExposed)}</td><td>${fmtCount(c.directDeaths)}</td><td>${fmtCount(c.famineDeaths)}</td><td class="bad">${fmtCount(c.totalDeaths)}</td><td>${((c.totalDeaths / c.worldPop) * 100).toPrecision(2)}%</td><td>${fmtUsd(c.econLossUsd)}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p>Population model not loaded.</p>';

  const citiesRows = impact?.citiesLost
    .slice(0, 20)
    .map(
      (c) =>
        `<tr><td>${esc(c.name)} <span class="dim">${esc(c.country)}</span></td><td>${esc(c.zoneLabel)}</td><td>${fmtCount(c.popAtYear)}</td><td class="bad">${fmtCount(c.deaths)}</td></tr>`,
    )
    .join('');

  const zonesRows = result.zones
    .map((z) => `<tr><td><i class="sw" style="background:${z.color}"></i>${esc(z.label)}</td><td>${fmtKm(z.radiusKm)}</td><td>${sig3(z.lethality * 100)}%</td><td>${esc(z.description)}</td></tr>`)
    .join('');

  const factsHtml = event
    ? `<section><h2>${event.category === 'whatif' ? 'The counterfactual' : 'What actually happened'}</h2><p>${esc(event.blurb)}</p><ul>${event.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></section>`
    : '';

  const tsunamiHtml = result.tsunami
    ? `<section><h2>Tsunami</h2><p>${esc(result.tsunami.description)}</p><p>${result.tsunami.amplitudeAtKm
        .map((a) => `<b>${a.meters.toFixed(0)} m</b> at ${a.km.toLocaleString('en-US')} km`)
        .join(' · ')} — coastal run-up typically ~${result.tsunami.runupFactor}× higher.</p></section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Impact Earth — ${esc(title)} · ${esc(formatYear(scenario.year))}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='10' fill='%231b3a5c'/%3E%3Ccircle cx='16' cy='16' r='15' fill='none' stroke='%23ff6b35' stroke-width='1.6'/%3E%3Ccircle cx='22' cy='10' r='4' fill='%23ff6b35'/%3E%3C/svg%3E"/>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #070b13; color: #e8ecf4; font: 15px/1.55 ui-sans-serif, system-ui, sans-serif; }
  main { max-width: 880px; margin: 0 auto; padding: 40px 24px 80px; }
  .eyebrow { letter-spacing: 0.22em; text-transform: uppercase; font-size: 11px; color: #ff6b35; }
  h1 { font-size: 34px; margin: 6px 0 2px; letter-spacing: 0.01em; }
  h2 { font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; color: #8b96ab; border-bottom: 1px solid #1d2636; padding-bottom: 6px; margin: 36px 0 12px; }
  .sub { color: #8b96ab; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th { text-align: left; color: #8b96ab; font-weight: 600; padding: 6px 10px 6px 0; border-bottom: 1px solid #26314a; }
  td { padding: 6px 10px 6px 0; border-bottom: 1px solid #141c2b; vertical-align: top; }
  .bad { color: #ff7484; font-variant-numeric: tabular-nums; }
  .dim { color: #66718a; font-size: 12px; }
  .kv td:first-child { color: #8b96ab; width: 220px; }
  .sw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 8px; vertical-align: -1px; }
  svg { width: 100%; height: auto; border: 1px solid #1d2636; border-radius: 6px; margin: 8px 0; }
  .banner { border: 1px solid #442; border-left: 3px solid #ff6b35; background: #171009; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
  .note { color: #8b96ab; font-size: 13px; }
  ul { padding-left: 20px; } li { margin: 6px 0; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #1d2636; color: #66718a; font-size: 12.5px; }
  @media print { body { background: #fff; color: #111; } :root { color-scheme: light; } .banner { background: #fff7f0; } }
</style></head><body><main>
  <div class="eyebrow">Impact Earth · scenario report</div>
  <h1>${esc(title)}</h1>
  <div class="sub">${esc(scenario.placeName)} (${scenario.lat.toFixed(2)}°, ${scenario.lng.toFixed(2)}°) · scenario year ${esc(formatYear(scenario.year))}${event ? ` · ${event.category === 'whatif' ? esc(event.when) : `actual event: ${esc(event.when)}`}` : ''}</div>

  ${result.global.severity !== 'none' ? `<div class="banner"><b>${esc(result.global.severity.replace('-', ' ').toUpperCase())}</b> — ${esc(result.global.description)}</div>` : ''}

  <h2>Scenario parameters</h2>
  <table class="kv"><tbody>${paramRows.map(([k, v]) => `<tr><td>${k}</td><td>${esc(String(v))}</td></tr>`).join('')}</tbody></table>

  <h2>Physical outcome</h2>
  <table class="kv"><tbody>${physRows.map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
  <p class="note">${result.comparisons.map(esc).join(' · ')}</p>

  <h2>Damage map</h2>
  ${mapSvg(input)}
  <p class="note">Blue dots: the world's 3,000 largest present-day cities. Rings are drawn to scale (equirectangular projection; high-latitude rings distort).</p>

  <h2>Damage zones</h2>
  <table><thead><tr><th>Zone</th><th>Radius</th><th>Lethality</th><th>What happens</th></tr></thead><tbody>${zonesRows}</tbody></table>

  ${observerHtml}

  <h2>Human consequences${impacts.length > 1 ? ' — across the centuries' : ''}</h2>
  ${humanTable}
  ${impact?.notes.length ? `<p class="note">${impact.notes.map(esc).join('<br/>')}</p>` : ''}

  ${citiesRows ? `<h2>Hardest-hit cities (${esc(formatYear(impact!.year))})</h2><table><thead><tr><th>City</th><th>Zone</th><th>Population then</th><th>Deaths</th></tr></thead><tbody>${citiesRows}</tbody></table>` : ''}

  ${tsunamiHtml}
  ${factsHtml}

  <h2>Methodology &amp; sources</h2>
  <ul class="note">
    <li>Impact physics: Collins, Melosh &amp; Marcus (2005), <i>Earth Impact Effects Program</i>, Meteoritics &amp; Planetary Science 40:817–840 — crater scaling, atmospheric entry/pancake fragmentation, thermal, seismic. Airblast per Glasstone &amp; Dolan (1977) 1-kt scaling.</li>
    <li>Eruption effects: VEI per Newhall &amp; Self (1982); climate response calibrated to Pinatubo 1991, Tambora 1815, Toba ~74 ka.</li>
    <li>Population: SimpleMaps World Cities (CC BY 4.0) smoothed to a 0.5° grid, scaled to 8.1 B; historical scaling via McEvedy &amp; Jones / HYDE-style regional shares and UN projections; GDP via Maddison-style per-capita series.</li>
    <li>All casualty and economic figures are order-of-magnitude estimates. Tsunami coastal losses are described but not totaled. Years beyond 2100 are speculative.</li>
  </ul>

  <footer>Generated by Impact Earth. These numbers describe what physics permits — the thought they provoke is the point.</footer>
</main></body></html>`;
}

export function downloadReport(input: ReportInput) {
  const html = buildReportHtml(input);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const name = (input.event?.id ?? 'custom') + '-' + input.scenario.year;
  a.href = url;
  a.download = `impact-earth-report-${name}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
