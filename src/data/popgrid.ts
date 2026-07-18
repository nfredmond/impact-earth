/**
 * Runtime loader for the 0.5-degree population grid built by scripts/build-popgrid.mjs.
 *
 * Grid layout: 720x360 Float32 (little-endian), row-major.
 * Row 0 = latitude band 89.5..90 (center +89.75), rows go north -> south.
 * Col 0 = longitude band -180..-179.5 (center -179.75), cols go west -> east.
 * Each value is the estimated population COUNT of the cell.
 */

export interface PopGrid {
  cols: number;
  rows: number;
  cellDeg: number;
  data: Float32Array;
  /** Population count of the cell containing (lat, lng). */
  cellPop(lat: number, lng: number): number;
  /** Area in km2 of a cell at the given latitude. */
  cellAreaKm2(lat: number): number;
}

const KM_PER_DEG = 111.32;

/** Wrap a PopGrid interface around raw grid data. */
export function createPopGrid(
  data: Float32Array,
  cols = 720,
  rows = 360,
  cellDeg = 0.5,
): PopGrid {
  if (data.length !== cols * rows) {
    throw new Error(`popgrid: expected ${cols * rows} cells, got ${data.length}`);
  }
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    cols,
    rows,
    cellDeg,
    data,
    cellPop(lat: number, lng: number): number {
      const row = clamp(Math.floor((90 - lat) / cellDeg), 0, rows - 1);
      let col = Math.floor((lng + 180) / cellDeg);
      col = ((col % cols) + cols) % cols; // wrap longitude
      return data[row * cols + col];
    },
    cellAreaKm2(lat: number): number {
      const side = KM_PER_DEG * cellDeg;
      return side * side * Math.abs(Math.cos((lat * Math.PI) / 180));
    },
  };
}

/** Fetch and decode public/data/popgrid.bin. */
export async function loadPopGrid(): Promise<PopGrid> {
  const url = import.meta.env.BASE_URL + 'data/popgrid.bin';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`popgrid: failed to fetch ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  return createPopGrid(new Float32Array(buf));
}
