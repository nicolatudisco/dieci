/**
 * PLACEHOLDER — to be replaced in milestone M1 (see CLAUDE.md).
 *
 * It only proves that the toolchain works end to end: three.js renders, the content
 * files compile, the URL contract (?s, ?stop, ?static, ?debug) is read, and the
 * `data-ready` flag used by scripts/screenshot.mjs is set after the first frame.
 */
import * as THREE from 'three';
import './style.css';
import { STOPS } from './content/levels';
import { UI } from './content/ui';

const params = new URLSearchParams(location.search);
const isStatic = params.get('static') === '1';
const isDebug = params.get('debug') === '1';
const stopParam = params.get('stop');
const sParam = Number.parseFloat(params.get('s') ?? '');

const firstStop = STOPS[0];
if (!firstStop) throw new Error('No stops defined in levels.ts');

const requestedStop = STOPS.find((s) => s.id === stopParam);
const exponent = Number.isFinite(sParam) ? sParam : (requestedStop ?? firstStop).exponent;
const nearestStop = STOPS.reduce((best, s) =>
  Math.abs(s.exponent - exponent) < Math.abs(best.exponent - exponent) ? s : best,
);

// ── Scene ────────────────────────────────────────────────────────────────────
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#05060d');
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// A deterministic starfield (seeded), so screenshots are stable.
let seed = 10;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const starCount = 4000;
const positions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 40 + random() * 200;
  const theta = random() * Math.PI * 2;
  const phi = Math.acos(2 * random() - 1);
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i * 3 + 2] = r * Math.cos(phi);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: '#cfd8ff', size: 0.6, sizeAttenuation: true }),
);
scene.add(stars);

// The single warm star of the opening: the future "Tu sei qui".
const glow = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 32, 16),
  new THREE.MeshBasicMaterial({ color: '#ffd27a' }),
);
scene.add(glow);

// ── Overlay ──────────────────────────────────────────────────────────────────
const overlay = document.createElement('div');
overlay.className = 'placeholder';
overlay.innerHTML = `
  <p class="placeholder__eyebrow">Dieci · in costruzione</p>
  <h1 class="placeholder__title">${UI.intro.lines[0]}</h1>
  <p class="placeholder__line">${UI.intro.lines[1]} ${UI.intro.lines[2]}</p>
  <p class="placeholder__meta">Tappa più vicina a 10<sup>${exponent}</sup>: <strong>${nearestStop.title}</strong> · ${STOPS.length} tappe pronte</p>
`;
app.appendChild(overlay);

const debug = document.createElement('pre');
debug.className = 'placeholder__debug';
debug.hidden = !isDebug;
app.appendChild(debug);

// ── Loop ─────────────────────────────────────────────────────────────────────
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let frames = 0;
let lastFpsTime = performance.now();

function render(time: number) {
  if (!isStatic && !reducedMotion) {
    stars.rotation.y = time * 0.00002;
    glow.scale.setScalar(1 + Math.sin(time * 0.002) * 0.12);
  }
  renderer.render(scene, camera);

  frames++;
  if (isDebug && time - lastFpsTime > 500) {
    const fps = (frames * 1000) / (time - lastFpsTime);
    debug.textContent = `fps ${fps.toFixed(0)}  e ${exponent}  stop ${nearestStop.id}`;
    frames = 0;
    lastFpsTime = time;
  }

  if (document.documentElement.dataset.ready !== '1') {
    document.documentElement.dataset.ready = '1';
    if (isStatic) return; // one frame is enough for screenshots
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});
