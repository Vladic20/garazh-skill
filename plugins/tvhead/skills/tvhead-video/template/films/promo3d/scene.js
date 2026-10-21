// 3D clay-cube promo: a dark video editor lying on a desk, an orange clay cube living in it.
// render(t) is a pure function of time. Each frame accumulates N jittered renders: lens samples (real depth of field),
// sub-pixel offsets (anti-aliasing) and shutter times (motion blur); then bloom, grade, ACES.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as TL from './timeline.js';
const { UI, clamp, lerp, smooth, smoother, ramp, easeOutBack, track } = TL;

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);
let SAMPLES = +(Q.get('samples') || 16);

// ─── renderer ────────────────────────────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);
RectAreaLightUniformsLib.init();
const ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.28;
const camera = new THREE.PerspectiveCamera(30, W / H, 1, 4000);

const S = UI.S;
const wpos = (u, v, y = 0) => new THREE.Vector3((u - UI.w / 2) * S, y, (v - UI.h / 2) * S);

// ─── seeded helpers ──────────────────────────────────────────────────────────────────────────────────
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; };
function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
function disk(a, b) {                                                     // concentric square → disk
  const x = 2 * a - 1, y = 2 * b - 1; if (!x && !y) return [0, 0];
  let r, th; if (Math.abs(x) > Math.abs(y)) { r = x; th = Math.PI / 4 * (y / x); } else { r = y; th = Math.PI / 2 - Math.PI / 4 * (x / y); }
  return [r * Math.cos(th), r * Math.sin(th)];
}

// ─── assets ──────────────────────────────────────────────────────────────────────────────────────────
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + src)); i.src = src; });
const IMG = { cards: [], wide: [], tall: [] };
let ENV = null;
async function loadAssets() {
  const pad = n => String(n).padStart(2, '0');
  IMG.cards = await Promise.all([0, 1, 2, 3, 4, 5].map(i => Promise.all(Array.from({ length: 16 }, (_, f) => loadImg(`assets/card${i}/${pad(f + 1)}.jpg`)))));
  IMG.wide = await Promise.all([0, 1, 2, 3, 4, 5].map(i => loadImg(`assets/wide${i}.jpg`)));
  IMG.tall = await Promise.all([0, 1, 2].map(i => loadImg(`assets/tall${i}.jpg`)));
  try { const r = await fetch('env.json'); if (r.ok) ENV = await r.json(); } catch {}
  await Promise.all(["500 20px Inter", "800 20px Inter", "700 20px 'JetBrains Mono'", "800 20px Rubik", "20px 'Patrick Hand'"].map(f => document.fonts.load(f)));
}
// voice loudness 0…1 at time t (env.json: 30 values per second); fallback = soft bursts in the narration windows
function env(t) {
  if (ENV) { const i = t * ENV.fps; const a = ENV.v[Math.floor(i)] || 0, b = ENV.v[Math.floor(i) + 1] || 0; return lerp(a, b, i % 1); }
  const lines = [[8.6, 11.6], [14.4, 15.6], [19, 20.6], [23.8, 26.4], [33.6, 35.6], [39, 39.9], [43.6, 46.2], [49.2, 50.9], [57.4, 58.6]];
  for (const [a, b] of lines) if (t > a && t < b) return 0.35 + 0.3 * Math.abs(Math.sin(t * 17.3)) * Math.abs(Math.sin(t * 5.1 + 1));
  return 0;
}

// ─── textures: desk, clay ────────────────────────────────────────────────────────────────────────────
function woodTexture() {
  const c = canvas(1024, 1024), g = c.getContext('2d'), r = rng(11);
  g.fillStyle = '#5e3e2d'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) {
    const y = r() * 1024, a = 0.03 + r() * 0.07; g.strokeStyle = r() < 0.5 ? `rgba(30,16,10,${a})` : `rgba(140,95,70,${a})`;
    g.lineWidth = 1 + r() * 4; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.004 + i) * 6 + (r() - 0.5) * 3); g.stroke();
  }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * 1024, r() * 1024, 2, 1); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); return t;
}
function clayBump() {
  const c = canvas(512, 512), g = c.getContext('2d'), r = rng(5);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) {
    const x = r() * 512, y = r() * 512, rad = 4 + r() * 26, v = r() < 0.5 ? 0 : 255;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${v},${v},${v},${0.05 + r() * 0.08})`); gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  g.lineWidth = 1.2;                                                       // faint fingerprint arcs
  for (let k = 0; k < 7; k++) { const cx = r() * 512, cy = r() * 512; for (let j = 0; j < 9; j++) { g.strokeStyle = `rgba(${j % 2 ? 90 : 160},${j % 2 ? 90 : 160},${j % 2 ? 90 : 160},0.18)`; g.beginPath(); g.arc(cx, cy, 6 + j * 3.2, r() * 3, r() * 3 + 2.4); g.stroke(); } }
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// ─── editor UI canvas ────────────────────────────────────────────────────────────────────────────────
const C = { bg: '#121316', panel: '#1c1d21', panel2: '#222328', line: '#2b2c32', text: '#a7abb3', dim: '#6a6e76', blue: '#2d8cff', red: '#d65a55', hi: '#e6e8ec' };
const ROW_META = [['titles', 'Titles', '#a99ad8'], ['scenes', 'Scenes', '#e8c547'], ['voice', 'Voice · EN', '#8fd3c8'], ['music', 'Music · lo-fi', '#8fd08a']];
const uiBase = canvas(UI.w, UI.h), ui = canvas(UI.w, UI.h), ug = ui.getContext('2d');
function font(w, px, fam = 'Inter') { return `${w} ${px}px ${fam === 'mono' ? "'JetBrains Mono'" : fam === 'rubik' ? 'Rubik' : fam === 'hand' ? "'Patrick Hand'" : 'Inter'}`; }
function txt(g, s, x, y, f, col, align = 'left') { g.font = f; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
function rr(g, x, y, w, h, r, fill, stroke, lw = 1) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function icon(g, kind, x, y, s, col) {
  g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round';
  const k = s / 20;
  g.scale(k, k);
  switch (kind) {
    case 'home': g.beginPath(); g.moveTo(-8, 1); g.lineTo(0, -7); g.lineTo(8, 1); g.moveTo(-6, -1); g.lineTo(-6, 8); g.lineTo(6, 8); g.lineTo(6, -1); g.stroke(); break;
    case 'arrow': g.beginPath(); g.moveTo(-5, -8); g.lineTo(5, 2); g.lineTo(0, 2); g.lineTo(3, 8); g.lineTo(0, 9); g.lineTo(-2, 3); g.lineTo(-5, 6); g.closePath(); g.fill(); break;
    case 'hand': g.beginPath(); g.roundRect(-6, -4, 12, 12, 4); g.stroke(); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-5 + i * 3.4, -4); g.lineTo(-5 + i * 3.4, -9); g.stroke(); } break;
    case 'zoom': g.beginPath(); g.arc(-2, -2, 6, 0, 7); g.moveTo(3, 3); g.lineTo(8, 8); g.stroke(); break;
    case 'rotate': g.beginPath(); g.arc(0, 0, 7, 0.6, 5.6); g.stroke(); g.beginPath(); g.moveTo(7, -6); g.lineTo(7, 0); g.lineTo(1, -1); g.stroke(); break;
    case 'camera': g.beginPath(); g.roundRect(-8, -5, 12, 10, 2); g.moveTo(4, -2); g.lineTo(9, -5); g.lineTo(9, 5); g.lineTo(4, 2); g.stroke(); break;
    case 'rect': g.beginPath(); g.rect(-7, -6, 14, 12); g.stroke(); break;
    case 'pen': g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 4); g.lineTo(0, 9); g.lineTo(-6, 4); g.closePath(); g.stroke(); g.beginPath(); g.arc(0, 2, 1.6, 0, 7); g.fill(); break;
    case 'T': g.beginPath(); g.moveTo(-7, -7); g.lineTo(7, -7); g.moveTo(0, -7); g.lineTo(0, 8); g.stroke(); break;
    case 'brush': g.beginPath(); g.moveTo(6, -8); g.lineTo(-2, 2); g.stroke(); g.beginPath(); g.ellipse(-4, 5, 4, 3, -0.7, 0, 7); g.fill(); break;
    case 'stamp': g.beginPath(); g.moveTo(-3, -8); g.lineTo(3, -8); g.lineTo(2, 0); g.lineTo(7, 2); g.lineTo(7, 6); g.lineTo(-7, 6); g.lineTo(-7, 2); g.lineTo(-2, 0); g.closePath(); g.stroke(); break;
    case 'puppet': g.beginPath(); g.arc(0, -6, 3, 0, 7); g.moveTo(0, -3); g.lineTo(0, 4); g.moveTo(-7, -1); g.lineTo(7, -1); g.moveTo(0, 4); g.lineTo(-5, 9); g.moveTo(0, 4); g.lineTo(5, 9); g.stroke(); break;
    case 'eye': g.beginPath(); g.ellipse(0, 0, 8, 5, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 2.4, 0, 7); g.fill(); break;
    case 'audio': g.beginPath(); g.moveTo(-7, -3); g.lineTo(-3, -3); g.lineTo(2, -7); g.lineTo(2, 7); g.lineTo(-3, 3); g.lineTo(-7, 3); g.closePath(); g.fill(); g.beginPath(); g.arc(3, 0, 5, -0.8, 0.8); g.stroke(); break;
    case 'lock': g.beginPath(); g.roundRect(-6, -1, 12, 9, 2); g.fill(); g.beginPath(); g.arc(0, -2, 4, Math.PI, 0); g.stroke(); break;
    case 'play': g.beginPath(); g.moveTo(-5, -7); g.lineTo(7, 0); g.lineTo(-5, 7); g.closePath(); g.fill(); break;
    case 'prev': g.beginPath(); g.moveTo(6, -7); g.lineTo(-4, 0); g.lineTo(6, 7); g.closePath(); g.fill(); g.fillRect(-8, -7, 3, 14); break;
    case 'next': g.beginPath(); g.moveTo(-6, -7); g.lineTo(4, 0); g.lineTo(-6, 7); g.closePath(); g.fill(); g.fillRect(5, -7, 3, 14); break;
    case 'fx': g.font = '800 15px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('fx', 0, 0); break;
    case 'folder': g.beginPath(); g.moveTo(-8, -5); g.lineTo(-3, -5); g.lineTo(-1, -3); g.lineTo(8, -3); g.lineTo(8, 6); g.lineTo(-8, 6); g.closePath(); g.fill(); break;
    case 'file': g.beginPath(); g.moveTo(-6, -8); g.lineTo(3, -8); g.lineTo(7, -4); g.lineTo(7, 8); g.lineTo(-6, 8); g.closePath(); g.stroke(); break;
    case 'grid': for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-8, i * 5); g.lineTo(8, i * 5); g.moveTo(i * 5, -8); g.lineTo(i * 5, 8); g.stroke(); } break;
    case 'cube': g.beginPath(); g.moveTo(0, -8); g.lineTo(7, -4); g.lineTo(7, 4); g.lineTo(0, 8); g.lineTo(-7, 4); g.lineTo(-7, -4); g.closePath(); g.moveTo(0, 0); g.lineTo(0, 8); g.moveTo(0, 0); g.lineTo(7, -4); g.moveTo(0, 0); g.lineTo(-7, -4); g.stroke(); break;
  }
  g.restore();
}
function drawUIBase() {
  const g = uiBase.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, UI.w, UI.h);
  // menu bar
  g.fillStyle = '#18191c'; g.fillRect(0, 0, UI.w, 34);
  rr(g, 14, 9, 16, 16, 4, '#e5744f'); txt(g, 'tvhead studio', 38, 17, font(800, 16), C.hi);
  ['File', 'Edit', 'Composition', 'Layer', 'Effect', 'Animation', 'View', 'Window', 'Help'].reduce((x, s) => { txt(g, s, x, 17, font(500, 15), C.text); return x + g.measureText(s).width + 26; }, 170);
  // toolbar
  g.fillStyle = '#1e1f23'; g.fillRect(0, 34, UI.w, 50);
  ['home', 'arrow', 'hand', 'zoom', 'rotate', 'camera', 'rect', 'pen', 'T', 'brush', 'stamp', 'puppet'].forEach((k, i) => { if (i === 1) rr(g, 50 + i * 46 - 16, 43, 32, 32, 6, '#2d3a52'); icon(g, k, 50 + i * 46, 59, 22, i === 1 ? '#8fc0ff' : C.text); });
  ['Default', 'Learn', 'Standard', 'Small Screen', 'Libraries'].reduce((x, s, i) => { txt(g, s, x, 59, font(500, 15), i === 2 ? C.blue : C.dim); if (i === 2) { g.fillStyle = C.blue; g.fillRect(x, 72, g.measureText(s).width, 2); } return x + g.measureText(s).width + 30; }, 1420);
  // project panel
  rr(g, 8, 90, 398, 652, 6, C.panel);
  txt(g, 'Project', 22, 104, font(800, 15), C.hi); g.fillStyle = C.blue; g.fillRect(22, 114, 56, 2);
  const tg = g.createLinearGradient(20, 126, 140, 196); tg.addColorStop(0, '#3a2a24'); tg.addColorStop(1, '#16110f');
  rr(g, 20, 128, 118, 66, 4, tg); rr(g, 66, 150, 22, 20, 5, '#e5744f');
  txt(g, 'Main Comp ▾', 152, 138, font(800, 15), C.hi); txt(g, '1920 × 1080 (1.00)', 152, 160, font(500, 13), C.text); txt(g, 'Δ 0;01;00;00, 30.00 fps', 152, 180, font(500, 13), C.text);
  rr(g, 20, 206, 374, 26, 5, '#15161a', C.line); icon(g, 'zoom', 36, 219, 14, C.dim);
  txt(g, 'Name', 30, 250, font(800, 13), C.dim); txt(g, 'Type', 300, 250, font(800, 13), C.dim);
  g.fillStyle = C.line; g.fillRect(16, 262, 382, 1);
  const files = [['folder', 'Episodes', 'Folder', '#d9b45a'], ['folder', 'Looks', 'Folder', '#d9b45a'], ['cube', 'Main Comp', 'Composition', '#8fc0ff'], ['file', 'story.json', 'JSON', C.text], ['file', 'brief.md', 'Markdown', C.text],
    ['audio', 'voice_en.wav', 'Audio', '#8fd3c8'], ['audio', 'music_lofi.wav', 'Audio', '#8fd08a'], ['cube', 'clay_cube', '3D Layer', '#e5744f'], ['file', 'look_doodle', 'Look', '#a99ad8'], ['file', 'look_cartoon', 'Look', '#a99ad8'],
    ['file', 'look_desk3d', 'Look', '#a99ad8'], ['file', 'look_comic', 'Look', '#a99ad8'], ['file', 'look_history', 'Look', '#a99ad8'], ['file', 'look_stick', 'Look', '#a99ad8'], ['file', 'look_cozy', 'Look', '#a99ad8'], ['file', 'captions.srt', 'Subtitles', C.text]];
  files.forEach(([k, n, ty, col], i) => { const y = 280 + i * 28; if (i === 2) rr(g, 14, y - 13, 386, 26, 4, '#253147'); icon(g, k, 34, y, 16, col); txt(g, n, 52, y, font(500, 14), i === 2 ? C.hi : C.text); txt(g, ty, 300, y, font(500, 13), C.dim); });
  // composition panel (blue focus frame)
  rr(g, 410, 90, 1080, 652, 7, '#0e0f12');
  txt(g, 'Composition: Main Comp', 430, 101, font(800, 14), C.hi); txt(g, '≡', 612, 101, font(800, 14), C.dim);
  txt(g, 'Layer  (none)', 700, 101, font(500, 13), C.dim); txt(g, 'Footage  (none)', 820, 101, font(500, 13), C.dim);
  const c = UI.comp;
  g.fillStyle = '#16171b'; g.fillRect(410, 708, 1080, 34);
  txt(g, '50% ▾', 430, 725, font(500, 13), C.text); icon(g, 'grid', 498, 725, 14, C.text); icon(g, 'camera', 640, 725, 16, C.text);
  txt(g, 'Full ▾', 820, 725, font(500, 13), C.text); txt(g, 'Active Camera ▾', 900, 725, font(500, 13), C.text); txt(g, '1 View ▾', 1040, 725, font(500, 13), C.text); txt(g, '+0.0', 1430, 725, font(500, 13), C.text);
  rr(g, 410, 90, 1080, 652, 7, null, C.blue, 3);
  // right panels
  rr(g, 1500, 90, 540, 652, 6, C.panel);
  txt(g, 'Info', 1516, 104, font(800, 15), C.hi); txt(g, 'Audio', 1570, 104, font(500, 14), C.dim);
  [['R:', '229'], ['G:', '116'], ['B:', '79'], ['A:', '255']].forEach(([a, b], i) => { txt(g, a, 1520, 132 + i * 18, font(800, 13), ['#ff6b6b', '#6bdc7b', '#6ba8ff', C.text][i]); txt(g, b, 1548, 132 + i * 18, font(500, 13), C.text); });
  txt(g, 'X: 1041', 1660, 132, font(500, 13), C.text); txt(g, 'Y: 582', 1660, 150, font(500, 13), C.text);
  g.fillStyle = C.line; g.fillRect(1510, 206, 520, 1);
  txt(g, 'Preview', 1516, 222, font(800, 15), C.hi); g.fillStyle = C.blue; g.fillRect(1516, 232, 58, 2);
  ['prev', 'play', 'next'].forEach((k, i) => icon(g, k, 1560 + i * 56, 262, 22, C.text));
  icon(g, 'audio', 1760, 262, 20, C.text);
  txt(g, 'Shortcut', 1520, 296, font(500, 13), C.dim); rr(g, 1600, 284, 140, 24, 4, '#15161a', C.line); txt(g, 'Spacebar ▾', 1612, 296, font(500, 13), C.text);
  g.fillStyle = C.line; g.fillRect(1510, 318, 520, 1);
  txt(g, 'Effects & Presets', 1516, 334, font(800, 15), C.hi); g.fillStyle = C.blue; g.fillRect(1516, 344, 130, 2);
  rr(g, 1520, 356, 500, 28, 5, '#15161a', C.line); icon(g, 'zoom', 1538, 370, 14, C.dim); txt(g, 'glow', 1556, 370, font(500, 14), C.hi);
  const fx = [['▾  * Animation Presets', 0], ['▾  Clay', 1], ['fx', 'Squash & Stretch.ffx', 2], ['fx', 'Glow Pulse.ffx', 2], ['▾  Stylize', 0], ['fx', 'Glow', 1, true], ['fx', 'Neon Edge', 1], ['▾  Blur & Sharpen', 0], ['fx', 'Camera Lens Blur', 1], ['▾  tvhead', 0], ['fx', 'Doodle Boil', 1], ['fx', 'Paper Grain', 1], ['fx', 'Caption Pop', 1]];
  fx.forEach((r, i) => {
    const y = 404 + i * 25;
    if (r[0] === 'fx') { if (r[3]) rr(g, 1516, y - 12, 506, 24, 4, '#1f4f8f', '#4aa3ff'); icon(g, 'fx', 1536 + r[2] * 22, y, 18, r[3] ? '#fff' : '#d9b45a'); txt(g, r[1], 1552 + r[2] * 22, y, font(r[3] ? 800 : 500, 14), r[3] ? '#fff' : C.text); }
    else txt(g, r[0], 1522 + r[1] * 22, y, font(500, 14), C.text);
  });
  txt(g, 'Looks', 1516, 744 - 72, font(800, 14), C.hi);
  ['doodle', 'cartoon', 'desk3d', 'noir', 'dota', 'blocks', 'pixel', 'comic', 'stick', 'cozy', 'history'].reduce((x, s, i) => {
    g.font = font(500, 12); const w = g.measureText(s).width + 16; if (x + w > 2030) return x;
    rr(g, x, 690, w, 22, 11, i === 1 ? '#3a2a24' : '#26272c', i === 1 ? '#e5744f' : null); txt(g, s, x + 8, 701, font(500, 12), i === 1 ? '#ffb59a' : C.text); return x + w + 6;
  }, 1516);
  // timeline panel
  rr(g, 8, 750, 2032, 524, 6, C.panel);
  txt(g, 'Main Comp', 26, 763, font(800, 14), C.hi); txt(g, '≡', 112, 763, font(800, 14), C.dim); g.fillStyle = C.blue; g.fillRect(26, 773, 78, 2);
  rr(g, 200, 782, 210, 22, 4, '#15161a', C.line); icon(g, 'zoom', 214, 793, 12, C.dim);
  // ruler
  g.fillStyle = '#18191d'; g.fillRect(UI.trackX - 6, 778, UI.trackEnd - UI.trackX + 16, 28);
  for (let s = 0; s <= 60; s++) { const x = UI.trackX + s * UI.pxPerSec; g.fillStyle = s % 5 ? '#3a3c43' : '#6a6e76'; g.fillRect(x, s % 5 ? 798 : 790, 1, s % 5 ? 8 : 16); if (s % 5 === 0) txt(g, `${String(s).padStart(2, '0')}s`, x + 4, 788, font(500, 12), C.dim); }
  g.fillStyle = C.red; g.fillRect(UI.trackX, 806, UI.trackEnd - UI.trackX, 7);
  // columns
  txt(g, '#', 92, 812, font(800, 12), C.dim); txt(g, 'Layer Name', 120, 812, font(800, 12), C.dim); txt(g, 'Mode', 300, 812, font(800, 12), C.dim); txt(g, 'Parent', 360, 812, font(800, 12), C.dim);
  for (const [id, name, col] of ROW_META) {
    const r = UI.rows[id];
    g.fillStyle = '#18191d'; g.fillRect(UI.trackX - 6, r.y, UI.trackEnd - UI.trackX + 16, r.h);
    g.fillStyle = '#1f2024'; g.fillRect(14, r.y, 410, r.h);
    if (id === 'music') continue;
    drawLayerRow(g, id, name, col);
  }
  // bottom bar
  g.fillStyle = '#18191c'; g.fillRect(14, 1236, 2020, 32);
  txt(g, 'Toggle Switches / Modes', 30, 1252, font(500, 13), C.text);
  rr(g, 1700, 1246, 260, 8, 4, '#2a2b30'); rr(g, 1780, 1242, 16, 16, 8, '#8a8f98');
}
function drawLayerRow(g, id, name, col) {
  const r = UI.rows[id], y = r.c, n = ROW_META.findIndex(m => m[0] === id) + 1;
  icon(g, 'eye', 34, y, 16, C.text); if (id === 'voice' || id === 'music') icon(g, 'audio', 58, y, 15, C.text);
  rr(g, 76, y - 7, 14, 14, 3, col); txt(g, String(n), 100, y, font(500, 13), C.text);
  txt(g, name, 120, y, font(800, 14), C.hi); txt(g, 'Normal ▾', 300, y, font(500, 12), C.dim); txt(g, 'None ▾', 362, y, font(500, 12), C.dim);
}
const tc = t => { const s = Math.floor(t), f = Math.floor((t - s) * 30); return `0;00;${String(s).padStart(2, '0')};${String(f).padStart(2, '0')}`; };

// glow text for the composition screen (the bloom pass adds the halo)
function glowText(g, s, x, y, f, core, glow, a = 1, track = 0) {
  g.save(); g.globalAlpha = a; g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (track) g.letterSpacing = `${track}px`;
  g.shadowColor = glow; g.shadowBlur = 46; g.fillStyle = glow; g.fillText(s, x, y);
  g.shadowBlur = 18; g.fillText(s, x, y);
  g.shadowBlur = 4; g.fillStyle = core; g.fillText(s, x, y);
  g.restore();
}
function spark(g, x, y, r, rot, a) {
  if (!(r > 0.5)) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = a; g.shadowColor = '#ff8a3d'; g.shadowBlur = 30; g.fillStyle = '#ffb27a';
  for (let k = 0; k < 10; k++) { g.rotate(Math.PI / 5); g.beginPath(); g.ellipse(0, -r * 0.55, r * 0.09, r * (k % 2 ? 0.38 : 0.5), 0, 0, 7); g.fill(); }
  g.beginPath(); g.arc(0, 0, r * 0.14, 0, 7); g.fill(); g.restore();
}
function tvIcon(g, x, y, s, a) {
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = '#ff8a3d'; g.shadowBlur = 24; g.strokeStyle = '#ffd2b0'; g.fillStyle = '#e5744f';
  g.beginPath(); g.moveTo(-14, -44); g.lineTo(0, -30); g.lineTo(16, -48); g.stroke();
  g.beginPath(); g.roundRect(-46, -30, 92, 66, 16); g.fill(); g.stroke();
  g.fillStyle = '#2a1712'; g.beginPath(); g.roundRect(-36, -21, 72, 48, 10); g.fill();
  g.fillStyle = '#ffe2cc'; g.beginPath(); g.ellipse(-13, -2, 5, 7, 0, 0, 7); g.ellipse(13, -2, 5, 7, 0, 0, 7); g.fill();
  g.strokeStyle = '#ffe2cc'; g.lineWidth = 4; g.beginPath(); g.arc(0, 8, 10, 0.3, Math.PI - 0.3); g.stroke();
  g.restore();
}
function cover(g, img, x, y, w, h) {
  const ir = img.width / img.height, r = w / h; let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > r) { sw = sh * r; sx = (img.width - sw) / 2; } else { sh = sw / r; sy = (img.height - sh) / 2; }
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
const liveFrame = (i, t) => IMG.cards[i][((Math.floor((t - TL.cardFlip(i)) * 6) % 16) + 16) % 16];

function drawComp(g, t) {
  const c = UI.comp, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  g.save(); g.beginPath(); g.rect(c.x, c.y, c.w, c.h); g.clip();
  g.fillStyle = '#040405'; g.fillRect(c.x, c.y, c.w, c.h);
  // title / action safe guides
  g.strokeStyle = 'rgba(80,90,110,0.18)'; g.lineWidth = 1; g.strokeRect(c.x + c.w * 0.05, c.y + c.h * 0.05, c.w * 0.9, c.h * 0.9); g.strokeRect(c.x + c.w * 0.1, c.y + c.h * 0.1, c.w * 0.8, c.h * 0.8);
  g.beginPath(); g.moveTo(cx - 14, cy); g.lineTo(cx + 14, cy); g.moveTo(cx, cy - 14); g.lineTo(cx, cy + 14); g.stroke();

  // topic field → heading
  if (t >= 13 && t < 28.6) {
    const pop = easeOutBack(clamp((t - 13) / 0.4)), up = smooth((t - 18.3) / 0.6), out = 1 - smooth((t - 28.2) / 0.4);
    const typed = TL.TOPIC.slice(0, clamp(Math.floor((t - TL.TYPE_AT) * TL.TYPE_CPS) + 1, 0, TL.TOPIC.length) * (t >= TL.TYPE_AT ? 1 : 0));
    const fw = lerp(600, 720, up), fh = lerp(70, 56, up), fx = cx - fw / 2, fy = lerp(c.y + c.h - 120, c.y + 46, up);
    g.save(); g.globalAlpha = out; g.translate(cx, fy + fh / 2); g.scale(pop, pop); g.translate(-cx, -(fy + fh / 2));
    const active = t > TL.POKE + 0.05;
    if (up < 1) { txt(g, 'topic', fx + 4, fy - 18, font(800, 18), '#8fa6c8'); }
    rr(g, fx, fy, fw, fh, 12, '#101318', active ? '#4aa3ff' : '#3a4250', active ? 3 : 2);
    if (active && up < 0.5) { g.save(); g.shadowColor = '#2d8cff'; g.shadowBlur = 24; rr(g, fx, fy, fw, fh, 12, null, 'rgba(74,163,255,0.6)', 2); g.restore(); }
    const tx = fx + 24; g.font = font(700, lerp(30, 28, up), 'mono');
    txt(g, typed || (active ? '' : 'Type a topic…'), tx, fy + fh / 2, font(700, lerp(30, 28, up), 'mono'), typed ? '#f2f4f8' : '#4b5462');
    if (active && t < 18.6 && Math.floor(t * 2.2) % 2 === 0) { const w = g.measureText(typed).width; g.fillStyle = '#4aa3ff'; g.fillRect(tx + w + 4, fy + 16, 3, fh - 32); }
    if (up > 0) txt(g, 'storyboard · 6 scenes · heartbeat arc', cx, fy + fh + 26, font(500, 18), `rgba(150,165,190,${up})`, 'center');
    g.restore();
  }
  // preview of the scene just placed on the timeline
  if (t >= 28.75 && t < 33.15) {
    const i = clamp(Math.floor((t - 28.75) / 0.75), 0, 5), k = smooth((t - 28.75) / 0.3) * (1 - smooth((t - 32.85) / 0.3));
    g.globalAlpha = k; cover(g, liveFrame(i, t), c.x, c.y, c.w, c.h); g.globalAlpha = 1;
    rr(g, c.x + 20, c.y + 20, 150, 30, 6, 'rgba(0,0,0,0.55)'); txt(g, `scene ${i + 1} / 6`, c.x + 34, c.y + 35, font(800, 16), '#fff');
  }
  // narration
  if (t >= 33.1 && t < 38.4) {
    const k = smooth((t - 33.1) / 0.4) * (1 - smooth((t - 38.0) / 0.4));
    const gr = g.createRadialGradient(cx, 430, 10, cx, 430, 420); gr.addColorStop(0, `rgba(40,150,140,${0.35 * k})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(c.x, c.y, c.w, c.h);
    txt(g, '● REC  narration · EN', c.x + 30, c.y + 40, font(800, 18), `rgba(255,120,110,${k})`);
    txt(g, 'voice generated · word timings aligned', cx, c.y + c.h - 56, font(500, 20), `rgba(150,220,210,${k})`, 'center');
  }
  // music
  if (t >= 38.2 && t < 43.4) {
    const k = smooth((t - 38.2) / 0.4) * (1 - smooth((t - 43.0) / 0.35));
    const ph = ((t - TL.BEAT0) / TL.BEAT) % 1, pulse = Math.exp(-ph * 5);
    g.save(); g.globalAlpha = k;
    for (let r = 0; r < 6; r++) { g.strokeStyle = `rgba(143,208,138,${(0.5 - r * 0.07) * (0.6 + 0.4 * pulse)})`; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy - 10, 60 + r * 38 + pulse * 10 * (6 - r) / 6, 0, 7); g.stroke(); }
    g.shadowColor = '#8fd08a'; g.shadowBlur = 30; g.fillStyle = '#c8f5c2'; g.beginPath(); g.arc(cx, cy - 10, 34 + pulse * 8, 0, 7); g.fill();
    g.shadowBlur = 0; txt(g, '♪', cx, cy - 12, font(800, 40), '#1b2a1a', 'center');
    txt(g, 'lo-fi · 84 BPM · generated', cx, c.y + c.h - 56, font(800, 22), '#bfe8b9', 'center');
    g.restore();
  }
  // montage: finished frames, 16:9 → 9:16, EN ⇄ RU
  if (t >= TL.MONTAGE.start && t < 48.4) {
    const cuts = TL.MONTAGE.cuts; let n = -1; for (let i = 0; i < cuts.length; i++) if (t >= cuts[i]) n = i;
    if (n >= 0) {
      const punch = 1 + 0.06 * (1 - smooth((t - cuts[n]) / 0.3));
      const tall = smooth((t - TL.MONTAGE.tallFrom) / 0.35) * (1 - smooth((t - cuts[8]) / 0.3));
      const fh = c.h - 40, fw = lerp(fh * 16 / 9, fh * 9 / 16, tall);
      const img = n < 5 ? IMG.wide[n] : n < 8 ? IMG.tall[n - 5] : IMG.wide[5];
      const k = 1 - smooth((t - 48.0) / 0.35);
      g.save(); g.globalAlpha = k; g.translate(cx, cy); g.scale(punch, punch);
      g.beginPath(); g.roundRect(-fw / 2, -fh / 2, fw, fh, 10); g.clip(); cover(g, img, -fw / 2, -fh / 2, fw, fh); g.restore();
      g.save(); g.globalAlpha = k;
      rr(g, c.x + 24, c.y + 22, 92, 34, 8, 'rgba(0,0,0,0.6)', '#4aa3ff', 2); txt(g, tall > 0.5 ? '9:16' : '16:9', c.x + 70, c.y + 40, font(800, 18), '#fff', 'center');
      const ru = n % 2 === 1;
      rr(g, c.x + c.w - 136, c.y + 22, 112, 34, 17, 'rgba(0,0,0,0.6)');
      rr(g, c.x + c.w - 132 + (ru ? 52 : 0), c.y + 26, 52, 26, 13, '#e5744f');
      txt(g, 'EN', c.x + c.w - 106, c.y + 40, font(800, 15), '#fff', 'center'); txt(g, 'RU', c.x + c.w - 54, c.y + 40, font(800, 15), '#fff', 'center');
      g.restore();
    }
  }
  // tvhead-studio title
  if (t >= 48.2 && t < 54.0) {
    const k = smooth((t - 48.3) / 0.6) * (1 - smooth((t - 53.6) / 0.35)), sc = lerp(0.9, 1, easeOutBack(clamp((t - 48.3) / 0.7)));
    g.save(); g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
    tvIcon(g, cx - 380, cy - 30, 1.4, k);
    glowText(g, 'tvhead-studio', cx + 70, cy - 30, font(800, 124, 'rubik'), '#fff4ea', '#ff8a3d', k);
    glowText(g, 'topic in  ·  video out', cx + 20, cy + 70, font(700, 30, 'mono'), '#ffe2cc', '#ff8a3d', k * smooth((t - 49.2) / 0.5), 4);
    g.restore();
  }
  // MADE WITH CLAUDE
  if (t >= 53.6) {
    const k = smooth((t - 53.7) / 0.6), sp = easeOutBack(clamp((t - 54.2) / 0.6));
    spark(g, cx, cy - 150, 70 * sp, 0.3 * (t - 54), k);
    glowText(g, 'MADE WITH CLAUDE', cx, cy - 30, font(800, 92, 'rubik'), '#fff4ea', '#ff8a3d', k * smooth((t - 54.3) / 0.4));
    const lw = 360 * smooth((t - 54.6) / 0.6); g.save(); g.globalAlpha = k; g.shadowColor = '#ff8a3d'; g.shadowBlur = 16; g.fillStyle = '#ffb27a'; g.fillRect(cx - lw, cy + 28, lw * 2, 3); g.restore();
    glowText(g, 'T V H E A D - S T U D I O', cx, cy + 68, font(800, 28), '#ffd2b0', '#ff8a3d', k * smooth((t - 54.9) / 0.5));
    const gh = smooth((t - 57.3) / 0.5);
    if (gh > 0) { g.save(); g.globalAlpha = gh; rr(g, cx - 280, cy + 112, 560, 52, 26, 'rgba(255,255,255,0.08)', 'rgba(255,178,122,0.6)', 2); g.restore(); glowText(g, '</>  github.com/Vladic20/tvhead-studio', cx, cy + 138, font(700, 24, 'mono'), '#ffffff', '#ff9a5a', gh); }
  }
  g.restore();
}

function drawUI(t) {
  const g = ug;
  g.drawImage(uiBase, 0, 0);
  drawComp(g, t);
  // dynamic labels
  const ph = track(TL.PLAYHEAD, t);
  txt(g, tc(ph), 1220, 725, font(700, 14, 'mono'), '#4aa3ff');
  g.fillStyle = C.panel; g.fillRect(20, 784, 172, 30);
  txt(g, tc(ph), 24, 798, font(700, 24, 'mono'), '#4aa3ff');
  const mk = smooth((t - 38.2) / 0.4);
  if (mk > 0) { g.save(); g.globalAlpha = mk; drawLayerRow(g, 'music', 'Music · lo-fi', '#8fd08a'); g.restore(); }
  // playhead line on the ruler + work area marker
  const x = UI.trackX + ph * UI.pxPerSec;
  g.fillStyle = '#4aa3ff'; g.fillRect(x - 1, 778, 2, 30);
  uiTex.needsUpdate = true;
}

// ─── scene objects ───────────────────────────────────────────────────────────────────────────────────
const desk = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.62, color: 0xb08a74 }));
desk.rotation.x = -Math.PI / 2; desk.position.y = -2.05; desk.receiveShadow = true; scene.add(desk);

const slab = new THREE.Mesh(new RoundedBoxGeometry(UI.w * S + 1.4, 2, UI.h * S + 1.4, 3, 0.6), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.45, metalness: 0.3 }));
slab.position.y = -1.02; slab.castShadow = true; slab.receiveShadow = true; scene.add(slab);

const uiTex = tex(ui); uiTex.generateMipmaps = true; uiTex.minFilter = THREE.LinearMipmapLinearFilter;
const uiMat = new THREE.MeshStandardMaterial({ map: uiTex, emissiveMap: uiTex, emissive: 0xffffff, emissiveIntensity: 0.9, color: 0x3c3c3c, roughness: 0.3, metalness: 0 });
const uiPlane = new THREE.Mesh(new THREE.PlaneGeometry(UI.w * S, UI.h * S), uiMat);
uiPlane.rotation.x = -Math.PI / 2; uiPlane.position.y = 0.012; uiPlane.receiveShadow = true; scene.add(uiPlane);

// lights
const hemi = new THREE.HemisphereLight(0xffe4cc, 0x2a160e, 0.5); scene.add(hemi);
const key = new THREE.DirectionalLight(0xffd6b0, 2.6);
key.position.set(-90, 150, -70); key.target.position.set(0, 0, 10); scene.add(key, key.target);
key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.04; key.shadow.radius = 4;
Object.assign(key.shadow.camera, { left: -150, right: 150, top: 110, bottom: -110, near: 10, far: 500 }); key.shadow.camera.updateProjectionMatrix();
const fill = new THREE.DirectionalLight(0x9cc2ff, 0.55); fill.position.set(120, 60, 160); scene.add(fill);
const rim = new THREE.SpotLight(0xffb27a, 900, 0, 0.6, 0.8, 1.6); rim.position.set(40, 90, -160); rim.target.position.set(0, 0, 20); scene.add(rim, rim.target);
const screenLight = new THREE.RectAreaLight(0xbfd4ff, 1.5, UI.comp.w * S, UI.comp.h * S);
screenLight.position.copy(wpos(UI.compCenter[0], UI.compCenter[1], 0.2)); screenLight.lookAt(screenLight.position.clone().add(new THREE.Vector3(0, 1, 0))); scene.add(screenLight);

// track bars: one instanced mesh of small tiles
const TRACKS = [
  { row: 'titles', segs: [[520, 820], [1180, 1460], [1600, 1760]], color: '#a99ad8', depth: 4.0 },
  { row: 'scenes', segs: [[450, 1980]], color: '#e8c547', depth: 4.6, until: 28.2 },
  { row: 'voice', segs: [[450, 1720]], color: '#8fd3c8', depth: 4.6 },
  { row: 'music', segs: [[450, 1980]], color: '#8fd08a', depth: 4.6, from: 38.2 },
];
const tiles = [];
for (const tr of TRACKS) for (const [a, b] of tr.segs) for (let u = a + 11; u <= b - 11; u += 26) tiles.push({ u, v: UI.rows[tr.row].c, tr, color: new THREE.Color(tr.color) });
const tileGeo = new RoundedBoxGeometry(2.2, 1, 1, 2, 0.28); tileGeo.translate(0, 0.5, 0);
const tileMesh = new THREE.InstancedMesh(tileGeo, new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.0, color: 0xffffff }), tiles.length);
tileMesh.castShadow = true; tileMesh.receiveShadow = true; scene.add(tileMesh);
tiles.forEach((tl, i) => tileMesh.setColorAt(i, tl.color));

// white keyframe markers (static) + beat markers on the music track
const markGeo = new RoundedBoxGeometry(TL.MARK, TL.MARK, TL.MARK, 2, 0.3); markGeo.translate(0, TL.MARK / 2, 0);
const markMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.3 });
const MARKS = [[640, 'titles'], [1260, 'titles'], [1660, 'titles'], [800, 'voice'], [1250, 'voice'], [1600, 'voice']].map(([u, r]) => ({ u, v: UI.rows[r].c, beat: -1 }))
  .concat(Array.from({ length: 9 }, (_, j) => ({ u: TL.markerU(j), v: UI.rows.music.c, beat: j })));
const markMesh = new THREE.InstancedMesh(markGeo, markMat, MARKS.length); markMesh.castShadow = true; scene.add(markMesh);

// playhead: glowing pin + light beam across the tracks
const cyan = new THREE.Color(0x5fd0ff);
const playhead = new THREE.Group(); scene.add(playhead);
const pinMat = new THREE.MeshStandardMaterial({ color: 0xbfeaff, emissive: cyan, emissiveIntensity: 2.4, roughness: 0.25 });
const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.6, 12), pinMat); stem.position.y = 2.8; stem.castShadow = true; playhead.add(stem);
const head = new THREE.Mesh(new RoundedBoxGeometry(2.4, 2.8, 0.9, 3, 0.4), pinMat); head.position.y = 6.6; head.castShadow = true; playhead.add(head);
const beamMat = new THREE.MeshBasicMaterial({ color: cyan.clone().multiplyScalar(3.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const beamLen = (1122 - 806) * S;
const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.42, beamLen), beamMat); beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.07, (806 - 790) * S + beamLen / 2); playhead.add(beam);
const beamGlowMat = new THREE.MeshBasicMaterial({ color: cyan.clone().multiplyScalar(0.6), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
const beamGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, beamLen), beamGlowMat); beamGlow.rotation.x = -Math.PI / 2; beamGlow.position.copy(beam.position).setY(0.06); playhead.add(beamGlow);
const beamEnd = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.5, 1.5, 2, 0.3), markMat); beamEnd.position.set(0, 0.75, (1122 - 790) * S); beamEnd.castShadow = true; playhead.add(beamEnd);
const phLight = new THREE.PointLight(cyan, 60, 40, 2); phLight.position.y = 7; playhead.add(phLight);

// storyboard cards → scene blocks
function sketchTexture(i) {
  const c = canvas(320, 180), g = c.getContext('2d'), r = rng(31 + i * 7);
  g.fillStyle = '#f3eee4'; g.fillRect(0, 0, 320, 180);
  g.strokeStyle = '#2b2622'; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
  const wob = (x, y) => [x + (r() - 0.5) * 2.4, y + (r() - 0.5) * 2.4];
  const line = (pts) => { g.beginPath(); pts.forEach(([x, y], k) => { const [a, b] = wob(x, y); k ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); };
  line([[10, 10], [310, 10], [310, 170], [10, 170], [10, 10]]);
  // little TV-head figure + props, different per card
  const fx = 90 + (i % 3) * 30, fy = 70;
  line([[fx - 22, fy - 20], [fx + 22, fy - 20], [fx + 22, fy + 12], [fx - 22, fy + 12], [fx - 22, fy - 20]]);
  line([[fx - 8, fy - 20], [fx - 16, fy - 34]]); line([[fx + 8, fy - 20], [fx + 16, fy - 32]]);
  g.beginPath(); g.arc(fx - 7, fy - 5, 2.4, 0, 7); g.arc(fx + 7, fy - 5, 2.4, 0, 7); g.fillStyle = '#2b2622'; g.fill();
  line([[fx, fy + 12], [fx, fy + 52]]); line([[fx, fy + 52], [fx - 14, fy + 80]]); line([[fx, fy + 52], [fx + 14, fy + 80]]);
  line([[fx, fy + 24], [fx - 22, fy + 40]]); line([[fx, fy + 24], [fx + 24, fy + 34 - (i % 2) * 16]]);
  const px = 220;
  if (i === 0) { g.font = "800 64px 'Patrick Hand'"; g.fillStyle = '#e5744f'; g.fillText('?', px - 10, 110); }
  if (i === 1) { line([[px - 30, 60], [px + 30, 120]]); line([[px + 30, 60], [px - 30, 120]]); }
  if (i === 2) { line([[px - 26, 70], [px + 26, 70], [px + 26, 120], [px - 26, 120], [px - 26, 70]]); line([[px - 14, 70], [px - 14, 54], [px + 14, 54], [px + 14, 70]]); }
  if (i === 3) { g.beginPath(); g.arc(px, 86, 24, 0, 7); g.stroke(); line([[px - 8, 112], [px + 8, 112]]); line([[px - 6, 120], [px + 6, 120]]); }
  if (i === 4) { line([[px - 34, 124], [px - 34, 60]]); line([[px - 34, 124], [px + 38, 124]]); line([[px - 28, 112], [px - 6, 96], [px + 10, 104], [px + 32, 70]]); }
  if (i === 5) { line([[px - 36, 64], [px + 36, 64], [px + 36, 108], [px - 6, 108], [px - 20, 124], [px - 18, 108], [px - 36, 108], [px - 36, 64]]); line([[px - 22, 80], [px + 22, 80]]); line([[px - 22, 92], [px + 12, 92]]); }
  g.fillStyle = '#e5744f'; g.beginPath(); g.arc(30, 30, 13, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '800 15px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 30, 31);
  g.fillStyle = '#2b2622'; g.textAlign = 'left'; g.font = '800 15px Inter'; g.fillText(TL.STAGES[i], 50, 31);
  return tex(c);
}
const cards = [], blocks = [];
const BLOCK_COLORS = ['#e5744f', '#e8c547', '#8fd3c8', '#a99ad8', '#7fb6e8', '#f19bb0'];
const clayTex = clayBump();
for (let i = 0; i < 6; i++) {
  const live = canvas(384, 216), lt = tex(live);
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(TL.CARD.w * S, TL.CARD.t, TL.CARD.h * S, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0xa8a39b, roughness: 0.7 }));
  body.castShadow = true; body.receiveShadow = true; grp.add(body);
  const sk = sketchTexture(i);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(TL.CARD.w * S - 0.4, TL.CARD.h * S - 0.4), new THREE.MeshStandardMaterial({ map: sk, emissiveMap: sk, emissive: 0xffffff, emissiveIntensity: 0.06, color: 0xb8b2a8, roughness: 0.8 }));
  front.rotation.x = -Math.PI / 2; front.position.y = TL.CARD.t / 2 + 0.01; grp.add(front);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(TL.CARD.w * S - 0.4, TL.CARD.h * S - 0.4), new THREE.MeshStandardMaterial({ map: lt, emissiveMap: lt, emissive: 0xffffff, emissiveIntensity: 0.55, color: 0x707070, roughness: 0.35 }));
  back.rotation.x = Math.PI / 2; back.position.y = -TL.CARD.t / 2 - 0.01; grp.add(back);
  grp.visible = false; scene.add(grp);
  cards.push({ grp, live, lt, front });
  const bgeo = new RoundedBoxGeometry(214 * S, TL.BLOCK_H, 120 * S, 3, 0.6); bgeo.translate(0, TL.BLOCK_H / 2, 0);
  const blk = new THREE.Mesh(bgeo, new THREE.MeshPhysicalMaterial({ color: BLOCK_COLORS[i], roughness: 0.55, sheen: 0.5, sheenColor: 0xffffff, bumpMap: clayTex, bumpScale: 0.5 }));
  blk.castShadow = true; blk.receiveShadow = true; blk.visible = false; scene.add(blk);
  blocks.push(blk);
}

// narration bars rising out of the composition
const NBARS = 64;
const barGeo = new RoundedBoxGeometry(0.95, 1, 0.95, 2, 0.2); barGeo.translate(0, 0.5, 0);
const bars = new THREE.InstancedMesh(barGeo, new THREE.MeshStandardMaterial({ color: 0x8fd3c8, emissive: 0x3fe0cf, emissiveIntensity: 1.4, roughness: 0.3 }), NBARS);
bars.castShadow = true; scene.add(bars);

// ─── the clay cube ───────────────────────────────────────────────────────────────────────────────────
const BODY = { w: 13, h: 11, d: 11 }, LEG_H = 2.6;
const clay = new THREE.MeshPhysicalMaterial({ color: 0xe5744f, roughness: 0.58, sheen: 0.7, sheenColor: new THREE.Color(0xffc2a8), sheenRoughness: 0.55, bumpMap: clayTex, bumpScale: 0.9 });
const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0706, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const cube = { root: new THREE.Group(), squash: new THREE.Group(), tilt: new THREE.Group(), flip: new THREE.Group() };
cube.root.add(cube.squash); cube.squash.add(cube.tilt); cube.tilt.add(cube.flip); scene.add(cube.root);
const bodyMesh = new THREE.Mesh(new RoundedBoxGeometry(BODY.w, BODY.h, BODY.d, 6, 2.6), clay); bodyMesh.castShadow = true; bodyMesh.receiveShadow = true; cube.flip.add(bodyMesh);
cube.eyes = new THREE.Group(); cube.eyes.position.set(0, 1.1, BODY.d / 2 - 0.12); cube.flip.add(cube.eyes);
cube.eyeL = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), eyeMat); cube.eyeR = cube.eyeL.clone();
for (const [e, x] of [[cube.eyeL, -2.9], [cube.eyeR, 2.9]]) {
  e.position.set(x, 0, 0); e.scale.set(0.95, 1.35, 0.5); cube.eyes.add(e);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), glintMat); gl.position.set(-0.32, 0.42, 0.85); e.add(gl);
}
cube.arms = [-1, 1].map(sx => {
  const p = new THREE.Group(); p.position.set(sx * BODY.w / 2, -0.6, 0.4); cube.flip.add(p);
  const m = new THREE.Mesh(new RoundedBoxGeometry(2.6, 2.4, 2.6, 3, 0.9), clay); m.position.x = sx * 0.9; m.castShadow = true; p.add(m);
  p.userData.sx = sx; return p;
});
cube.legs = [-1, 1].map(sx => {
  const p = new THREE.Group(); p.position.set(sx * 3.1, -BODY.h / 2 + 0.4, 0); cube.flip.add(p);
  const m = new THREE.Mesh(new RoundedBoxGeometry(2.7, LEG_H + 0.6, 2.7, 3, 0.9), clay); m.position.y = -(LEG_H + 0.6) / 2 + 0.2; m.castShadow = true; p.add(m);
  return p;
});
const CUBE_CENTER = LEG_H + BODY.h / 2;

function poseCube(t) {
  const m = TL.mascot(t);
  const [u, v, y] = m.pos;
  cube.root.position.copy(wpos(u, v, y));
  cube.root.rotation.y = m.face;
  cube.root.scale.setScalar(m.scale);
  const sq = m.sq, side = 1 / Math.sqrt(sq);
  cube.squash.scale.set(side, sq, side);
  cube.tilt.rotation.set(m.tilt, 0, m.roll);
  // sitting lowers the body onto the surface; legs fold forward or dangle over the edge
  const sitDrop = LEG_H * m.sit;
  cube.flip.position.y = CUBE_CENTER - sitDrop;
  cube.flip.rotation.x = m.pitch;
  const legZ = m.sitMode === 'edge' ? 2.9 * m.sit : 2.6 * m.sit;
  cube.legs.forEach((p, k) => {
    p.position.z = legZ;
    let rx = 0;
    if (m.run) rx = 0.75 * Math.sin(Math.PI * m.run.ph + k * Math.PI) * m.run.amp;
    if (m.air > 0) rx = -0.35 * m.air * (k ? 1 : 0.7);
    if (m.sitMode === 'floor') rx = lerp(rx, -1.45, m.sit);
    else rx = lerp(rx, -0.25 + 0.35 * Math.sin(t * 4.2 + k * 2.4), m.sit);
    p.rotation.x = rx;
  });
  cube.arms.forEach((p, k) => {
    const sx = p.userData.sx;
    let rx = m.run ? -0.6 * Math.sin(Math.PI * m.run.ph + k * Math.PI) * m.run.amp : 0, rz = sx * 0.35 * m.air, px = 0;
    if (sx > 0) { rx += -1.25 * m.poke; px = 0; }
    if (sx < 0 && m.wave) { rz = -2.3 * m.wave; rx = 0.25 * Math.sin(t * 22) * m.wave; }
    p.rotation.set(rx, 0, rz); p.position.z = 0.4 + 2.2 * (sx > 0 ? m.poke : 0); p.position.x = sx * BODY.w / 2 + px;
  });
  const bl = m.blink;
  cube.eyeL.scale.y = cube.eyeR.scale.y = 1.35 * (1 - 0.9 * bl) + 0.02;
  return m;
}

// ─── per-sample state (everything that moves in 3D) ──────────────────────────────────────────────────
const EVENTS = TL.events().filter(e => e.kind === 'step' || e.kind === 'land');
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpC = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
function blockLift(i, t) { const t0 = TL.cardMove(i) + 0.35; return t < t0 ? 0 : easeOutBack(clamp((t - t0) / 0.28), 2.2); }
function landDip(t, t0) { const d = t - t0; return d < 0 || d > 0.6 ? 0 : 0.35 * Math.exp(-8 * d) * Math.sin(Math.min(d * 18, Math.PI)); }
const cubeLandOnBlock = i => TL.MOVES.find(m => m.to[0] === TL.blockSlot(i)[0] && m.to[2] > 2)?.t1 ?? 99;

function update3D(t) {
  const m = poseCube(t);
  // tiles: ripples from steps / landings, placeholder sinks, music grows, voice turns into a waveform
  tiles.forEach((tl, i) => {
    let sy = 1, dy = 0, glow = 0, sx = 1, vis = true;
    for (const e of EVENTS) {
      const dt = t - e.t; if (dt < 0 || dt > 1.4) continue;
      const d = Math.hypot(tl.u - e.pos[0], (tl.v - e.pos[1]) * 1.6), a = e.kind === 'land' ? 1 : 0.55;
      dy -= a * 0.45 * Math.exp(-dt * 7) * Math.exp(-((d / 34) ** 2));
      const ring = Math.exp(-(((d - 620 * dt) / 46) ** 2)) * Math.exp(-dt * 2.6) * a;
      dy += 0.45 * ring; glow += 0.9 * ring + a * Math.exp(-dt * 6) * Math.exp(-((d / 50) ** 2));
    }
    const tr = tl.tr;
    if (tr.until != null) { const k = smooth((t - (tr.until + (tl.u - 450) / 1530 * 0.5)) / 0.3); sy *= 1 - k; dy -= 0.4 * k; if (k >= 1) vis = false; }
    if (tr.from != null) { const k = clamp((t - (tr.from + (tl.u - 450) / 1530 * 0.6)) / 0.25); if (k <= 0) vis = false; const p = easeOutBack(k, 2.4); sy *= p; sx = p; }
    if (tr.row === 'voice') {
      const k = smooth((t - (33.15 + (tl.u - 450) / 1270 * 0.9)) / 0.3);
      const tau = (tl.u - UI.trackX) / UI.pxPerSec, w = clamp(env(tau) * 1.25);
      sy *= lerp(1, 0.5 + 5.2 * w, k);
      const ph = track(TL.PLAYHEAD, t), near = Math.exp(-(((tl.u - (UI.trackX + ph * UI.pxPerSec)) / 30) ** 2));
      glow += k * near * 1.2;
    }
    if (tr.row === 'music' && t > 38.6) { const ph = ((t - TL.BEAT0) / TL.BEAT) % 1; glow += 0.35 * Math.exp(-ph * 6); }
    tmpP.copy(wpos(tl.u, tl.v, vis ? dy : -60)); tmpS.set(vis ? Math.max(0.02, sx) : 0.01, TL.TILE_Y * (vis ? Math.max(0.02, sy) : 0.01), vis ? tr.depth : 0.01);
    tmpM.compose(tmpP, tmpQ.identity(), tmpS); tileMesh.setMatrixAt(i, tmpM);
    tmpC.copy(tl.color).multiplyScalar(1 + glow * 1.4); tileMesh.setColorAt(i, tmpC);
  });
  tileMesh.instanceMatrix.needsUpdate = true; tileMesh.instanceColor.needsUpdate = true;
  // markers
  MARKS.forEach((mk, i) => {
    let s = 1, y = TL.TILE_Y;
    if (mk.beat >= 0) {
      const k = clamp((t - (38.55 + mk.beat * 0.06)) / 0.25); s = easeOutBack(k, 2.6);
      const bp = ((t - TL.BEAT0) / TL.BEAT) % 1; if (t > 38.7) s *= 1 + 0.12 * Math.exp(-bp * 7);
      const kk = 54 + mk.beat; if (mk.beat <= 6) y -= landDip(t, TL.beatAt(kk)) * 0.8;
    } else if (mk.v === UI.rows.voice.c && t > 33.15) y = TL.TILE_Y * 1.1;
    tmpP.copy(wpos(mk.u, mk.v, y)); tmpS.setScalar(Math.max(0.001, s)); tmpM.compose(tmpP, tmpQ.identity(), tmpS); markMesh.setMatrixAt(i, tmpM);
  });
  markMesh.instanceMatrix.needsUpdate = true;
  // playhead
  const ph = track(TL.PLAYHEAD, t);
  playhead.position.copy(wpos(UI.trackX + ph * UI.pxPerSec, 790, 0));
  const ign = smooth((t - 5.15) / 0.18), flash = Math.exp(-Math.max(0, t - 5.2) * 3) * (t > 5.15 ? 1 : 0);
  beamMat.opacity = 0.08 + 0.92 * ign; beamGlowMat.opacity = 0.05 + 0.35 * ign + 0.6 * flash;
  pinMat.emissiveIntensity = 0.6 + 1.8 * ign + 3 * flash; phLight.intensity = 10 + 50 * ign + 120 * flash;
  // cards
  cards.forEach((cd, i) => {
    const g = cd.grp, tin = TL.cardIn(i);
    if (t < tin) { g.visible = false; return; }
    g.visible = true;
    const [su, sv] = TL.cardSlot(i), rest = wpos(su, sv, 0.15);
    const sIn = clamp((t - tin) / 0.55), e = easeOutBack(sIn, 1.3);
    const start = rest.clone().add(new THREE.Vector3((i - 2.5) * 6, 42, 34));
    g.position.lerpVectors(start, rest, e); g.position.y = lerp(start.y, rest.y, smooth(sIn)) + (1 - smooth(sIn)) * 4;
    let rx = lerp(-1.1, 0, e), rz = lerp(0.7 * (i % 2 ? -1 : 1), 0, e), sc = 1;
    // flip to the live scene
    const fs = clamp((t - TL.cardFlip(i)) / 0.6), fe = smoother(fs);
    rx += Math.PI * fe; g.position.y += 5 * Math.sin(Math.PI * fe);
    // fly to the timeline and become the top of a scene block
    const ms = clamp((t - TL.cardMove(i)) / 0.45);
    if (ms > 0) {
      const [bu, bv] = TL.blockSlot(i), lift = blockLift(i, t);
      const dst = wpos(bu, bv, TL.BLOCK_H * lift + TL.CARD.t / 2 + 0.02);
      const me = smoother(ms);
      g.position.lerpVectors(rest, dst, me); g.position.y = lerp(rest.y, TL.BLOCK_H + TL.CARD.t / 2, me) + 12 * Math.sin(Math.PI * ms);
      if (ms >= 1) g.position.y = TL.BLOCK_H * lift + TL.CARD.t / 2 + 0.02 - landDip(t, cubeLandOnBlock(i)) ;
      sc = lerp(1, TL.BLOCK_SCALE, me); rz += 0.25 * Math.sin(Math.PI * ms) * (i % 2 ? 1 : -1);
    }
    g.rotation.set(rx, 0, rz); g.scale.set(sc, 1, sc);
    const blk = blocks[i], lift = blockLift(i, t);
    blk.visible = lift > 0.001;
    if (blk.visible) { blk.position.copy(wpos(...TL.blockSlot(i), 0)); blk.scale.set(1, Math.max(0.01, lift) * (1 - landDip(t, cubeLandOnBlock(i)) / TL.BLOCK_H), 1); }
  });
  // narration bars
  const bk = smooth((t - 33.2) / 0.5) * (1 - smooth((t - 37.9) / 0.5));
  bars.visible = bk > 0.001;
  if (bars.visible) for (let k = 0; k < NBARS; k++) {
    const off = Math.abs(k - (NBARS - 1) / 2) / ((NBARS - 1) / 2);
    const a = env(t - off * 0.55), shape = 1 - 0.55 * off * off;
    const h = (0.4 + 16 * a * shape * (0.75 + 0.25 * Math.sin(k * 1.7 + t * 9))) * bk;
    tmpP.copy(wpos(472 + k * 15, 430, 0.05)); tmpS.set(1, Math.max(0.01, h), 1); tmpM.compose(tmpP, tmpQ.identity(), tmpS); bars.setMatrixAt(k, tmpM);
  }
  bars.instanceMatrix.needsUpdate = true;
  return m;
}

// live card textures (once per frame)
function updateCardTextures(t) {
  cards.forEach((cd, i) => {
    if (t < TL.cardFlip(i) + 0.15) return;
    const g = cd.live.getContext('2d'); cover(g, liveFrame(i, t), 0, 0, 384, 216);
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 6; g.strokeRect(0, 0, 384, 216);
    cd.lt.needsUpdate = true;
  });
}

// ─── camera ──────────────────────────────────────────────────────────────────────────────────────────
const CAMK = TL.CAM;
function camState(t) {
  let a = CAMK[0], b = CAMK[0];
  for (let i = 0; i < CAMK.length - 1; i++) if (t >= CAMK[i].t) { a = CAMK[i]; b = CAMK[i + 1]; }
  if (t >= CAMK[CAMK.length - 1].t) a = b = CAMK[CAMK.length - 1];
  const s = a === b ? 0 : smoother((t - a.t) / (b.t - a.t));
  const k = {}; for (const f of ['u', 'v', 'h', 'd', 'az', 'el', 'fov', 'tr', 'f', 'ap']) k[f] = lerp(a[f], b[f], s);
  const target = wpos(k.u, k.v, k.h);
  const lag = TL.mascot(t - 0.22), cubeW = wpos(lag.pos[0], lag.pos[1], lag.pos[2] + CUBE_CENTER * lag.scale * 0.8);
  target.lerp(cubeW, k.tr);
  const el = k.el * Math.PI / 180;
  const pos = target.clone().add(new THREE.Vector3(Math.sin(k.az) * Math.cos(el), Math.sin(el), Math.cos(k.az) * Math.cos(el)).multiplyScalar(k.d));
  pos.x += 0.35 * Math.sin(t * 0.71) + 0.18 * Math.sin(t * 1.93 + 1); pos.y += 0.25 * Math.sin(t * 0.9 + 2) + 0.1 * Math.sin(t * 2.7); pos.z += 0.3 * Math.sin(t * 0.63 + 4);
  const now = TL.mascot(t), cubeNow = wpos(now.pos[0], now.pos[1], now.pos[2] + CUBE_CENTER * now.scale * 0.8);
  const compC = wpos(UI.compCenter[0], UI.compCenter[1], 0);
  const focus = lerp(pos.distanceTo(cubeNow), pos.distanceTo(compC), k.f);
  return { pos, target, fov: k.fov, focus, ap: k.ap };
}

// ─── accumulation + post ─────────────────────────────────────────────────────────────────────────────
const rtOpts = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: true };
const rtSample = new THREE.WebGLRenderTarget(W, H, rtOpts), rtAccum = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, depthBuffer: false });
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const accMat = new THREE.ShaderMaterial({
  uniforms: { tex: { value: rtSample.texture }, w: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * w, 1.); }',
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat), quadScene = new THREE.Scene(); quadScene.add(quad);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new TexturePass(rtAccum.texture));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.55, 0.92); composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, fade: { value: 1 }, seed: { value: 0 }, res: { value: new THREE.Vector2(W, H) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float fade, seed; uniform vec2 res; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main(){
      vec2 d = vUv - .5; float r = dot(d, d);
      vec3 c = vec3(texture2D(tDiffuse, vUv - d * .0016 * r * 4.).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + d * .0016 * r * 4.).b);
      c *= mix(1., .62, smoothstep(.08, .62, r));          // vignette
      c *= vec3(1.03, 1.0, .96);                             // warm
      c += (h(vUv * res) - .5) * .006;                       // grain
      gl_FragColor = vec4(c * fade, 1.);
    }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), fpt = new THREE.Vector3();
function renderFrame(t, samples = SAMPLES) {
  const fade = smooth((t - 0.15) / 2.2) * (1 - smooth((t - 59.45) / 0.55));
  const ufade = smooth((t - 0.4) / 2.6);
  uiMat.emissiveIntensity = 0.9 * ufade; hemi.intensity = 0.5 * fade; key.intensity = 2.6 * smooth((t - 0.1) / 1.6); fill.intensity = 0.55 * fade; rim.intensity = 900 * fade;
  screenLight.intensity = (t > 48.2 ? 3.0 : t > 33 && t < 48.2 ? 2.2 : 1.2) * ufade;
  screenLight.color.set(t > 48.2 ? 0xffb27a : t > 38.2 && t < 43.3 ? 0xa8f0a0 : t > 33.1 && t < 38.3 ? 0x8fe8de : 0xbfd4ff);
  drawUI(t); updateCardTextures(t);
  renderer.setClearColor(0x000000, 1);
  renderer.setRenderTarget(rtAccum); renderer.clear();
  renderer.setClearColor(0x0c0807, 1);
  const shutter = 0.5 / TL.FPS;
  for (let i = 0; i < samples; i++) {
    const ts = samples > 1 ? t + ((i + 0.5) / samples - 0.5) * shutter : t;
    update3D(ts);
    const cs = camState(ts);
    camera.fov = cs.fov; camera.updateProjectionMatrix();
    camera.position.copy(cs.pos); camera.lookAt(cs.target);
    fwd.subVectors(cs.target, cs.pos).normalize(); right.crossVectors(fwd, UP).normalize(); up.crossVectors(right, fwd);
    fpt.copy(cs.pos).addScaledVector(fwd, cs.focus);
    if (samples > 1) {
      const [lx, ly] = disk(halton(i + 1, 2), halton(i + 1, 3)), R = cs.ap * 0.55;
      camera.position.addScaledVector(right, lx * R).addScaledVector(up, ly * R);
      camera.lookAt(fpt);
      camera.setViewOffset(W, H, halton(i + 1, 5) - 0.5, halton(i + 1, 7) - 0.5, W, H);
    } else camera.clearViewOffset();
    renderer.setRenderTarget(rtSample); renderer.clear(); renderer.render(scene, camera);
    accMat.uniforms.w.value = 1 / samples;
    renderer.setRenderTarget(rtAccum); renderer.render(quadScene, quadCam);
  }
  camera.clearViewOffset();
  renderer.setRenderTarget(null);
  grade.uniforms.fade.value = fade; grade.uniforms.seed.value = (Math.round(t * TL.FPS) % 97) * 1.37;
  composer.render();
}

window.__ready = loadAssets().then(() => {
  drawUIBase(); drawUI(0);
  cards.forEach((cd, i) => { const m = cd.front.material, t = sketchTexture(i); m.map = m.emissiveMap = t; m.needsUpdate = true; });   // redraw with the web fonts loaded
  return true;
});
window.renderAt = async (t, samples) => { await window.__ready; renderFrame(t, samples ?? SAMPLES); renderer.getContext().finish(); return true; };
window.setSamples = n => { SAMPLES = n; };
