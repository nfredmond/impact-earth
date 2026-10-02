// Runs in the real packaged renderer, using a temporary profile.
export async function smokeJourney() {
  const waitFor = async (read, label) => {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const value = read();
      if (value) return value;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Desktop smoke: ${label}`);
  };
  const click = async selector => (await waitFor(() => document.querySelector(selector), selector)).click();
  await click('.story-invitation');
  await waitFor(() => document.querySelector('.story-reader'), 'story did not open');
  await waitFor(() => {
    const canvas = document.querySelector('canvas');
    return canvas && canvas.width > 0 && canvas.height > 0;
  }, 'globe canvas missing');
  const grid = await fetch('app://bundle/data/popgrid.bin').catch(() => { throw new Error('Population grid unavailable'); });
  if (!grid.ok || (await grid.arrayBuffer()).byteLength < 1000) throw new Error('Population grid unavailable');
  await click('[aria-label="Chapter 4: The experiment"]');
  await waitFor(() => document.querySelector('.story-materials'), 'experiment controls missing');
  const stone = [...document.querySelectorAll('.story-materials button')].find(button => button.textContent.includes('Stone'));
  if (!stone) throw new Error('Stone choice missing');
  stone.click();
  await waitFor(() => document.querySelector('.story-comparison tbody tr td:last-child')?.textContent === 'Airburst', 'stone result did not change');
  const iron = [...document.querySelectorAll('.story-materials button')].find(button => button.textContent.includes('Iron'));
  if (!iron) throw new Error('Iron choice missing');
  iron.click();
  await waitFor(() => document.querySelector('.story-comparison')?.textContent.includes('Surface impact'), 'iron result did not change');
  await click('[aria-label="Chapter 5: Your field note"]');
  await click('.story-save-actions .story-primary');
  await waitFor(() => document.querySelector('.save-notice')?.textContent.includes('Saved on this device'), 'note did not save');
  await click('.notebook-launch');
  await waitFor(() => document.querySelector('dialog[open] .note-list li'), 'saved note missing from notebook');
  await click('[aria-label="Close field notes"]');
  await click('[aria-label="Chapter 3: The observer"]');
  await new Promise(resolve => setTimeout(resolve, 1500));
  return 'globe, population grid, material experiment, saved notebook';
}
