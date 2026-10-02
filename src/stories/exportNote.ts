import type { FieldNote } from './notebook';
import { STORY_SOURCES } from './tunguska';
import { fmtEnergy, fmtKm } from '../ui/fmt';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function buildFieldNoteHtml(note: FieldNote): string {
  const p = note.inputs.params;
  const values = [note.baseline, note.experiment];
  const rows = [
    ['Outcome', ...values.map(r => r.airburst ? 'Airburst' : 'Surface impact')],
    ['Energy', ...values.map(r => `${fmtEnergy(r.energyMt)} TNT equivalent`)],
    ['Burst altitude', ...values.map(r => r.airburst ? fmtKm(r.altitudeKm) : 'Surface')],
    ['Crater diameter', ...values.map(r => r.airburst ? 'No surface crater modeled' : fmtKm(r.craterKm))],
  ];
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(note.title)}</title><style>body{margin:0;background:#0a1420;color:#e8ecf4;font:16px/1.7 system-ui}main{max-width:850px;margin:auto;padding:48px 24px}h1{font-size:clamp(32px,6vw,56px);line-height:1.1}h2{font-size:22px}a{color:#9ee3e8}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:14px 10px;border-bottom:1px solid #405267}th{color:#ffba79}.intro{color:#b6cbd9}.note{border-left:3px solid #9ee3e8;padding-left:18px}footer{margin-top:40px;font-size:12px;color:#b6cbd9}@media print{body{background:white;color:#162332}a,th,.intro,footer{color:#162332}main{padding:12px}}</style><main><p>Impact Earth / Tunguska field note</p><h1>${esc(note.title)}</h1><p class="intro">A composition experiment at the Tunguska preset location. The comparison is hypothetical. It does not establish the composition of the 1908 object.</p><table><thead><tr><th>Modeled result</th><th>Stone baseline</th><th>${esc(note.material)} experiment</th></tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><h2>Inputs held fixed</h2><p>${p.kind === 'impact' ? `${p.diameterM} m diameter; ${p.velocityKmS} km/s entry speed; ${p.angleDeg}° entry angle; ${esc(p.target)} target.` : ''} Location ${note.inputs.lat.toFixed(3)}°, ${note.inputs.lng.toFixed(3)}°; year ${note.inputs.year}. The observation point lies ${note.distanceKm} km due south.</p><h2>Reading the result</h2><p class="note">Changing composition changes density and strength together in this model. With fixed diameter, mass also changes. Energy and atmospheric breakup respond to those assumptions.</p><p>These are saved model outputs, not measurements. Circular effect zones do not resolve terrain, directional blast, sightlines, or arrival times. This note contains no casualty estimate.</p><h2>Sources and method</h2><ul>${STORY_SOURCES.map(s=>`<li><a href="${s.url}">${s.label}</a></li>`).join('')}<li>Impact equations: Collins, Melosh and Marcus (2005), Earth Impact Effects Program, Meteoritics &amp; Planetary Science 40:817–840. The app uses a simplified implementation.</li></ul><footer>Saved ${esc(note.createdAt)}. Model label: ${esc(note.model)}. This file preserves the saved summaries; reopening the experiment in the app recalculates using the installed model.</footer></main></html>`;
}
export function downloadFieldNote(note: FieldNote) {
  const url = URL.createObjectURL(new Blob([buildFieldNoteHtml(note)], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url; a.download = `tunguska-field-note-${note.id}.html`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
