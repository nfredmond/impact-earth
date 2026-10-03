import { create } from 'zustand';
import type { ObserverLocation } from '../physics/observer';

interface ViewState {
  mapMode: 'globe' | 'local';
  mapCenter: 'event' | 'observer' | 'baseline';
  mapRadius: number;
  quality: 'standard' | 'low';
  graphicsError: string | null;
  graphicsEpoch: number;
  focus: boolean;
  clouds: boolean;
  zones: boolean;
  haze: boolean;
  orbit: boolean;
  paused: boolean;
  speed: number;
  elapsed: number;
  running: boolean;
  renderScene: boolean;
  frameRadiusKm: number | null;
  cameraNonce: number;
  cameraTarget: 'event' | 'observer' | 'route';
  inspector: 'scenario' | 'observer' | 'scale' | 'compare' | 'sensitivity';
  mobilePanel: 'catalog' | 'params' | 'results';
  observer: ObserverLocation | null;
  pickingObserver: boolean;
  footprint: boolean;
  setObserver(observer: ObserverLocation): void;
  lookAt(target: 'event' | 'observer' | 'route'): void;
  toggle(key: 'focus' | 'clouds' | 'zones' | 'haze' | 'orbit' | 'paused'): void;
  setSpeed(speed: number): void;
  frameEvent(): void;
}

export const useView = create<ViewState>((set) => ({
  mapMode: 'globe', mapCenter: 'event', mapRadius: 500, quality: 'standard', graphicsError: null, graphicsEpoch: 0,
  focus: false,
  clouds: true,
  zones: true,
  haze: true,
  orbit: false,
  paused: false,
  speed: 1,
  elapsed: 0,
  running: false,
  renderScene: true,
  frameRadiusKm: null,
  cameraNonce: 0,
  cameraTarget: 'event',
  inspector: 'scenario',
  mobilePanel: 'catalog',
  observer: null,
  pickingObserver: false,
  footprint: false,
  setObserver: (observer) => set((state) => ({ observer, pickingObserver: false, cameraTarget: 'route', cameraNonce: state.cameraNonce + 1, orbit: false })),
  lookAt: (cameraTarget) => set((state) => ({ cameraTarget, mapCenter: cameraTarget === 'observer' ? 'observer' : 'event', cameraNonce: state.cameraNonce + 1, orbit: false })),
  toggle: (key) => set((state) => ({ [key]: !state[key] })),
  setSpeed: (speed) => set({ speed }),
  frameEvent: () => set((state) => ({ cameraTarget: 'event', mapCenter: 'event', cameraNonce: state.cameraNonce + 1, orbit: false })),
}));
