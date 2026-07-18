import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GlobeScene } from './globe';
import { Cinematic } from './cinematic';
import { easeInOutCubic, kmToAngle, latLngToVec3 } from './geo';
import { useStore } from '../state/store';

/** Camera fly-to: eases toward framing the target point + its largest ring. */
class FlyTo {
  private from: THREE.Vector3;
  private to: THREE.Vector3;
  private t = 0;
  private duration = 1.6;
  constructor(camera: THREE.PerspectiveCamera, lat: number, lng: number, maxRadiusKm: number) {
    this.from = camera.position.clone();
    const angular = kmToAngle(Math.max(maxRadiusKm, 150));
    const dist = Math.min(9, Math.max(1.5, 1 + angular * 4.2));
    this.to = latLngToVec3(lat, lng, dist);
  }
  /** Returns true while still flying. */
  step(camera: THREE.PerspectiveCamera, dt: number): boolean {
    this.t += dt / this.duration;
    const k = easeInOutCubic(Math.min(this.t, 1));
    const from = this.from.clone().normalize();
    const to = this.to.clone().normalize();
    const dir = from.clone().lerp(to, k).normalize();
    const dist = THREE.MathUtils.lerp(this.from.length(), this.to.length(), k);
    camera.position.copy(dir.multiplyScalar(dist));
    camera.lookAt(0, 0, 0);
    return this.t < 1;
  }
}

export function GlobeView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GlobeScene | null>(null);
  const cinematicRef = useRef<Cinematic | null>(null);
  const flyRef = useRef<FlyTo | null>(null);
  const placing = useStore((s) => s.placing);

  // Create scene once.
  useEffect(() => {
    const container = containerRef.current!;
    const globe = new GlobeScene(container);
    sceneRef.current = globe;

    globe.onTick = (dt) => {
      if (flyRef.current) {
        const flying = flyRef.current.step(globe.camera, dt);
        if (!flying) flyRef.current = null;
      }
      if (cinematicRef.current) {
        const running = cinematicRef.current.update(dt);
        if (!running) cinematicRef.current = null;
      }
    };

    const onClick = (ev: MouseEvent) => {
      const state = useStore.getState();
      if (!state.placing) return;
      const hit = globe.pick(ev);
      if (hit) state.setLocation(hit.lat, hit.lng);
    };
    globe.renderer.domElement.addEventListener('click', onClick);

    // Initial scenario setup + first cinematic.
    syncScene(globe, true);

    const unsub = useStore.subscribe((state, prev) => {
      const scenarioChanged = state.scenario !== prev.scenario;
      const replayRequested = state.animationNonce !== prev.animationNonce;
      if (scenarioChanged || replayRequested) syncScene(globe, replayRequested);
    });

    function syncScene(g: GlobeScene, animate: boolean) {
      const { scenario, result } = useStore.getState();
      g.setSun(scenario.lat, scenario.lng);
      g.setMarker(scenario.lat, scenario.lng);
      g.setZones(scenario.lat, scenario.lng, result.zones);
      if (animate) {
        cinematicRef.current?.cancel();
        cinematicRef.current = new Cinematic(g, scenario, result);
        const maxR = result.zones.length ? result.zones[result.zones.length - 1].radiusKm : 500;
        flyRef.current = new FlyTo(g.camera, scenario.lat, scenario.lng, maxR);
      } else {
        g.setRingsOpacity(1);
      }
    }

    return () => {
      unsub();
      globe.renderer.domElement.removeEventListener('click', onClick);
      globe.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`globe-view${placing ? ' placing' : ''}`}
      aria-label="3D Earth impact view"
    />
  );
}
