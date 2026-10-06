// Standalone looping office demo for the marketing site.
// Reuses the calibrated camera, robot models and desk routing from the full
// prototype, but drops every scenario, control and panel: the ten workers just
// work, walk over to a colleague, talk, and walk back, forever.
import * as THREE from 'three';
import {
  ART_HEIGHT,
  ART_WIDTH,
  ROBOT_SCALE,
  addArtOcclusion,
  createArtCamera,
  createArtLayout,
} from './office-calibration';
import { createOfficeWorld } from './office-models';
import { workers } from './workers';

type Point = { x: number; z: number };
type Mode = 'work' | 'walk' | 'talk';

const WALK_SPEED = 4.2; // scene units per second, matching the prototype
const TALK_SECONDS = 6.5;
const MAX_VISITS = 2;

type Worker = {
  mode: Mode;
  path: Point[];
  leg: number;
  legT: number;
  timer: number;
  partner: number;
  home: Point;
  angle: number;
};

export function mountOfficeDemo(container: HTMLElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    container.classList.add('demo-unsupported');
    return () => {};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  const canvas = renderer.domElement;
  canvas.setAttribute(
    'aria-label',
    'Ten 3D robot coworkers working at their desks, walking across the office, and talking',
  );
  container.appendChild(canvas);

  const overlay = document.createElement('div');
  overlay.className = 'demo-labels';
  container.appendChild(overlay);

  const scene = new THREE.Scene();
  const camera = createArtCamera();
  const layout = createArtLayout(camera);

  scene.add(new THREE.HemisphereLight('#fff5df', '#6a806d', 2.2));
  const sun = new THREE.DirectionalLight('#ffe5b1', 3.3);
  sun.position.set(-11, 23, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -26,
    right: 26,
    top: 22,
    bottom: -22,
    near: 0.1,
    far: 80,
  });
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#dbe9ff', 1.1);
  fill.position.set(12, 10, -15);
  scene.add(fill);

  const world = createOfficeWorld(scene);
  world.robots.forEach((r) => r.root.scale.setScalar(ROBOT_SCALE));
  addArtOcclusion(scene, layout);

  const workAngle = (i: number) => Math.PI + (i % 2 ? -0.24 : 0.24);
  const state: Worker[] = workers.map((_, i) => ({
    mode: 'work',
    path: [],
    leg: 0,
    legT: 0,
    timer: Math.random() * 2.5,
    partner: -1,
    home: layout.stations[i],
    angle: workAngle(i),
  }));
  state.forEach((s, i) => {
    world.robots[i].root.position.set(s.home.x, 0, s.home.z);
    world.robots[i].root.rotation.y = s.angle;
  });

  const labels = workers.map((w) => {
    const el = document.createElement('div');
    el.className = 'demo-label';
    el.textContent = w.short;
    overlay.appendChild(el);
    return el;
  });

  const faceAlong = (from: Point, to: Point) =>
    Math.atan2(to.x - from.x, to.z - from.z);

  function startVisit() {
    const idle = state
      .map((s, i) => (s.mode === 'work' ? i : -1))
      .filter((i) => i >= 0 && state[i].timer <= 0);
    if (!idle.length) return;
    const visitor = idle[(Math.random() * idle.length) | 0];
    const hosts = state
      .map((s, i) => (s.mode === 'work' && i !== visitor ? i : -1))
      .filter((i) => i >= 0);
    if (!hosts.length) return;
    const host = hosts[(Math.random() * hosts.length) | 0];
    let path: Point[];
    try {
      path = layout.route(visitor, host) as Point[];
    } catch {
      state[visitor].timer = 4;
      return;
    }
    if (path.length < 2) {
      state[visitor].timer = 4;
      return;
    }
    const v = state[visitor];
    v.mode = 'walk';
    v.path = path;
    v.leg = 0;
    v.legT = 0;
    v.partner = host;
    const h = state[host];
    h.partner = visitor;
    h.timer = TALK_SECONDS + 6;
  }

  function advance(s: Worker, dt: number) {
    // Walk the polyline at a constant speed; returns true when finished.
    let budget = dt * WALK_SPEED;
    while (budget > 0 && s.leg < s.path.length - 1) {
      const a = s.path[s.leg],
        b = s.path[s.leg + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6;
      const remain = (1 - s.legT) * len;
      if (budget < remain) {
        s.legT += budget / len;
        budget = 0;
      } else {
        budget -= remain;
        s.leg++;
        s.legT = 0;
      }
    }
    return s.leg >= s.path.length - 1;
  }

  function positionOf(s: Worker): Point {
    if (s.leg >= s.path.length - 1) return s.path[s.path.length - 1];
    const a = s.path[s.leg],
      b = s.path[s.leg + 1];
    return {
      x: a.x + (b.x - a.x) * s.legT,
      z: a.z + (b.z - a.z) * s.legT,
    };
  }

  // Kick the loop off immediately so the scene is never idle on first view.
  startVisit();

  let width = 1,
    height = 1;
  const resize = () => {
    const w = container.clientWidth;
    if (!w) return;
    width = w;
    height = (w * ART_HEIGHT) / ART_WIDTH;
    renderer.setSize(width, height, false);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const project = (p: THREE.Vector3) => {
    const v = p.clone().project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * width,
      y: (-v.y * 0.5 + 0.5) * height,
      visible: v.z < 1,
    };
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now();
  let clock = 0;
  let raf = 0;
  let running = true;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!running) return;
    clock += dt;

    const visits = state.filter((s) => s.mode !== 'work').length / 2;
    if (visits < MAX_VISITS && Math.random() < dt * 0.8) startVisit();

    state.forEach((s, i) => {
      const r = world.robots[i];
      s.timer -= dt;
      let pos: Point = s.home;
      let moving = false;

      if (s.mode === 'walk') {
        moving = true;
        const done = advance(s, dt);
        pos = positionOf(s);
        const ahead =
          s.leg < s.path.length - 1 ? s.path[s.leg + 1] : s.path[s.leg];
        r.root.rotation.y = faceAlong(pos, ahead);
        if (done) {
          const returning = s.partner < 0;
          if (returning) {
            s.mode = 'work';
            s.path = [];
            s.timer = 3 + Math.random() * 7;
            r.root.rotation.y = s.angle;
          } else {
            s.mode = 'talk';
            s.timer = TALK_SECONDS;
            const host = state[s.partner];
            host.mode = 'talk';
            host.timer = TALK_SECONDS;
          }
        }
      } else if (s.mode === 'talk') {
        pos = s.path.length ? positionOf(s) : s.home;
        const other = s.partner >= 0 ? state[s.partner] : null;
        if (other) {
          const op = other.path.length ? positionOf(other) : other.home;
          r.root.rotation.y = faceAlong(pos, op);
        }
        if (s.timer <= 0) {
          if (s.path.length) {
            // The visitor walks the same route home.
            s.mode = 'walk';
            s.path = [...s.path].reverse();
            s.leg = 0;
            s.legT = 0;
            s.partner = -1;
          } else {
            s.mode = 'work';
            s.partner = -1;
            s.timer = 3 + Math.random() * 7;
            r.root.rotation.y = s.angle;
          }
        }
      } else {
        pos = s.home;
      }

      r.root.position.set(pos.x, 0, pos.z);

      // ---- posing ----------------------------------------------------
      const work = s.mode === 'work';
      const talking = s.mode === 'talk';
      const rhythm = reduced ? 0 : clock + i * 1.7;
      const stride = reduced ? 0 : clock * 7.4 + i;
      const blend = 1 - Math.pow(0.0015, dt);

      const headTilt = work ? 0.26 : talking ? 0.05 : 0.1;
      r.head.rotation.x += (headTilt - r.head.rotation.x) * blend;
      const headTurn = work
        ? Math.sin(rhythm * 0.19) * 0.045
        : talking
          ? Math.sin(rhythm * 0.6) * 0.045
          : 0;
      r.head.rotation.y += (headTurn - r.head.rotation.y) * blend;
      const blink = !reduced && (clock + i * 0.43) % 4.7 > 4.55;
      r.eyes.forEach((eye) => {
        eye.scale.y = blink ? 0.14 : 1;
      });
      r.tool.visible = false;
      if (r.stowedTool) r.stowedTool.visible = true;
      if (r.scanner) r.scanner.visible = false;

      r.arms.forEach((a, side) => {
        const sgn = side === 0 ? -1 : 1;
        const target = new THREE.Euler();
        let elbow = -0.2;
        if (work) {
          target.set(
            -1.05 + Math.sin(rhythm * 3 + side * 2) * 0.045,
            0,
            -sgn * 0.18,
          );
          elbow = -0.85 + Math.sin(rhythm * 3 + side * 2) * 0.045;
        } else if (talking) {
          const speaking = Math.sin(rhythm * 0.9) > 0;
          target.set(
            speaking ? -0.6 + Math.sin(rhythm * 1.8 + side) * 0.2 : -0.2,
            0,
            -sgn * (speaking ? 0.24 : 0.08),
          );
          elbow = speaking ? -0.9 : -0.4;
        } else {
          target.set(Math.sin(stride + side * Math.PI) * 0.4, 0, -sgn * 0.06);
          elbow = -0.2;
        }
        a.upper.rotation.x += (target.x - a.upper.rotation.x) * blend;
        a.upper.rotation.y += (target.y - a.upper.rotation.y) * blend;
        a.upper.rotation.z += (target.z - a.upper.rotation.z) * blend;
        a.fore.rotation.x += (elbow - a.fore.rotation.x) * blend;
      });
      r.legs.forEach((leg, side) => {
        leg.thigh.rotation.x = moving
          ? Math.sin(stride + side * Math.PI) * 0.56
          : 0;
        leg.knee.rotation.x = moving
          ? Math.max(0, -Math.sin(stride + side * Math.PI)) * 0.65
          : 0;
      });

      // ---- job title above the head ----------------------------------
      const anchor = r.root.position.clone();
      // Stagger heights so labels on neighbouring desks do not collide.
      anchor.y = 2.42 + (i % 2) * 0.34;
      world.office.localToWorld(anchor);
      const p = project(anchor);
      const el = labels[i];
      el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
      el.style.opacity = p.visible ? '1' : '0';
    });

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  // Pause when scrolled out of view so the page stays cheap.
  const seen = new IntersectionObserver(
    ([entry]) => {
      running = entry.isIntersecting;
      last = performance.now();
    },
    { threshold: 0.05 },
  );
  seen.observe(container);

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    seen.disconnect();
    renderer.dispose();
    canvas.remove();
    overlay.remove();
  };
}

declare global {
  interface Window {
    mountOfficeDemo?: typeof mountOfficeDemo;
  }
}
window.mountOfficeDemo = mountOfficeDemo;
