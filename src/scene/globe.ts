// The cinematic Earth: day/night shader globe, clouds, atmosphere, starfield,
// damage rings, and hooks the animation timeline uses (dust veil, crater scars).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { EffectZone } from '../types';
import { kmToAngle, latLngToVec3, ringBandGeometry, ringLineGeometry, vec3ToLatLng } from './geo';

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

  private earthUniforms: Record<string, THREE.IUniform>;
  private cloudUniforms: Record<string, THREE.IUniform>;
  private atmoUniforms: Record<string, THREE.IUniform>;
  private raycaster = new THREE.Raycaster();
  private disposed = false;
  /** Per-frame tick set by the cinematic driver. */
  onTick: ((dt: number, elapsed: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    this.scene.add(this.ringsGroup, this.scarsGroup, this.fxGroup);

    const onResize = () => {
      if (this.disposed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let last = performance.now();
    let elapsed = 0;
    const animate = () => {
      if (this.disposed) return;
      requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      elapsed += dt;
      this.clouds.rotation.y += dt * 0.004;
      const pulse = 1 + 0.12 * Math.sin(elapsed * 3.5);
      this.marker.children[0]?.scale.setScalar(pulse);
      this.onTick?.(dt, elapsed);
      this.controls.update();
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
    this.earthUniforms.dustAmount.value = amount;
    this.cloudUniforms.dustAmount.value = amount;
  }
  getDust(): number {
    return this.earthUniforms.dustAmount.value as number;
  }

  setMarker(lat: number, lng: number) {
    const p = latLngToVec3(lat, lng, 1.002);
    this.marker.position.copy(p);
    this.marker.lookAt(p.clone().multiplyScalar(2));
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
    this.controls.dispose();
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
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  }
}
