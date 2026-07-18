import { describe, expect, it } from 'vitest';
import { cities, citiesWithin } from './cities';

describe('cities', () => {
  it('has exactly 3000 cities', () => {
    expect(cities.length).toBe(3000);
  });

  it('includes Tokyo with a huge population', () => {
    const tokyo = cities.find((c) => c.name === 'Tokyo' && c.country === 'JP');
    expect(tokyo).toBeDefined();
    expect(tokyo!.pop).toBeGreaterThan(1e7);
  });

  it('knows Rome was founded in 753 BC', () => {
    const rome = cities.find((c) => c.name === 'Rome' && c.country === 'IT');
    expect(rome).toBeDefined();
    expect(rome!.founded).toBe(-753);
  });

  it('citiesWithin finds Paris near Paris', () => {
    const near = citiesWithin(48.85, 2.35, 50);
    expect(near.some((c) => c.name === 'Paris' && c.country === 'FR')).toBe(true);
  });
});
