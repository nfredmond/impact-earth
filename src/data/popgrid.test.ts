/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createPopGrid } from './popgrid';

const buf = readFileSync(new URL('../../public/data/popgrid.bin', import.meta.url));
const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const grid = createPopGrid(data);

describe('popgrid.bin', () => {
  it('has the expected dimensions', () => {
    expect(grid.data.length).toBe(720 * 360);
  });

  it('sums to ~8.1e9 (±5%)', () => {
    let total = 0;
    for (let i = 0; i < grid.data.length; i++) total += grid.data[i];
    expect(total).toBeGreaterThan(8.1e9 * 0.95);
    expect(total).toBeLessThan(8.1e9 * 1.05);
  });

  it('Dhaka cell holds a megacity', () => {
    expect(grid.cellPop(23.8, 90.4)).toBeGreaterThan(2_000_000);
  });

  it('mid-Pacific is empty', () => {
    expect(grid.cellPop(0, -140)).toBeLessThan(1000);
  });

  it('deep Sahara is sparse', () => {
    expect(grid.cellPop(25, 10)).toBeLessThan(200_000);
  });

  it('cell area shrinks with latitude', () => {
    expect(grid.cellAreaKm2(0)).toBeCloseTo(55.66 * 55.66, 0);
    expect(grid.cellAreaKm2(60)).toBeLessThan(grid.cellAreaKm2(0) * 0.51);
  });
});
