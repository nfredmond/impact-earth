// Cinematic timelines: the incoming bolide, flash, fireball, shockwave and
// crater scar for impacts; column, pyroclastic surge and ash shroud for
// eruptions. Distances are true-to-globe; vertical scales are exaggerated
// slightly so the show reads at planetary zoom.

import * as THREE from 'three';
import type { Scenario, SimulationResult } from '../types';
import { GlobeScene, disposeChildren } from './globe';
import { clamp01, easeOutCubic, kmToAngle, latLngToVec3, ringBandGeometry, ringLineGeometry } from './geo';

const DUST_TARGET: Record<string, number> = {
  none: 0,
  regional: 0.12,
  continental: 0.45,
  'global-winter': 0.75,
  'mass-extinction': 0.92,
};

export class Cinematic {
  private t = 0;
  private done = false;
  private bolide: THREE.Mesh | null = null;
  private trail: THREE.Line | null = null;
  private flash: THREE.Sprite;
  private fireball: THREE.Mesh;
  private shock: THREE.Line | null = null;
  private column: THREE.Mesh | null = null;
  private plume: THREE.Sprite[] = [];
  private groundZero: THREE.Vector3;
  private entryDir: THREE.Vector3;
  private burstPoint: THREE.Vector3;
  private dustStart = 0;
  private dustTarget: number;
  private ringsShown = false;

  /** Timeline lengths (s). */
  private tArrive = 2.1;
  private tTotal = 8;

  private globe: GlobeScene;
  private scenario: Scenario;
  private result: SimulationResult;

  constructor(globe: GlobeScene, scenario: Scenario, result: SimulationResult) {
    this.globe = globe;
    this.scenario = scenario;
    this.result = result;
    disposeChildren(globe.fxGroup);
    disposeChildren(globe.scarsGroup);
    globe.setRingsOpacity(0);

    this.groundZero = latLngToVec3(scenario.lat, scenario.lng);
    this.dustStart = globe.getDust();
    this.dustTarget = DUST_TARGET[result.global.severity] ?? 0;

    // Entry direction: swoop in at the scenario's entry angle, offset in azimuth.
    const up = this.groundZero.clone();
    const east = new THREE.Vector3(0, 1, 0).cross(up).normalize();
    const north = up.clone().cross(east).normalize();
    const angle = scenario.params.kind === 'impact' ? (scenario.params.angleDeg * Math.PI) / 180 : Math.PI / 2;
    this.entryDir = up
      .clone()
      .multiplyScalar(Math.sin(angle))
      .addScaledVector(east.clone().multiplyScalar(0.8).addScaledVector(north, 0.6).normalize(), Math.cos(angle))
      .normalize();

    const burstAlt = result.airburst ? (result.burstAltitudeKm! / 6371) * 6 : 0; // ×6 visual exaggeration
    this.burstPoint = this.groundZero.clone().multiplyScalar(1 + burstAlt);

    // Flash sprite (shared by both scenario kinds).
    this.flash = makeGlowSprite(0xffffff);
    this.flash.visible = false;
    globe.fxGroup.add(this.flash);

    // Fireball.
    this.fireball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xff7722, transparent: true, opacity: 0.95, depthWrite: false }),
    );
    this.fireball.visible = false;
    globe.fxGroup.add(this.fireball);

    if (scenario.params.kind === 'impact') {
      this.bolide = new THREE.Mesh(
        new THREE.SphereGeometry(0.006, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xffeecc }),
      );
      const trailGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      this.trail = new THREE.Line(
        trailGeo,
        new THREE.LineBasicMaterial({ color: 0xffaa55, transparent: true, opacity: 0.9 }),
      );
      globe.fxGroup.add(this.bolide, this.trail);
      this.tArrive = 2.1;
    } else {
      this.tArrive = 0.4; // eruptions start almost immediately
      // Eruption column: a narrow glowing cone rising from the vent.
      const h = 0.09;
      const geo = new THREE.ConeGeometry(0.012, h, 24, 1, true);
      geo.translate(0, h / 2, 0);
      this.column = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0x886655, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
      );
      this.column.position.copy(this.groundZero.clone().multiplyScalar(1.001));
      this.column.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.groundZero.clone().normalize());
      this.column.scale.set(0.01, 0.01, 0.01);
      globe.fxGroup.add(this.column);
      // Umbrella-cloud puffs.
      for (let i = 0; i < 14; i++) {
        const s = makeGlowSprite(0x998877);
        s.visible = false;
        this.plume.push(s);
        globe.fxGroup.add(s);
      }
    }
    globe.setMarker(scenario.lat, scenario.lng);
    console.debug('[impact-earth] cinematic start:', scenario.placeName);
  }

  /** Advance the timeline. Returns false when finished. */
  update(dt: number): boolean {
    if (this.done) return false;
    this.t += dt;
    const t = this.t;

    if (this.scenario.params.kind === 'impact') this.updateImpact(t);
    else this.updateEruption(t);

    // Dust veil ramps between tArrive+1 and tArrive+5, then settles to a
    // thinner steady state so the globe stays readable after the show.
    const dustT = clamp01((t - this.tArrive - 1) / 4);
    const settle = clamp01((t - (this.tTotal - 1.4)) / 1.4);
    const effTarget = this.dustTarget * (1 - 0.45 * settle);
    this.globe.setDust(this.dustStart + (effTarget - this.dustStart) * easeOutCubic(dustT));

    // Damage rings fade in once the shockwave has passed.
    const ringT = clamp01((t - this.tArrive - 1.2) / 1.6);
    this.globe.setRingsOpacity(easeOutCubic(ringT));
    if (ringT >= 1) this.ringsShown = true;

    if (t > this.tTotal && this.ringsShown) {
      this.finish();
      return false;
    }
    return true;
  }

  private updateImpact(t: number) {
    const arriveT = clamp01(t / this.tArrive);
    if (this.bolide && this.trail) {
      if (arriveT < 1) {
        const dist = 2.2 * (1 - easeInQuad(arriveT));
        const pos = this.burstPoint.clone().addScaledVector(this.entryDir, dist);
        this.bolide.position.copy(pos);
        const trailEnd = pos.clone().addScaledVector(this.entryDir, 0.12 + 0.25 * (1 - arriveT));
        this.trail.geometry.setFromPoints([pos, trailEnd]);
        // Heat up as it descends.
        (this.bolide.material as THREE.MeshBasicMaterial).color.setHSL(0.08, 1, 0.6 + 0.4 * arriveT);
        const s = 1 + 2.5 * arriveT;
        this.bolide.scale.setScalar(s);
      } else {
        this.bolide.visible = false;
        this.trail.visible = false;
      }
    }

    if (t >= this.tArrive) {
      const ft = t - this.tArrive;
      // Flash: fierce for 0.5s.
      if (ft < 0.6) {
        this.flash.visible = true;
        this.flash.position.copy(this.burstPoint);
        const s = 0.05 + 1.2 * easeOutCubic(clamp01(ft / 0.5));
        this.flash.scale.setScalar(s * flashScale(this.result.energyMt));
        this.flash.material.opacity = 1 - clamp01(ft / 0.6);
      } else this.flash.visible = false;

      // Fireball grows over ~1.4s then cools/fades by 3s.
      const fireballKm = Math.max(2, 0.002 * Math.cbrt(this.result.energyJ) / 1000);
      const rWorld = Math.max(0.012, kmToAngle(fireballKm)); // angular ≈ chord at these scales
      const grow = easeOutCubic(clamp01(ft / 1.4));
      const fade = clamp01((ft - 1.8) / 1.4);
      this.fireball.visible = fade < 1;
      this.fireball.position.copy(this.burstPoint);
      this.fireball.scale.setScalar(Math.max(1e-4, rWorld * grow));
      const mat = this.fireball.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.95 * (1 - fade);
      mat.color.setHSL(0.07 * (1 - 0.6 * fade), 1, 0.55 - 0.25 * fade);

      // Shockwave ring races out to the 1-psi radius.
      const blast = this.result.zones.filter((z) => z.category === 'blast').pop();
      if (blast && !this.shock && ft > 0.15) {
        this.shock = new THREE.Line(
          ringLineGeometry(this.groundZero, 1e-4, 0.003),
          new THREE.LineBasicMaterial({ color: 0xfff2cc, transparent: true, opacity: 1, linewidth: 2 }),
        );
        this.globe.fxGroup.add(this.shock);
      }
      if (this.shock && blast) {
        const st = clamp01((ft - 0.15) / 2.2);
        const a = kmToAngle(blast.radiusKm) * easeOutCubic(st);
        this.shock.geometry.dispose();
        this.shock.geometry = ringLineGeometry(this.groundZero, Math.max(a, 1e-4), 0.003);
        (this.shock.material as THREE.LineBasicMaterial).opacity = 1 - st;
        this.shock.visible = st < 1;
      }

      // Crater scar appears under the fading fireball.
      if (!this.result.airburst && this.result.craterFinalKm && ft > 1.6 && this.globe.scarsGroup.children.length === 0) {
        addScar(this.globe, this.groundZero, this.result.craterFinalKm / 2, 0x1a0f0a);
      }
    }
  }

  private updateEruption(t: number) {
    const ft = Math.max(0, t - this.tArrive);
    if (this.column) {
      const grow = easeOutCubic(clamp01(ft / 2.5));
      this.column.scale.set(0.4 + 0.6 * grow, Math.max(0.01, grow), 0.4 + 0.6 * grow);
      (this.column.material as THREE.MeshBasicMaterial).opacity = 0.9 * clamp01(3 - ft * 0.25);
    }
    if (ft < 0.7) {
      this.flash.visible = true;
      this.flash.position.copy(this.groundZero.clone().multiplyScalar(1.01));
      this.flash.scale.setScalar(0.12 * easeOutCubic(clamp01(ft / 0.5)));
      this.flash.material.opacity = 0.9 * (1 - clamp01(ft / 0.7));
    } else this.flash.visible = false;

    // Umbrella cloud spreads at the column top.
    const top = this.groundZero.clone().multiplyScalar(1 + 0.085 * easeOutCubic(clamp01(ft / 2.5)));
    const up = this.groundZero.clone().normalize();
    const east = new THREE.Vector3(0, 1, 0).cross(up).normalize();
    const north = up.clone().cross(east).normalize();
    this.plume.forEach((s, i) => {
      if (ft < 0.8) return;
      s.visible = true;
      const ang = (i / this.plume.length) * Math.PI * 2 + ft * 0.05;
      const spread = 0.02 + 0.11 * easeOutCubic(clamp01((ft - 0.8) / 4));
      s.position.copy(top).addScaledVector(east, Math.cos(ang) * spread).addScaledVector(north, Math.sin(ang) * spread);
      s.scale.setScalar(0.05 + spread * 0.9);
      s.material.opacity = 0.35 * clamp01((ft - 0.8) / 1) * clamp01(1.5 - ft * 0.12);
    });

    // Pyroclastic surge ring.
    const pdc = this.result.zones.find((z) => z.category === 'pdc');
    if (pdc && !this.shock && ft > 0.5) {
      this.shock = new THREE.Line(
        ringLineGeometry(this.groundZero, 1e-4, 0.0025),
        new THREE.LineBasicMaterial({ color: 0xffaa66, transparent: true, opacity: 1 }),
      );
      this.globe.fxGroup.add(this.shock);
    }
    if (this.shock && pdc) {
      const st = clamp01((ft - 0.5) / 2.5);
      const a = kmToAngle(pdc.radiusKm) * easeOutCubic(st);
      this.shock.geometry.dispose();
      this.shock.geometry = ringLineGeometry(this.groundZero, Math.max(a, 1e-4), 0.0025);
      (this.shock.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.9 - st * 0.7);
    }

    // Caldera scar.
    const caldera = this.result.zones.find((z) => z.category === 'caldera');
    if (caldera && ft > 2 && this.globe.scarsGroup.children.length === 0) {
      addScar(this.globe, this.groundZero, Math.max(caldera.radiusKm, 4), 0x241a12);
    }
  }

  private finish() {
    this.done = true;
    console.debug('[impact-earth] cinematic finished');
    disposeChildren(this.globe.fxGroup);
    this.globe.setRingsOpacity(1);
    // Let the veil thin after the show so the globe stays readable.
    this.globe.setDust(this.dustTarget * 0.55);
  }

  cancel() {
    this.finish();
  }
}

function addScar(globe: GlobeScene, center: THREE.Vector3, radiusKm: number, color: number) {
  const a = Math.max(kmToAngle(radiusKm), 0.0015);
  const geo = ringBandLikeCap(center, a);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  globe.scarsGroup.add(mesh);
}

// A filled cap = ring band from 0 to a.
function ringBandLikeCap(center: THREE.Vector3, a: number) {
  return ringBandGeometry(center, 0, a, 0.001);
}

function makeGlowSprite(color: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const c = new THREE.Color(color);
  grad.addColorStop(0, `rgba(255,255,255,1)`);
  grad.addColorStop(0.25, `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},0.9)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  return new THREE.Sprite(mat);
}

function flashScale(energyMt: number): number {
  return Math.min(3, 0.35 + 0.28 * Math.max(0, Math.log10(Math.max(energyMt, 1e-3)) + 3));
}

function easeInQuad(t: number): number {
  return t * t;
}
