import { create } from 'zustand';
import { useStore } from './store';
import { useView } from './view';
import { storyObserver, tunguskaScenario } from '../stories/tunguska';
import type { ImpactorType, Scenario } from '../types';
import type { ObserverLocation } from '../physics/observer';

interface ReturnState {
  scenario: Scenario; eventId: string | null; compareYears: number[];
  observer: ObserverLocation | null; clouds: boolean; zones: boolean; haze: boolean; focus: boolean; footprint: boolean;
}
interface StoryState {
  active: boolean; exploring: boolean; chapter: number; material: ImpactorType; distanceKm: number;
  returnState: ReturnState | null;
  start(material?: ImpactorType, distanceKm?: number, chapter?: number): void;
  go(chapter: number): void;
  setMaterial(material: ImpactorType): void;
  setDistance(distanceKm: number): void;
  explore(): void; resume(): void; close(keep?: boolean): void;
}

function applyChapter(chapter: number, material: ImpactorType, distanceKm: number) {
  useStore.getState().loadScenario(tunguskaScenario(chapter >= 3 ? material : 'stony'), chapter >= 3 && material !== 'stony' ? null : 'tunguska');
  useView.setState({ frameRadiusKm: chapter >= 2 ? Math.max(150, distanceKm) : null, focus: false, pickingObserver: false, footprint: false, clouds: chapter === 0, zones: chapter >= 2, haze: false, orbit: false, paused: true, renderScene: chapter !== 1 && chapter !== 3, observer: chapter >= 2 ? storyObserver(distanceKm) : null, cameraTarget: chapter >= 2 ? 'route' : 'event', cameraNonce: useView.getState().cameraNonce + 1 });
}

export const useStory = create<StoryState>((set, get) => ({
  active: false, exploring: false, chapter: 0, material: 'iron', distanceKm: 60, returnState: null,
  start(material = 'iron', distanceKm = 60, chapter = 0) {
    const s = useStore.getState(); const v = useView.getState();
    const returnState = get().returnState ?? { scenario: structuredClone(s.scenario), eventId: s.eventId, compareYears: [...s.compareYears], observer: v.observer, clouds: v.clouds, zones: v.zones, haze: v.haze, focus: v.focus, footprint: v.footprint };
    set({ active: true, exploring: false, chapter, material, distanceKm, returnState });
    applyChapter(chapter, material, distanceKm);
    window.scrollTo({ top: 0, behavior: 'instant' });
  },
  go(chapter) {
    chapter = Math.max(0, Math.min(4, chapter));
    set({ chapter, exploring: false });
    applyChapter(chapter, get().material, get().distanceKm);
    window.scrollTo({ top: 0, behavior: 'instant' });
  },
  setMaterial(material) { set({ material }); applyChapter(get().chapter, material, get().distanceKm); },
  setDistance(distanceKm) { set({ distanceKm }); applyChapter(get().chapter, get().material, distanceKm); },
  explore() {
    set({ exploring: true });
    useView.setState({ renderScene: true, frameRadiusKm: null, paused: false, inspector: 'observer', mobilePanel: 'params' });
  },
  resume() { set({ exploring: false }); applyChapter(get().chapter, get().material, get().distanceKm); window.scrollTo({ top: 0, behavior: 'instant' }); },
  close(keep = false) {
    const previous = get().returnState;
    set({ active: false, exploring: false, returnState: null });
    if (!keep && previous) {
      useStore.getState().loadScenario(previous.scenario, previous.eventId, previous.compareYears);
      const { observer, clouds, zones, haze, focus, footprint } = previous;
      useView.setState({ observer, clouds, zones, haze, focus, footprint });
    }
    useView.setState({ renderScene: true, frameRadiusKm: null, paused: false, pickingObserver: false, cameraTarget: 'event', cameraNonce: useView.getState().cameraNonce + 1 });
    window.scrollTo({ top: 0, behavior: 'instant' });
  },
}));
