import { expect, it } from 'vitest';
import { buildReportHtml, type ReportInput } from './exportHtml';
import { simulate } from '../physics';

const input: ReportInput = {
  scenario: { lat: 0, lng: 0, year: 2026, placeName: 'Test source', params: { kind: 'eruption', bulkVolumeKm3: 1000 } },
  result: simulate({ kind: 'eruption', bulkVolumeKm3: 1000 }),
  impact: null, compareImpacts: [], event: null,
};

it('exports the selected point, overlapping zones, and limitations with escaped names', () => {
  const html = buildReportHtml({ ...input, observer: { lat: 0, lng: 0, name: '<script>test</script>' } });
  expect(html).toContain('Observation point: &lt;script&gt;test&lt;/script&gt;');
  expect(html).not.toContain('<script>test</script>');
  expect(html).toContain('0 m from ground zero');
  expect(html).toContain('Caldera collapse (');
  expect(html).toContain('Pyroclastic flows (');
  expect(html).toContain('does not calculate arrival times');
});

it('omits the observer section without a selection and qualifies locations outside local zones', () => {
  expect(buildReportHtml(input)).not.toContain('aria-label="Observation point"');
  const html = buildReportHtml({ ...input, observer: { lat: 0, lng: 180, name: 'Far away' } });
  expect(html).toContain('Outside the modeled local zones. This does not establish safety.');
});
