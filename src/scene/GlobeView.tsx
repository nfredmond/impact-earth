import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GlobeScene } from './globe';
import { Cinematic, showOverview } from './cinematic';
import { easeInOutCubic, kmToAngle, latLngToVec3, vec3ToLatLng } from './geo';
import { surfaceRoute } from './observerGeometry';
import { footprintDiameterKm } from '../physics/observer';
import { haversineKm } from '../data/cities';
import { useStore } from '../state/store';
import { useView } from '../state/view';

/** Camera fly-to: eases toward framing the target point + its largest ring. */
class FlyTo {
  private from: THREE.Vector3;
  private to: THREE.Vector3;
  private t = 0;
  private duration = 1.6;
  constructor(camera: THREE.PerspectiveCamera, lat: number, lng: number, maxRadiusKm: number, detail = false) {
    this.from = camera.position.clone();
    const angular = kmToAngle(Math.max(maxRadiusKm, 150));
    const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1));
    const globeFit = 1.12 / Math.sin(halfFov);
    const verticalFit = 1.12 / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = detail ? Math.max(1.08, Math.cos(angular) + 1.2 * Math.sin(angular) / Math.tan(halfFov)) : globeFit * Math.min(1, Math.max(1.5, 1 + angular * 4.2) / verticalFit);
    this.to = latLngToVec3(lat, lng, dist);
  }
  /** Returns true while still flying. */
  step(camera: THREE.PerspectiveCamera, dt: number): boolean {
    this.t += dt / this.duration;
    const k = easeInOutCubic(Math.min(this.t, 1));
    const from = this.from.clone().normalize();
    const to = this.to.clone().normalize();
    const rotation = new THREE.Quaternion().setFromUnitVectors(from, to);
    const dir = from.applyQuaternion(new THREE.Quaternion().slerp(rotation, k));
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
  const pickingObserver = useView((s) => s.pickingObserver);

  // Create scene once.
  useEffect(() => {
    const container = containerRef.current!;
    const globe = new GlobeScene(container, useView.getState().quality === 'low');
    const lost = (event: Event) => {
      event.preventDefault();
      useView.setState({ graphicsError: 'The 3D view lost its graphics connection. Your scenario is still available.', mapMode: 'local' });
    };
    globe.renderer.domElement.addEventListener('webglcontextlost', lost);
    sceneRef.current = globe;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    globe.onTick = (dt) => {
      if (flyRef.current) {
        const flying = flyRef.current.step(globe.camera, dt);
        if (!flying) flyRef.current = null;
      }
      if (cinematicRef.current) {
        const view = useView.getState();
        if (!view.paused) {
          const running = cinematicRef.current.update(dt * view.speed);
          const elapsed = cinematicRef.current.elapsed;
          if (!running || Math.abs(elapsed - view.elapsed) >= 0.1) useView.setState({ elapsed, running });
          if (!running) cinematicRef.current = null;
        }
      }
    };

    const frameEvent = () => {
      const { scenario, result } = useStore.getState();
      const { observer, cameraTarget, footprint, frameRadiusKm } = useView.getState();
      let target = { lat: scenario.lat, lng: scenario.lng };
      let radius = Math.max(...result.zones.map((z) => z.radiusKm), 150);
      if (observer && cameraTarget === 'observer') {
        target = observer;
        radius = footprint ? Math.max(150, footprintDiameterKm(result) ?? 150) : 550;
      } else if (observer && cameraTarget === 'route') {
        const route = surfaceRoute(scenario, observer, 2);
        target = vec3ToLatLng(route[1]);
        radius = Math.max(900, haversineKm(scenario.lat, scenario.lng, observer.lat, observer.lng) * .8);
      }
      flyRef.current = new FlyTo(globe.camera, target.lat, target.lng, frameRadiusKm ?? radius, frameRadiusKm !== null);
      if (reducedMotion.matches) {
        flyRef.current.step(globe.camera, 2);
        flyRef.current = null;
      }
    };
    const syncView = () => {
      const view = useView.getState();
      globe.active = view.renderScene;
      globe.controls.minDistance = view.frameRadiusKm === null ? 1.15 : 1.04;
      globe.clouds.visible = view.clouds;
      globe.ringsGroup.visible = view.zones;
      globe.setHazeVisible(view.haze);
      globe.controls.autoRotate = view.orbit;
      globe.controls.autoRotateSpeed = 0.5;
    };
    globe.onViewportResize = () => {
      if (flyRef.current) frameEvent();
    };
    syncView();
    const syncObserver = () => {
      const { scenario, result } = useStore.getState();
      const { observer, footprint } = useView.getState();
      globe.setObserver(scenario, observer, footprint ? footprintDiameterKm(result) : null);
    };
    syncObserver();
    const unsubView = useView.subscribe((state, prev) => {
      syncView();
      if (state.observer !== prev.observer || state.footprint !== prev.footprint) syncObserver();
      if (state.cameraNonce !== prev.cameraNonce) frameEvent();
    });
    const onOrbitStart = () => { flyRef.current = null; };
    globe.controls.addEventListener('start', onOrbitStart);

    let pointerStart: { x: number; y: number } | null = null;
    const onPointerDown = (ev: PointerEvent) => { pointerStart = { x: ev.clientX, y: ev.clientY }; };
    const onClick = (ev: MouseEvent) => {
      const state = useStore.getState();
      const view = useView.getState();
      if ((!state.placing && !view.pickingObserver) || !pointerStart || Math.hypot(ev.clientX - pointerStart.x, ev.clientY - pointerStart.y) > 6) return;
      const hit = globe.pick(ev);
      if (hit) {
        if (view.pickingObserver) view.setObserver({ ...hit, name: `${hit.lat.toFixed(2)}°, ${hit.lng.toFixed(2)}°` });
        else state.setLocation(hit.lat, hit.lng);
      }
    };
    globe.renderer.domElement.addEventListener('click', onClick);
    globe.renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Initial scenario setup + first cinematic.
    syncScene(globe, !reducedMotion.matches);
    frameEvent();

    const unsub = useStore.subscribe((state, prev) => {
      const scenarioChanged = state.scenario !== prev.scenario;
      const replayRequested = state.animationNonce !== prev.animationNonce;
      const physicalChange = state.scenario.params !== prev.scenario.params || state.scenario.lat !== prev.scenario.lat || state.scenario.lng !== prev.scenario.lng;
      if (state.placing && !prev.placing) useView.setState({ pickingObserver: false });
      if (physicalChange || replayRequested) syncScene(globe, replayRequested && (!reducedMotion.matches || !scenarioChanged));
      if (physicalChange) syncObserver();
      if (replayRequested) frameEvent();
    });

    function syncScene(g: GlobeScene, animate: boolean) {
      const { scenario, result } = useStore.getState();
      cinematicRef.current?.cancel();
      cinematicRef.current = null;
      g.setSun(scenario.lat, scenario.lng);
      g.setMarker(scenario.lat, scenario.lng);
      g.setZones(scenario.lat, scenario.lng, result.zones);
      if (animate) {
        cinematicRef.current = new Cinematic(g, scenario, result);
        useView.setState({ elapsed: 0, paused: false, running: true, orbit: false });
      } else {
        showOverview(g, scenario, result);
        useView.setState({ elapsed: 8, paused: false, running: false });
      }
    }

    return () => {
      unsub();
      unsubView();
      globe.renderer.domElement.removeEventListener('webglcontextlost', lost);
      globe.controls.removeEventListener('start', onOrbitStart);
      cinematicRef.current?.cancel();
      cinematicRef.current = null;
      globe.renderer.domElement.removeEventListener('click', onClick);
      globe.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      globe.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`globe-view${placing || pickingObserver ? ' placing' : ''}`}
      aria-label="3D Earth impact view"
    />
  );
}
