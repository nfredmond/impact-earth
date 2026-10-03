// The cinematic Earth: day/night shader globe, clouds, atmosphere, starfield,
// damage rings, and hooks the animation timeline uses (dust veil, crater scars).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { EffectZone } from '../types';
import { kmToAngle, latLngToVec3, ringBandGeometry, ringLineGeometry, vec3ToLatLng } from './geo';
import { surfaceRoute } from './observerGeometry';
import type { ObserverLocation } from '../physics/observer';

const BASE = import.meta.env.BASE_URL;

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D waterMask;
  uniform vec3 sunDir;
  uniform float dustAmount;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float cosSun = dot(n, sunDir);
    float dayFactor = smoothstep(-0.12, 0.25, cosSun);

    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    float water = texture2D(waterMask, vUv).b;

    // Sunlit side with soft ambient.
    vec3 lit = day * (0.08 + 1.15 * max(cosSun, 0.0));
    // Ocean specular glint.
    vec3 refl = reflect(-sunDir, n);
    float spec = pow(max(dot(refl, viewDir), 0.0), 32.0) * water * 0.45 * dayFactor;
    lit += vec3(1.0, 0.95, 0.85) * spec;

    // City lights emerge on the night side.
    vec3 nightGlow = night * vec3(1.0, 0.85, 0.6) * 2.2 * (1.0 - dayFactor);
    nightGlow += day * 0.015; // faint moonlit landmass

    vec3 color = lit * dayFactor + nightGlow;

    // Rim atmosphere tint.
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
    color += vec3(0.18, 0.35, 0.65) * rim * (0.25 + 0.75 * dayFactor);

    // Impact-winter dust veil: desaturate, darken, brown out.
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 dusty = mix(vec3(lum), color, 0.35) * vec3(0.85, 0.72, 0.55);
    color = mix(color, dusty * 0.55, dustAmount);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 sunDir;
  uniform float dustAmount;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec4 c = texture2D(map, vUv);
    float alpha = c.a * max(c.r, max(c.g, c.b));
    float cosSun = dot(normalize(vNormal), sunDir);
    float light = 0.06 + 1.05 * max(cosSun, 0.0);
    gl_FragColor = vec4(vec3(light), alpha * 0.85 * (1.0 - 0.6 * dustAmount));
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 sunDir;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - abs(dot(n, viewDir)), 3.2);
    float sunBoost = 0.45 + 0.75 * max(dot(n, sunDir), 0.0);
    gl_FragColor = vec4(vec3(0.25, 0.5, 1.0) * rim * sunBoost, rim * 0.9);
  }
`;

export class GlobeScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly earth: THREE.Mesh;
  readonly clouds: THREE.Mesh;
  /** Group holding damage rings; animations toggle visibility/opacity. */
  readonly ringsGroup = new THREE.Group();
  /** Persistent scars (crater/caldera decals) from the last cinematic. */
  readonly scarsGroup = new THREE.Group();
  /** Transient FX added by cinematics. */
  readonly fxGroup = new THREE.Group();
  readonly marker: THREE.Group;
  readonly observerGroup = new THREE.Group();
  private observerPin: THREE.Mesh | null = null;

  private earthUniforms: Record<string, THREE.IUniform>;
  private cloudUniforms: Record<string, THREE.IUniform>;
  private atmoUniforms: Record<string, THREE.IUniform>;
  private raycaster = new THREE.Raycaster();
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private dust = 0;
  private hazeVisible = true;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** Per-frame tick set by the cinematic driver. */
  onTick: ((dt: number, elapsed: number) => void) | null = null;
  onViewportResize: (() => void) | null = null;
  active = true;

  constructor(container: HTMLElement, lowDetail = false) {
    this.renderer = new THREE.WebGLRenderer({ antialias: !lowDetail, alpha: false });
    this.renderer.setPixelRatio(lowDetail ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.01, 200);
    this.camera.position.set(0, 0.6, 2.8);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.15;
    this.controls.maxDistance = 12;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.45;

    const loader = new THREE.TextureLoader();
    const tex = (p: string, srgb = true) => {
      const t = loader.load(BASE + p);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      return t;
    };

    const sunDir = latLngToVec3(10, -30).normalize();
    this.earthUniforms = {
      dayMap: { value: tex('textures/earth-day.jpg') },
      nightMap: { value: tex('textures/earth-night.jpg') },
      waterMask: { value: tex('textures/earth-water.png', false) },
      sunDir: { value: sunDir },
      dustAmount: { value: 0 },
    };
    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 96),
      new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: this.earthUniforms }),
    );
    this.scene.add(this.earth);

    this.cloudUniforms = {
      map: { value: tex('textures/clouds.png') },
      sunDir: { value: sunDir },
      dustAmount: { value: 0 },
    };
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.008, 96, 72),
      new THREE.ShaderMaterial({
        vertexShader: EARTH_VERT,
        fragmentShader: CLOUD_FRAG,
        uniforms: this.cloudUniforms,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.scene.add(this.clouds);

    this.atmoUniforms = { sunDir: { value: sunDir } };
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.07, 96, 72),
      new THREE.ShaderMaterial({
        vertexShader: EARTH_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: this.atmoUniforms,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(atmo);

    const stars = new THREE.Mesh(
      new THREE.SphereGeometry(80, 32, 32),
      new THREE.MeshBasicMaterial({ map: tex('textures/night-sky.png'), side: THREE.BackSide }),
    );
    (stars.material as THREE.MeshBasicMaterial).color.setScalar(0.55);
    this.scene.add(stars);

    this.marker = buildMarker();
    this.scene.add(this.marker);
    this.scene.add(this.ringsGroup, this.scarsGroup, this.fxGroup, this.observerGroup);

    const onResize = () => {
      if (this.disposed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      const fov = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const oldView = Math.sin(Math.atan(Math.tan(fov) * Math.min(this.camera.aspect, 1)));
      const newView = Math.sin(Math.atan(Math.tan(fov) * Math.min(w / h, 1)));
      this.camera.position.multiplyScalar(oldView / newView).clampLength(this.controls.minDistance, this.controls.maxDistance);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.onViewportResize?.();
    };
    this.resizeObserver = new ResizeObserver(onResize);
    this.resizeObserver.observe(container);

    let last = performance.now();
    let elapsed = 0;
    const animate = () => {
      if (this.disposed) return;
      requestAnimationFrame(animate);
      const now = performance.now();
      if (!this.active || document.hidden) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      elapsed += dt;
      if (!this.reducedMotion.matches) this.clouds.rotation.y += dt * 0.004;
      const pulse = this.reducedMotion.matches ? 1 : 1 + 0.12 * Math.sin(elapsed * 3.5);
      this.marker.children[0]?.scale.setScalar(pulse);
      this.onTick?.(dt, elapsed);
      this.controls.update(dt);
      const markerDistance = this.camera.position.distanceTo(this.marker.position);
      const markerPixel = 2 * markerDistance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / container.clientHeight;
      this.marker.scale.setScalar(Math.min(1, markerPixel * 7 / .009));
      if (this.observerPin) {
        const distance = this.camera.position.distanceTo(this.observerPin.position);
        const worldPerPixel = 2 * distance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / container.clientHeight;
        this.observerPin.scale.setScalar(worldPerPixel * 6 / .013);
      }
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  /** Aim the sun so ground zero sits in daylight, near the terminator for drama. */
  setSun(lat: number, lng: number) {
    const dir = latLngToVec3(Math.max(-60, Math.min(60, lat * 0.6 + 8)), lng + 35).normalize();
    this.earthUniforms.sunDir.value = dir;
    this.cloudUniforms.sunDir.value = dir;
    this.atmoUniforms.sunDir.value = dir;
  }

  setDust(amount: number) {
    this.dust = amount;
    this.earthUniforms.dustAmount.value = this.hazeVisible ? amount : 0;
    this.cloudUniforms.dustAmount.value = this.hazeVisible ? amount : 0;
  }
  getDust(): number {
    return this.dust;
  }
  setHazeVisible(visible: boolean) {
    this.hazeVisible = visible;
    this.setDust(this.dust);
  }

  setMarker(lat: number, lng: number) {
    const p = latLngToVec3(lat, lng, 1.002);
    this.marker.position.copy(p);
    this.marker.lookAt(p.clone().multiplyScalar(2));
  }

  setObserver(source: { lat: number; lng: number }, observer: ObserverLocation | null, footprintKm: number | null) {
    disposeChildren(this.observerGroup);
    this.observerPin = null;
    if (!observer) return;
    const points = surfaceRoute(source, observer).map((point) => point.multiplyScalar(1.002));
    const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: 0x9eeaf0, dashSize: .015, gapSize: .008, transparent: true, opacity: .9 }));
    route.computeLineDistances();
    this.observerGroup.add(route);
    const position = latLngToVec3(observer.lat, observer.lng, 1.002);
    const pin = new THREE.Mesh(new THREE.RingGeometry(.009, .013, 48), new THREE.MeshBasicMaterial({ color: 0x9eeaf0, side: THREE.DoubleSide, depthWrite: false }));
    pin.position.copy(position);
    pin.lookAt(position.clone().multiplyScalar(2));
    this.observerPin = pin;
    this.observerGroup.add(pin);

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a202cee';
    ctx.beginPath();
    ctx.roundRect(2, 2, 636, 92, 16);
    ctx.fill();
    ctx.strokeStyle = '#90d9e6';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '500 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ddf7ff';
    const label = observer.name.length > 30 ? `${observer.name.slice(0, 29)}…` : observer.name;
    ctx.fillText(`◎  ${label}`, 320, 48, 600);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthWrite: false, sizeAttenuation: false }));
    sprite.position.copy(position);
    sprite.center.set(.5, -.6);
    sprite.scale.set(.20, .03, 1);
    this.observerGroup.add(sprite);
    if (footprintKm != null) {
      const line = new THREE.Line(ringLineGeometry(position.clone().normalize(), kmToAngle(footprintKm / 2), .002), new THREE.LineDashedMaterial({ color: 0x9eeaf0, dashSize: .005, gapSize: .003, depthWrite: false }));
      line.computeLineDistances();
      this.observerGroup.add(line);
    }
  }

  /** Replace the damage rings for a scenario. */
  setZones(lat: number, lng: number, zones: EffectZone[]) {
    disposeChildren(this.ringsGroup);
    const center = latLngToVec3(lat, lng);
    // Build outermost first so inner rings render on top.
    const sorted = [...zones].sort((a, b) => b.radiusKm - a.radiusKm);
    const innerAngles = new Map<string, number>();
    {
      let prev = 0;
      for (const z of zones) {
        innerAngles.set(z.id, prev);
        prev = kmToAngle(z.radiusKm);
      }
    }
    sorted.forEach((z, i) => {
      const a1 = kmToAngle(z.radiusKm);
      const a0 = innerAngles.get(z.id) ?? 0;
      const color = new THREE.Color(z.color);
      const fill = new THREE.Mesh(
        ringBandGeometry(center, a0, a1, 0.0012 + i * 0.0004),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      const line = new THREE.Line(
        ringLineGeometry(center, a1, 0.0018 + i * 0.0004),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }),
      );
      fill.userData.zoneId = z.id;
      this.ringsGroup.add(fill, line);
    });
  }

  setRingsOpacity(mul: number) {
    for (const child of this.ringsGroup.children) {
      const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = (child instanceof THREE.Line ? 0.85 : 0.16) * mul;
    }
  }

  /** Raycast a pointer event to lat/lng on the globe. */
  pick(ev: PointerEvent | MouseEvent): { lat: number; lng: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.earth, false)[0];
    if (!hit) return null;
    const { lat, lng } = vec3ToLatLng(hit.point);
    return { lat, lng };
  }

  dispose() {
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.controls.dispose();
    const textures = new Set<THREE.Texture>();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      for (const material of materials) {
        const map = (material as THREE.MeshBasicMaterial).map;
        if (map) textures.add(map);
        if (material instanceof THREE.ShaderMaterial) {
          Object.values(material.uniforms).forEach(({ value }) => {
            if (value instanceof THREE.Texture) textures.add(value);
          });
        }
        material.dispose();
      }
    });
    textures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function buildMarker(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.006, 0.009, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  );
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.002, 24),
    new THREE.MeshBasicMaterial({ color: 0xff4433, side: THREE.DoubleSide, depthWrite: false }),
  );
  g.add(ring, dot);
  return g;
}

export function disposeChildren(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    for (const material of mat ? (Array.isArray(mat) ? mat : [mat]) : []) {
      (material as THREE.MeshBasicMaterial).map?.dispose();
      material.dispose();
    }
  }
}
