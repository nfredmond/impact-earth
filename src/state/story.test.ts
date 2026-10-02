import { expect, it, vi } from 'vitest';
// Population integration is outside this story-navigation test. Physics remains real.
vi.mock('../data/popgrid', () => ({ loadPopGrid: async () => null }));
import { useStore } from './store';
import { useView } from './view';
import { useStory } from './story';

it('resumes story choices after exploration and restores the original scenario on exit', () => {
  vi.stubGlobal('window', { scrollTo: vi.fn() });
  const previous = structuredClone(useStore.getState().scenario);
  useStore.getState().toggleCompareYear(1908);
  useView.getState().setObserver({ name: 'Original point', lat: 40, lng: -120 });
  useStory.getState().start();
  useStory.getState().go(3);
  useStory.getState().setMaterial('comet');
  useStory.getState().setDistance(120);
  useStory.getState().explore();
  useStore.getState().selectEvent('toba');
  useStory.getState().resume();
  expect(useStore.getState().scenario.params).toMatchObject({ kind: 'impact', impactorType: 'comet', diameterM: 55 });
  expect(useView.getState().observer?.name).toContain('120 km');
  expect(useStory.getState().chapter).toBe(3);
  expect(useView.getState().renderScene).toBe(false);
  useStory.getState().close();
  expect(useStore.getState().scenario).toEqual(previous);
  expect(useStore.getState().compareYears).toEqual([1908]);
  expect(useView.getState().observer?.name).toBe('Original point');
  expect(useView.getState().renderScene).toBe(true);
  vi.unstubAllGlobals();
});
