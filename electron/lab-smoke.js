// Uses the visible controls in the packaged application, in the smoke profile.
export async function labJourney() {
  const wait = async (read, label) => {
    const end = Date.now() + 12000;
    while (Date.now() < end) { const value = read(); if (value) return value; await new Promise(r => setTimeout(r, 100)); }
    throw new Error(`Lab smoke: ${label}`);
  };
  const button = (label, scope = document) => [...scope.querySelectorAll('button')].find(b => b.textContent.trim() === label);
  const click = async label => {
    await wait(() => button(label), label);
    const target = await wait(() => {
      const candidate = button(label); if (!candidate || candidate.disabled) return false;
      candidate.scrollIntoView({ block: 'center' });
      const rect = candidate.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return hit && candidate.contains(hit) ? candidate : false;
    }, `control is covered: ${label}`);
    target.click();
  };
  await click('Exit story');
  (await wait(() => [...document.querySelectorAll('.catalog li button')].find(b => b.textContent.includes('Tunguska')), 'catalog event')).click();
  await click('Compare'); await click('Pin current scenario'); await click('Edit current inputs'); await click('iron'); await click('Compare');
  await wait(() => document.querySelector('.lab-panel')?.textContent.includes('Baseline outcome: Airburst. Current: Surface impact.'), 'comparison outcomes');
  await click('View both footprints');
  await wait(() => document.querySelector('.regional-coasts'), 'offline geography');
  const geography = await (await fetch('app://bundle/data/regional-geography.json')).json();
  if (geography.coasts.length < 1000 || geography.rivers.length < 500) throw new Error('Lab smoke: incomplete offline geography');
  await wait(() => document.querySelector('.baseline-footprint'), 'baseline map footprint');
  await click('Notebook'); await click('Save current scenario');
  await wait(() => document.querySelectorAll('.scenario-list li').length === 1, 'save scenario');
  let blob;
  const original = URL.createObjectURL;
  URL.createObjectURL = value => { blob = value; return original(value); };
  try { await click('Export current JSON'); } finally { URL.createObjectURL = original; }
  if (!blob) throw new Error('Lab smoke: export not generated');
  const text = await blob.text(), file = JSON.parse(text);
  if (file.scenario.params.impactorType !== 'iron' || file.baseline.params.impactorType !== 'stony') throw new Error('Lab smoke: exported comparison inputs');
  const transfer = new DataTransfer(); transfer.items.add(new File([text], 'scenario.json', { type: 'application/json' }));
  const input = document.querySelector('.import-scenario input'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  await click('Import into notebook');
  await wait(() => document.querySelectorAll('.scenario-list li').length === 2, 'import scenario');
  document.querySelector('[aria-label="Close field notes"]').click();
  await click('Sensitivity');
  await wait(() => document.querySelectorAll('.sensitivity-cases article').length === 3, 'sensitivity cases');
  document.querySelector('.sensitivity-cases button').click();
  await wait(() => document.querySelector('.lab-panel')?.textContent.includes('Changed inputs: Diameter.'), 'sensitivity comparison');
  await click('Notebook'); await click('Open scenario');
  await wait(() => document.querySelector('.lab-panel')?.textContent.includes('Baseline outcome: Airburst. Current: Surface impact.'), 'reopen saved baseline');
  await click('View both footprints');
  await wait(() => {
    const values = [...document.querySelectorAll('.dashboard .stats .num')].map(node => node.textContent);
    return values[0] === '1.79 B' && values[1] === '76' && values[2] === '4';
  }, 'dashboard still shows another scenario');
  return 'regional map, fixed baseline, sensitivity, notebook save/export/import/reopen';
}
