import { cities } from './cities';

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const index = cities.map((city) => ({ city, name: normalize(city.name), full: normalize(`${city.name} ${city.country}`) }));

export function searchCities(query: string, limit = 6) {
  const q = normalize(query);
  if (!q) return [];
  return index.filter(({ full }) => q.split(/\s+/).every((word) => full.includes(word)))
    .sort((a, b) => {
      const rank = (name: string) => name === q ? 0 : name.startsWith(q) ? 1 : 2;
      return rank(a.name) - rank(b.name) || b.city.pop - a.city.pop;
    }).slice(0, limit).map(({ city }) => city);
}
