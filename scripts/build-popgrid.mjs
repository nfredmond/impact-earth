#!/usr/bin/env node
/**
 * Builds population data for the 3D impact simulator.
 *
 * Source: simplemaps World Cities basic database (CC BY 4.0)
 * https://simplemaps.com/data/world-cities
 *
 * Outputs:
 *   src/data/cities.json      - top 3000 cities [name, lat, lng, pop, iso2]
 *   public/data/popgrid.bin   - 720x360 Float32Array (LE) of population per 0.5 deg cell
 *   src/data/popgrid-meta.json
 *
 * Re-runnable: downloads + unzips the CSV if scripts/worldcities.csv is missing.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(__dirname, 'worldcities.csv');

const COLS = 720;
const ROWS = 360;
const CELL_DEG = 0.5;
const WORLD_POP = 8.1e9;
const SIGMA_KM = 120;
const TRUNC_KM = 3 * SIGMA_KM; // 360 km
const LAND_RADIUS_KM = 300; // cell is "land" if any city within this distance
const SELF_LAND_KM = 200; // kernel cell counts if source city within this distance
const EARTH_R = 6371;
const KM_PER_DEG_LAT = 111.32;

// ---------------------------------------------------------------- download

async function ensureCsv() {
  if (fs.existsSync(CSV_PATH)) return;
  const UA =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
  const versions = ['1.77', '1.78', '1.79', '1.80', '1.76', '1.75'];
  let zipPath = null;
  for (const v of versions) {
    const url = `https://simplemaps.com/static/data/world-cities/basic/simplemaps_worldcities_basicv${v}.zip`;
    const out = path.join(__dirname, `worldcities-v${v}.zip`);
    try {
      console.log(`Trying ${url} ...`);
      execFileSync('curl', ['-sSfL', '-A', UA, '-o', out, url], { stdio: 'inherit' });
      if (fs.statSync(out).size > 100_000) {
        zipPath = out;
        break;
      }
      fs.rmSync(out, { force: true });
    } catch {
      fs.rmSync(out, { force: true });
    }
  }
  if (!zipPath) {
    throw new Error(
      'Could not download the simplemaps World Cities zip. ' +
        'Download it manually from https://simplemaps.com/data/world-cities ' +
        'and extract worldcities.csv to scripts/worldcities.csv',
    );
  }
  execFileSync('unzip', ['-o', zipPath, 'worldcities.csv', '-d', __dirname], {
    stdio: 'inherit',
  });
  if (!fs.existsSync(CSV_PATH)) throw new Error('worldcities.csv missing after unzip');
}

// ---------------------------------------------------------------- CSV parse

/** Minimal RFC-4180-ish parser (handles quoted fields with commas / escaped quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------- grid helpers

const rowOf = (lat) => Math.min(ROWS - 1, Math.max(0, Math.floor((90 - lat) / CELL_DEG)));
const colOf = (lng) => {
  let c = Math.floor((lng + 180) / CELL_DEG);
  return ((c % COLS) + COLS) % COLS;
};
const rowCenterLat = (r) => 90 - (r + 0.5) * CELL_DEG;
const colCenterLng = (c) => -180 + (c + 0.5) * CELL_DEG;

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Iterate cells whose centers may lie within `radiusKm` of (lat, lng),
 * calling cb(row, col, distKm) for those actually within.
 */
function forCellsWithin(lat, lng, radiusKm, cb) {
  const dRows = Math.ceil(radiusKm / (KM_PER_DEG_LAT * CELL_DEG)) + 1;
  const r0 = rowOf(lat);
  for (let r = Math.max(0, r0 - dRows); r <= Math.min(ROWS - 1, r0 + dRows); r++) {
    const cLat = rowCenterLat(r);
    const cosLat = Math.cos((cLat * Math.PI) / 180);
    const kmPerDegLng = KM_PER_DEG_LAT * Math.max(cosLat, 1e-6);
    let dCols = Math.ceil(radiusKm / (kmPerDegLng * CELL_DEG)) + 1;
    dCols = Math.min(dCols, Math.floor(COLS / 2));
    const c0 = colOf(lng);
    for (let dc = -dCols; dc <= dCols; dc++) {
      const c = (((c0 + dc) % COLS) + COLS) % COLS;
      const d = haversineKm(lat, lng, cLat, colCenterLng(c));
      if (d <= radiusKm) cb(r, c, d);
    }
  }
}

// ---------------------------------------------------------------- main

async function main() {
  await ensureCsv();
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  for (const need of ['city', 'lat', 'lng', 'iso2', 'population']) {
    if (!(need in idx)) throw new Error(`CSV missing column ${need}`);
  }

  const cities = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const lat = parseFloat(r[idx.lat]);
    const lng = parseFloat(r[idx.lng]);
    const pop = parseFloat(r[idx.population]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!Number.isFinite(pop) || pop <= 0) continue;
    cities.push({ name: r[idx.city], lat, lng, pop, iso2: r[idx.iso2] });
  }
  console.log(`Parsed ${cities.length} cities with population (of ${rows.length - 1} rows)`);

  // ---- cities.json: top 3000 by population
  const top = [...cities].sort((a, b) => b.pop - a.pop).slice(0, 3000);
  const round3 = (x) => Math.round(x * 1000) / 1000;
  const citiesJson = top.map((c) => [c.name, round3(c.lat), round3(c.lng), Math.round(c.pop), c.iso2]);
  const dataDir = path.join(ROOT, 'src', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const citiesPath = path.join(dataDir, 'cities.json');
  fs.writeFileSync(citiesPath, JSON.stringify(citiesJson));
  console.log(`Wrote ${citiesPath} (${(fs.statSync(citiesPath).size / 1024).toFixed(1)} KB)`);

  // ---- land mask: cell is land if any city lies within LAND_RADIUS_KM of its center
  console.log('Building land mask...');
  const landMask = new Uint8Array(ROWS * COLS);
  for (const c of cities) {
    forCellsWithin(c.lat, c.lng, LAND_RADIUS_KM, (r, col) => {
      landMask[r * COLS + col] = 1;
    });
  }
  console.log(`Land mask: ${landMask.reduce((s, v) => s + v, 0)} of ${ROWS * COLS} cells`);

  // ---- population grid
  console.log('Accumulating city populations + rural Gaussian spread...');
  const grid = new Float64Array(ROWS * COLS);
  const twoSigma2 = 2 * SIGMA_KM * SIGMA_KM;
  let skippedRural = 0;
  const cellIdx = [];
  const cellW = [];
  for (const c of cities) {
    // a. direct urban count into containing cell
    grid[rowOf(c.lat) * COLS + colOf(c.lng)] += c.pop;

    // b. rural share: pop * 1.0 spread as truncated Gaussian over land cells
    cellIdx.length = 0;
    cellW.length = 0;
    let wSum = 0;
    forCellsWithin(c.lat, c.lng, TRUNC_KM, (r, col, d) => {
      const isLand = landMask[r * COLS + col] === 1 || d <= SELF_LAND_KM;
      if (!isLand) return;
      const w = Math.exp(-(d * d) / twoSigma2);
      cellIdx.push(r * COLS + col);
      cellW.push(w);
      wSum += w;
    });
    if (wSum <= 0) {
      skippedRural++;
      continue;
    }
    const share = c.pop / wSum; // rural share == pop * 1.0, conserved
    for (let k = 0; k < cellIdx.length; k++) grid[cellIdx[k]] += cellW[k] * share;
  }
  if (skippedRural) console.log(`Rural share skipped for ${skippedRural} cities (no land cells)`);

  // c. scale to world population
  let sum = 0;
  for (let i = 0; i < grid.length; i++) sum += grid[i];
  const scale = WORLD_POP / sum;
  console.log(`Raw sum ${(sum / 1e9).toFixed(3)}B, scaling by ${scale.toFixed(4)}`);
  const out = new Float32Array(ROWS * COLS);
  let total = 0;
  for (let i = 0; i < grid.length; i++) {
    out[i] = grid[i] * scale;
    total += out[i];
  }

  // ---- write outputs (Float32 little-endian, row-major, row 0 = +89.75, col 0 = -179.75)
  const binDir = path.join(ROOT, 'public', 'data');
  fs.mkdirSync(binDir, { recursive: true });
  const binPath = path.join(binDir, 'popgrid.bin');
  const buf = Buffer.alloc(out.length * 4);
  for (let i = 0; i < out.length; i++) buf.writeFloatLE(out[i], i * 4);
  fs.writeFileSync(binPath, buf);
  console.log(`Wrote ${binPath} (${(buf.length / 1024).toFixed(0)} KB)`);

  const meta = {
    cols: COLS,
    rows: ROWS,
    cellDeg: CELL_DEG,
    totalPop: total,
    source: 'simplemaps World Cities basic (CC BY 4.0) + Gaussian rural spread',
    built: new Date().toISOString(),
  };
  const metaPath = path.join(dataDir, 'popgrid-meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`Wrote ${metaPath}`);

  // ---- summary stats
  const cells = [];
  for (let i = 0; i < out.length; i++) if (out[i] > 0) cells.push([i, out[i]]);
  cells.sort((a, b) => b[1] - a[1]);
  console.log('\n=== Summary ===');
  console.log(`Total population: ${(total / 1e9).toFixed(3)} B`);
  console.log(`Max cell: ${(cells[0][1] / 1e6).toFixed(2)} M`);
  console.log('Top 5 cells:');
  for (const [i, v] of cells.slice(0, 5)) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    console.log(
      `  lat ${rowCenterLat(r).toFixed(2)}, lng ${colCenterLng(c).toFixed(2)}: ${(v / 1e6).toFixed(2)} M`,
    );
  }
  const probe = (lat, lng, label) =>
    console.log(`  ${label} (${lat},${lng}): ${Math.round(out[rowOf(lat) * COLS + colOf(lng)]).toLocaleString()}`);
  console.log('Probe cells:');
  probe(23.8, 90.4, 'Dhaka');
  probe(0, -140, 'Mid-Pacific');
  probe(25, 10, 'Sahara');
  probe(-80, 0, 'Antarctica');
  probe(31.2, 121.5, 'Shanghai');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
