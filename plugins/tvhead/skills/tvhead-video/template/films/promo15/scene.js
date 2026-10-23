// promo15: eight shots, one pure render(t). Extruded type = stacked texture layers; the HUD is a crisp 2D canvas over WebGL.
// Each frame averages N renders over the shutter (motion blur, anti-aliasing) and the lens (depth of field where a shot asks).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as TL from './timeline.js';
const { b, clamp, lerp, smooth, expo, back, inCubic } = TL;

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);
let SAMPLES = +(Q.get('samples') || 8);
const INK = '#f4f1ea', HOT = '#ff5b1f', BG = 0x0b0b0c, HOTX = 0xff5b1f;

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.autoClear = false;
renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const hud = document.createElement('canvas'); hud.width = W; hud.height = H; hud.id = 'hud'; document.body.appendChild(hud);
const hg = hud.getContext('2d');
const ANISO = renderer.capabilities.getMaxAnisotropy();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 2000);

// ─── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); return c; };   // CPU canvas: uploads are synchronous and deterministic
const texOf = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; };
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + src)); i.src = src; });
const hash = (x, y = 0) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const FONT = { rubik: '800 PXpx Rubik', mono: "700 PXpx 'JetBrains Mono'", inter: '800 PXpx Inter' };
const font = (k, px) => FONT[k].replace('PX', px);
function halton(i, base) { let f = 1, r = 0; while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); } return r; }

// one line of (possibly multi-colour) text → texture + aspect
function textTex(parts, { px = 220, kind = 'rubik', track = 0 } = {}) {
  const c0 = canvas(8, 8).getContext('2d'); c0.font = font(kind, px); if (track) c0.letterSpacing = `${track}px`;
  const widths = parts.map(([s]) => c0.measureText(s).width), wSum = widths.reduce((a, x) => a + x, 0);
  const pad = Math.round(px * 0.14), cw = Math.ceil(wSum + pad * 2), ch = Math.ceil(px * 1.18);
  const c = canvas(cw, ch), g = c.getContext('2d'); g.font = font(kind, px); if (track) g.letterSpacing = `${track}px`; g.textBaseline = 'middle';
  let x = pad; parts.forEach(([s, col], i) => { g.fillStyle = col; g.fillText(s, x, ch / 2 + px * 0.04); x += widths[i]; });
  const t = texOf(c); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex: t, aspect: cw / ch, canvas: c };
}
// extruded word: stacked layers of the same texture, the front one in its own colours, the rest tinted towards `side`
function word(parts, { h = 4, layers = 14, depth = 0.32, side = '#3b3b3e', px = 220, kind = 'rubik' } = {}) {
  const { tex, aspect } = textTex(parts, { px, kind });
  const g = new THREE.Group(), geo = new THREE.PlaneGeometry(h * aspect, h), sideC = new THREE.Color(side);
  for (let i = layers - 1; i >= 0; i--) {
    const col = i === 0 ? new THREE.Color(0xffffff) : sideC.clone().multiplyScalar(1 - 0.45 * i / layers);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: col, alphaTest: 0.5 }));
    m.position.z = -i * depth * h / layers; g.add(m);
  }
  g.userData.w = h * aspect; g.visible = false;
  return g;
}
// a word that slams in from depth at t0 (expo), overshoots a little and settles
function slam(g, t, t0, { from = -70, dur = 0.14, x = 0, y = 0, z = 0, until = Infinity } = {}) {
  g.visible = t >= t0 && t < until;
  if (!g.visible) return;
  const s = (t - t0) / dur;
  g.position.set(x, y, lerp(from, z, expo(s)));
  const over = s >= 1 ? 1 + 0.1 * Math.exp(-(t - t0 - dur) * 14) * Math.cos((t - t0 - dur) * 30) : 1;
  g.scale.setScalar(over);
}
function shake(t) {
  let a = 0; for (const s of TL.SLAMS) if (t > s) a += Math.exp(-(t - s) * 11);
  return { x: a * 0.32 * (hash(Math.floor(t * 60), 1) - 0.5), y: a * 0.32 * (hash(Math.floor(t * 60), 2) - 0.5), r: a * 0.025 * (hash(Math.floor(t * 60), 3) - 0.5) };
}
const IMG = {};

// ─── shots ───────────────────────────────────────────────────────────────────────────────────────────
// each: { scene, update(t), cam(t) → { pos, target, fov, roll, focus, ap }, bg(t) }
const SH = {};

function buildTerminal() {
  const scene = new THREE.Scene(), cv = canvas(1600, 900), g = cv.getContext('2d'), tex = texOf(cv);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: tex })); scene.add(panel);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), new THREE.MeshBasicMaterial({ color: 0x1a1110, transparent: true, opacity: 0.6 })); glow.position.z = -0.5; scene.add(glow);
  let cursor = new THREE.Vector3(), last = -1;
  function draw(t) {
    const n = clamp(Math.floor((t - TL.TYPE0) * TL.CPS) + 1, 0, TL.PROMPT.length) * (t >= TL.TYPE0 ? 1 : 0), blink = t < TL.ENTER ? Math.floor(t * 5) % 2 : 1;
    const key = n * 2 + blink + (t >= TL.ENTER ? 100 : 0); if (key === last) return; last = key;
    g.clearRect(0, 0, 1600, 900);
    g.fillStyle = '#121214'; g.beginPath(); g.roundRect(10, 10, 1580, 880, 28); g.fill(); g.strokeStyle = '#2b2b30'; g.lineWidth = 3; g.stroke();
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(60 + i * 40, 58, 12, 0, 7); g.fill(); });
    g.font = font('mono', 26); g.fillStyle = '#6b6f77'; g.textBaseline = 'middle'; g.fillText('claude — ~/tvhead-studio', 640, 58);
    g.fillStyle = '#26262b'; g.fillRect(10, 104, 1580, 2);
    g.font = font('mono', 30); g.fillStyle = '#5d6168'; g.fillText('✻ tvhead-studio skill loaded · 13 looks · voices · music', 70, 190);
    g.font = font('mono', 82); const s = TL.PROMPT.slice(0, n); g.fillStyle = INK; g.fillText(s, 70, 400);
    const cx = 70 + g.measureText(s).width + 8;
    if (blink) { g.fillStyle = INK; g.fillRect(cx, 352, 46, 96); }
    cursor.set((cx + 23 - 800) / 100, (450 - 400) / 100, 0.02);
    if (t >= TL.ENTER) { g.font = font('mono', 30); g.fillStyle = HOT; g.fillText('⏎  writing story · voicing · rendering', 70, 520); }
    tex.needsUpdate = true;
  }
  SH.terminal = {
    scene, paint: draw, update() {}, bg: () => BG,
    cam(t) {
      const s0 = smooth(t / TL.ENTER), base = new THREE.Vector3(lerp(1.6, 0.6, s0), lerp(-0.4, 0.3, s0), lerp(17, 13.2, s0));
      const d = inCubic((t - TL.ENTER) / (b(4) - TL.ENTER)), tgt = new THREE.Vector3(lerp(0.4, cursor.x, smooth(t / TL.ENTER) * 0.6 + d * 0.4), lerp(0, cursor.y, d), 0);
      const pos = base.clone().lerp(cursor.clone().add(new THREE.Vector3(0, 0, 0.12)), d);
      return { pos, target: d > 0 ? cursor.clone().setZ(-1) : tgt, fov: lerp(40, 64, d), roll: lerp(0.035, 0, s0) };
    },
  };
}

function buildPrompt() {
  const scene = new THREE.Scene();
  const one = word([['ONE', INK]], { h: 5.4 }), prompt = word([['PROMPT', INK], ['.', HOT]], { h: 5.4 });
  const arrow = word([['→', '#0b0b0c']], { h: 9, side: '#a83a10' });
  const one2 = word([['ONE', '#0b0b0c']], { h: 5.4, side: '#a83a10' }), video = word([['VIDEO', '#0b0b0c'], ['.', INK]], { h: 5.4, side: '#a83a10' });
  scene.add(one, prompt, arrow, one2, video);
  SH.prompt = {
    scene, bg: t => (t >= b(6) ? HOTX : BG),
    update(t) {
      slam(one, t, b(4), { y: 2.75, until: b(6) }); slam(prompt, t, b(5), { y: -2.75, until: b(6) });
      if (one.visible && t > b(5)) one.position.y += 0.35 * expo((t - b(5)) / 0.1);
      arrow.visible = t >= b(6) && t < b(7) + 0.1;
      if (arrow.visible) { const s = (t - b(6)) / 0.16, out = clamp((t - b(7)) / 0.1); arrow.position.set(lerp(-40, 0, expo(s)) + 60 * inCubic(out), 0, 0); arrow.scale.set(1 + 0.8 * (1 - expo(s)) + 1.5 * out, 1, 1); }
      slam(one2, t, b(7), { y: 2.75 }); slam(video, t, b(7) + 0.12, { y: -2.75 });
    },
    cam(t) { const k = (t - b(4)) / (b(8) - b(4)); return { pos: new THREE.Vector3(lerp(-0.8, 0.8, k), lerp(0.3, -0.2, k), lerp(21, 19.5, k)), target: new THREE.Vector3(0, 0, 0), fov: 40, roll: 0.02 * Math.sin(k * 3) }; },
  };
}

function buildLooks() {
  const scene = new THREE.Scene(), n = TL.LOOKS.length;
  const frames = TL.LOOKS.map(([id], i) => {
    const grp = new THREE.Group();
    const tex = texOf(IMG[id]); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const border = new THREE.Mesh(new THREE.PlaneGeometry(9.9, 5.7), new THREE.MeshBasicMaterial({ color: i % 4 === 2 ? HOTX : 0xf4f1ea })); border.position.z = -0.02;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.4), new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff }));
    grp.add(border, pic); scene.add(grp);
    const side = i % 2 ? 1 : -1;
    grp.userData = { corridor: new THREE.Vector3(side * (4.6 + 1.2 * hash(i, 4)), (hash(i, 5) - 0.5) * 3.4, -14 * (i + 1)), ry: -side * 0.42, pic };
    return grp;
  });
  // the wall: rows of 5 / 4 / 4 facing the stopped camera
  const camEnd = new THREE.Vector3(0, 0, -14 * n - 6), wallZ = camEnd.z - 32, rows = [5, 4, 4];
  let k = 0; rows.forEach((cnt, r) => { for (let c = 0; c < cnt; c++, k++) frames[k].userData.wall = new THREE.Vector3((c - (cnt - 1) / 2) * 7.1, (1 - r) * 4.2 + 0.6, wallZ); });
  const label = word([['13', HOT], [' LOOKS', INK]], { h: 5.2 }); scene.add(label);
  const passT = i => TL.LOOKS_FLY + i * TL.LOOK_STEP, W0 = TL.LOOKS_WALL - 0.3;
  function camZ(t) {
    if (t <= TL.LOOKS_FLY) return lerp(14, frames[0].userData.corridor.z + 7, expo((t - b(8)) / (TL.LOOKS_FLY - b(8))));
    const f = (t - TL.LOOKS_FLY) / TL.LOOK_STEP;
    if (f < n - 1) return -14 * (f + 1) + 7;
    return lerp(-14 * n + 7, camEnd.z, expo((t - passT(n - 1)) / 0.45));
  }
  SH.looks = {
    scene, bg: () => BG,
    update(t) {
      frames.forEach((g, i) => {
        const u = g.userData, s = expo((t - (W0 + i * 0.012)) / 0.3);
        g.position.lerpVectors(u.corridor, u.wall, s); g.rotation.set(0, u.ry * (1 - s), 0);
        const sc = lerp(1, 0.68, s); g.scale.setScalar(sc);
        u.pic.material.color.setScalar(t > TL.LOOKS_WALL ? lerp(1, 0.32, smooth((t - TL.LOOKS_WALL) / 0.15)) : 1);
      });
      slam(label, t, TL.LOOKS_WALL, { from: camEnd.z + 2, z: wallZ + 14, dur: 0.12 });
    },
    cam(t) {
      const z = camZ(t), k = clamp((t - b(8)) / (TL.LOOKS_WALL - b(8)));
      const settle = smooth((t - (TL.LOOKS_WALL - 0.4)) / 0.5);
      const pos = new THREE.Vector3(lerp(0.9 * Math.sin(k * 7), 0, settle), lerp(0.6 * Math.cos(k * 5), 0, settle), z + (t > TL.LOOKS_WALL ? -1.5 * smooth((t - TL.LOOKS_WALL) / 0.4) : 0));
      return { pos, target: pos.clone().add(new THREE.Vector3(0, 0, -10)), fov: lerp(54, 42, settle), roll: lerp(0.1 * Math.sin(k * 4.2), 0, settle) };
    },
    current: t => clamp(Math.floor((t - TL.LOOKS_FLY) / TL.LOOK_STEP) + 1, 0, n - 1),
  };
}

function buildVoice() {
  const scene = new THREE.Scene(), N = 44;
  const geo = new RoundedBoxGeometry(0.42, 1, 0.42, 2, 0.12); geo.translate(0, 0.5, 0);
  const bars = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), N); scene.add(bars);
  for (let i = 0; i < N; i++) bars.setColorAt(i, new THREE.Color(Math.abs(i - (N - 1) / 2) < 4 ? HOTX : 0xf4f1ea));
  const vw = word([['VOICE', INK]], { h: 7.5, side: '#2c2c30' }); scene.add(vw);
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), S = new THREE.Vector3(), R = new THREE.Quaternion();
  SH.voice = {
    scene, bg: () => BG,
    update(t) {
      slam(vw, t, b(16), { y: 4.4, z: -9, from: -90 });
      const beat = ((t - TL.BEAT0) / TL.BEAT) % 1, pulse = Math.exp(-beat * 5);
      for (let i = 0; i < N; i++) {
        const x = (i - (N - 1) / 2) * 0.62, env = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.9 + t * 13) * Math.sin(i * 0.37 - t * 7.3));
        const shape = Math.exp(-((i - (N - 1) / 2) ** 2) / 260), h = 0.25 + 7.5 * env * shape * (0.55 + 0.45 * pulse) * smooth((t - b(16)) / 0.15);
        P.set(x, -3.4, 0); S.set(1, Math.max(0.02, h), 1); M.compose(P, R, S); bars.setMatrixAt(i, M);
      }
      bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
    },
    cam(t) { const k = (t - b(16)) / (b(20) - b(16)); return { pos: new THREE.Vector3(lerp(-7, 7, smooth(k)), lerp(-0.5, 0.6, k), 17), target: new THREE.Vector3(lerp(-1, 1, k), 0.4, -2), fov: 42, roll: 0 }; },
  };
}

function buildMusic() {
  const scene = new THREE.Scene(), N = 28;
  const geo = new RoundedBoxGeometry(0.62, 1, 0.62, 2, 0.16); geo.translate(0, 0.5, 0);
  const bars = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x0b0b0c }), N); scene.add(bars);
  const mw = word([['MUSIC', '#0b0b0c']], { h: 6.8, side: '#a83a10' }); scene.add(mw);
  // 16:9 → 9:16 frame
  const fr = new THREE.Group(), border = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xf4f1ea }));
  const wideT = texOf(IMG.cozy), tallT = texOf(IMG.tall);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: wideT }));
  border.position.z = -0.03; fr.add(border, pic); scene.add(fr);
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), S = new THREE.Vector3(), R = new THREE.Quaternion();
  const cover = (tex, img, aspect) => { const ia = img.width / img.height; tex.repeat.set(Math.min(1, aspect / ia), Math.min(1, ia / aspect)); tex.offset.set((1 - tex.repeat.x) / 2, (1 - tex.repeat.y) / 2); };
  SH.music = {
    scene, bg: t => (t < b(22) ? HOTX : BG),
    update(t) {
      const eq = t < b(22);
      slam(mw, t, b(20), { y: 2.4, from: -80, until: b(22) });
      bars.visible = eq;
      if (eq) {
        const beat = ((t - TL.BEAT0) / TL.BEAT) % 1, kick = Math.exp(-beat * 6), hat = Math.exp(-(((t - TL.BEAT0) / (TL.BEAT / 4)) % 1) * 5);
        for (let i = 0; i < N; i++) {
          const x = (i - (N - 1) / 2) * 0.86, f = Math.abs(i - (N - 1) / 2) / ((N - 1) / 2);
          const h = 0.5 + (1 - f) * 4.2 * kick + f * 2.2 * hat + 0.6 * hash(i, Math.floor(t * 30)) * smooth((t - b(20)) / 0.1);
          P.set(x, -6.2, 0); S.set(1, h, 1); M.compose(P, R, S); bars.setMatrixAt(i, M);
        }
        bars.instanceMatrix.needsUpdate = true;
      }
      fr.visible = !eq;
      if (fr.visible) {
        const m = expo((t - b(23)) / 0.12), over = t > b(23) + 0.12 ? 1 + 0.05 * Math.exp(-(t - b(23) - 0.12) * 12) * Math.cos((t - b(23)) * 40) : 1;
        const w = lerp(12.8, 4.05, m) * over, hgt = lerp(7.2, 7.2, m) * (1 / over);
        const tall = m > 0.5, tex = tall ? tallT : wideT;
        if (pic.material.map !== tex) { pic.material.map = tex; pic.material.needsUpdate = true; }
        cover(tex, tall ? IMG.tall : IMG.cozy, w / hgt);
        pic.scale.set(w, hgt, 1); border.scale.set(w + 0.36, hgt + 0.36, 1);
        fr.position.set(0, 0, 0); fr.rotation.y = lerp(0.25, -0.12, smooth((t - b(22)) / 0.8));
      }
    },
    cam(t) { const k = (t - b(20)) / (b(24) - b(20)); return { pos: new THREE.Vector3(lerp(1.5, -1, k), lerp(0.8, 0.2, k), t < b(22) ? 18 : lerp(15, 13.5, (t - b(22)) / 0.8)), target: new THREE.Vector3(0, t < b(22) ? 0 : 0, 0), fov: 40, roll: t < b(22) ? -0.03 : 0 }; },
  };
}

function buildPipeline() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x20140f, 1.4));
  const key = new THREE.DirectionalLight(0xffe2c8, 2.4); key.position.set(-4, 8, 6); scene.add(key);
  const N = TL.NODES.length, gap = 7.5, nodeX = i => (i - (N - 1) / 2) * gap;
  const nodeGeo = new RoundedBoxGeometry(3.2, 2.2, 1.2, 3, 0.3);
  const nodes = TL.NODES.map((s, i) => {
    const m = new THREE.Mesh(nodeGeo, new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.5 }));
    m.position.set(nodeX(i), 0, 0); scene.add(m);
    const lab = word([[s, INK]], { h: 0.72, layers: 1, kind: 'mono', px: 120 }); lab.visible = true; lab.position.set(nodeX(i) - 0.15, -0.25, 0.62); scene.add(lab);
    const chk = word([['✓', '#0b0b0c']], { h: 0.9, layers: 1 }); chk.position.set(nodeX(i) + 1.25, 0.75, 0.64); scene.add(chk);
    return { m, lab, chk };
  });
  const rail = new THREE.Mesh(new THREE.PlaneGeometry(gap * (N - 1), 0.08), new THREE.MeshBasicMaterial({ color: 0x3a3a40 })); rail.position.set(0, -1.6, 0); scene.add(rail);
  const prog = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.14), new THREE.MeshBasicMaterial({ color: HOTX })); prog.position.set(0, -1.6, 0.01); scene.add(prog);
  // the clay cube
  const clay = new THREE.MeshStandardMaterial({ color: 0xe5744f, roughness: 0.62 });
  const cube = new THREE.Group(), body = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.3, 1.3, 4, 0.32), clay); body.position.y = 0.95; cube.add(body);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x0b0706, roughness: 0.15 });
  for (const x of [-0.33, 0.33]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), eyeM); e.scale.set(1, 1.4, 0.5); e.position.set(x, 1.08, 0.66); cube.add(e); }
  for (const x of [-0.36, 0.36]) { const l = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.4, 0.32, 2, 0.1), clay); l.position.set(x, 0.2, 0); cube.add(l); }
  scene.add(cube);
  const landT = i => b(24 + i) - 0.02;
  function cubeAt(t) {
    let i = 0; while (i < N - 1 && t >= landT(i + 1)) i++;
    const nextLand = landT(i + 1), hopStart = nextLand - 0.32;
    let x = nodeX(i), y = 1.1, sq = 1;
    if (i < N - 1 && t > hopStart) { const s = (t - hopStart) / 0.3; x = lerp(nodeX(i), nodeX(i + 1), smooth(s)); y = 1.1 + 2.2 * 4 * s * (1 - s); sq = 1 + 0.15 * Math.sin(Math.PI * s); }
    const dt = t - landT(i); if (dt >= 0 && dt < 0.4) sq *= 1 - 0.28 * Math.exp(-dt * 10) * Math.cos(dt * 26);
    return { x, y, sq, i };
  }
  SH.pipeline = {
    scene, bg: () => BG,
    update(t) {
      const c = cubeAt(t);
      cube.position.set(c.x, c.y, 0); cube.scale.set(1 / Math.sqrt(c.sq), c.sq, 1 / Math.sqrt(c.sq)); cube.rotation.y = 0.35;
      nodes.forEach((nd, i) => { const on = t >= landT(i); nd.m.material.color.set(on ? HOTX : 0x1c1c20); nd.chk.visible = on && i > 0; nd.lab.children[0].material.color.set(on ? 0x0b0b0c : 0xffffff); });
      const w = Math.max(0.01, c.x - nodeX(0)); prog.scale.x = w; prog.position.x = nodeX(0) + w / 2;
    },
    cam(t) { const c = cubeAt(t - 0.08); const tgt = new THREE.Vector3(c.x + 0.8, 0.7, 0); tgt.y = 1.3; return { pos: tgt.clone().add(new THREE.Vector3(3.2, 3.0, 13.5)), target: tgt, fov: 40, roll: -0.03, focus: 14.2, ap: 0.1 }; },
  };
}

function buildBuild() {
  const scene = new THREE.Scene(), words = new Map();
  for (const [, s, c] of TL.BUILD) { const key = s + c; if (!words.has(key)) { const g = word(s.endsWith('.') ? [[s.slice(0, -1), c ? HOT : INK], ['.', c ? INK : HOT]] : [[s, c ? HOT : INK]], { h: s.length > 8 ? 3.3 : 6 }); scene.add(g); words.set(key, g); } }
  SH.build = {
    scene, bg: t => (t >= b(32) - 0.07 ? 0xf4f1ea : BG),
    update(t) {
      let cur = null; for (const e of TL.BUILD) if (t >= e[0]) cur = e;
      for (const g of words.values()) g.visible = false;
      if (cur && t < b(32) - 0.07) { const g = words.get(cur[1] + cur[2]); g.visible = true; const s = (t - cur[0]) / 0.08; g.scale.setScalar(lerp(1.3, 1, expo(s))); g.position.set(0, 0, lerp(-6, 0, expo(s))); }
    },
    cam(t) { const k = (t - b(28)) / (b(32) - b(28)), j = k * k * 0.35; return { pos: new THREE.Vector3(j * (hash(Math.floor(t * 60), 7) - 0.5), j * (hash(Math.floor(t * 60), 8) - 0.5), lerp(19, 15, k * k)), target: new THREE.Vector3(0, 0, 0), fov: 40, roll: j * 0.05 * (hash(Math.floor(t * 60), 9) - 0.5) }; },
  };
}

function buildEnd() {
  const scene = new THREE.Scene();
  const mark = word([['tvhead', INK], ['-studio', HOT]], { h: 3.1, layers: 18, depth: 0.4 }); scene.add(mark);
  const icon = (() => { const c = canvas(256, 256), g = c.getContext('2d');
    g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.fillStyle = HOT;
    g.beginPath(); g.moveTo(98, 54); g.lineTo(128, 82); g.lineTo(162, 46); g.stroke();
    g.beginPath(); g.roundRect(34, 82, 188, 136, 30); g.fill(); g.stroke();
    g.fillStyle = '#2a1712'; g.beginPath(); g.roundRect(56, 102, 144, 96, 18); g.fill();
    g.fillStyle = INK; g.beginPath(); g.ellipse(102, 144, 10, 14, 0, 0, 7); g.ellipse(154, 144, 10, 14, 0, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.arc(128, 160, 20, 0.35, Math.PI - 0.35); g.stroke();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: texOf(c), alphaTest: 0.5 })); m.visible = false; return m; })();
  scene.add(icon);
  const sub = word([['CLAUDE CODE SKILL · FREE · OPEN SOURCE', '#9a9ca3']], { h: 0.75, layers: 1, kind: 'mono', px: 110 }); scene.add(sub);
  const urlCv = canvas(2200, 160), ug = urlCv.getContext('2d'), urlTex = texOf(urlCv);
  const url = new THREE.Mesh(new THREE.PlaneGeometry(2200 / 160 * 1.05, 1.05), new THREE.MeshBasicMaterial({ map: urlTex, transparent: true })); scene.add(url);
  let lastN = -1;
  const star = (() => { const c = canvas(640, 160), g = c.getContext('2d'); g.fillStyle = HOT; g.beginPath(); g.roundRect(4, 4, 632, 152, 76); g.fill();
    g.fillStyle = '#0b0b0c'; g.font = font('rubik', 78); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★ STAR IT', 320, 86);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshBasicMaterial({ map: texOf(c), alphaTest: 0.4 })); return m; })();
  scene.add(star);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), new THREE.MeshBasicMaterial({ color: HOTX, transparent: true, side: THREE.DoubleSide })); scene.add(ring);
  const T0 = b(32);
  SH.end = {
    scene, bg: () => BG,
    paint(t) {
      const n = clamp(Math.floor((t - TL.URL0) * TL.URL_CPS) + 1, 0, TL.URL.length) * (t >= TL.URL0 ? 1 : 0);
      if (n !== lastN) { lastN = n; ug.clearRect(0, 0, 2200, 160); ug.font = font('mono', 96); ug.fillStyle = INK; ug.textBaseline = 'middle'; ug.textAlign = 'center';
        const s = TL.URL.slice(0, n), full = ug.measureText(TL.URL).width, x = 1100 - full / 2; ug.textAlign = 'left'; ug.fillText(s, x, 84);
        if (n < TL.URL.length) { ug.fillStyle = HOT; ug.fillRect(x + ug.measureText(s).width + 6, 34, 40, 100); } urlTex.needsUpdate = true; }
    },
    update(t) {
      const mw = mark.userData.w, x0 = -(mw + 4) / 2;
      slam(mark, t, T0, { x: x0 + 4 + mw / 2, y: 1.6, from: -60, dur: 0.16 });
      icon.visible = t >= T0 + 0.06; if (icon.visible) { const s = back((t - T0 - 0.06) / 0.3, 2.2); icon.scale.setScalar(Math.max(0.001, s)); icon.position.set(x0 + 1.6, 1.6, 0.2); icon.rotation.z = (1 - clamp((t - T0) / 0.3)) * -0.6; }
      ring.visible = t >= T0 && t < T0 + 0.6; if (ring.visible) { const s = (t - T0) / 0.6; ring.scale.setScalar(0.5 + 24 * expo(s)); ring.material.opacity = 1 - s; ring.position.set(0, 1.6, -0.5); }
      sub.visible = t > T0 + 0.35; if (sub.visible) { const s = smooth((t - T0 - 0.35) / 0.3); sub.position.set(0, lerp(-1.0, -0.9, s), 0); sub.children[0].material.opacity = s; sub.children[0].material.transparent = true; }

      url.position.set(0, -2.55, 0); url.visible = t >= TL.URL0 - 0.05;
      star.visible = t >= b(35); if (star.visible) { const s = back((t - b(35)) / 0.28, 2.4); star.scale.setScalar(Math.max(0.001, s)); star.position.set(0, -4.6, 0); }
    },
    cam(t) { const k = clamp((t - T0) / (TL.DUR - T0)); return { pos: new THREE.Vector3(lerp(1.6, -0.8, smooth(k)), lerp(0.6, 0.1, k), lerp(23.5, 21.5, smooth(k))), target: new THREE.Vector3(0, -0.6, 0), fov: 40, roll: 0 }; },
  };
}

// ─── HUD (screen space, crisp) ───────────────────────────────────────────────────────────────────────
function drawHUD(t, shot) {
  hg.clearRect(0, 0, W, H);
  const onHot = (shot.id === 'prompt' && t >= b(6)) || (shot.id === 'music' && t < b(22)), ink = onHot ? 'rgba(11,11,12,0.85)' : 'rgba(244,241,234,0.75)';
  if (shot.id === 'build' && t >= b(32) - 0.07) return;
  hg.strokeStyle = ink; hg.lineWidth = 3;
  for (const [x, y, sx, sy] of [[48, 48, 1, 1], [W - 48, 48, -1, 1], [48, H - 48, 1, -1], [W - 48, H - 48, -1, -1]]) { hg.beginPath(); hg.moveTo(x, y + sy * 34); hg.lineTo(x, y); hg.lineTo(x + sx * 34, y); hg.stroke(); }
  hg.font = font('mono', 22); hg.textBaseline = 'middle'; hg.fillStyle = ink;
  const f = Math.floor(t * TL.FPS), tc = `00:00:${String(Math.floor(t)).padStart(2, '0')}:${String(f % TL.FPS).padStart(2, '0')}`;
  if (shot.id !== 'end') { hg.fillStyle = Math.floor(t * 2) % 2 ? '#ff3b30' : 'rgba(255,59,48,0.35)'; hg.beginPath(); hg.arc(84, 92, 8, 0, 7); hg.fill(); hg.fillStyle = ink; hg.fillText(`REC  ${tc}`, 102, 93); }
  hg.textAlign = 'right'; hg.fillText('TVHEAD-STUDIO', W - 84, 93); hg.fillText('1920×1080 · 60 FPS', W - 84, 123); hg.textAlign = 'left';
  const labels = { terminal: '01 · PROMPT', prompt: '02 · ONE PROMPT', looks: '03 · 13 LOOKS', voice: '04 · VOICE', music: '05 · MUSIC · FORMATS', pipeline: '06 · PIPELINE', build: '07', end: 'MIT · CLAUDE CODE' };
  hg.fillText(labels[shot.id], 84, H - 92);
  // per-shot overlays
  if (shot.id === 'looks' && t < TL.LOOKS_WALL - 0.1) {
    const i = SH.looks.current(t), pop = expo((((t - TL.LOOKS_FLY) / TL.LOOK_STEP) % 1 + 1) % 1 / 0.35);
    hg.save(); hg.globalAlpha = smooth((t - b(8)) / 0.1);
    hg.fillStyle = 'rgba(11,11,12,0.78)'; hg.beginPath(); hg.roundRect(64, H / 2 - 190, 560, 360, 28); hg.fill();
    hg.font = font('rubik', 210); hg.fillStyle = HOT; hg.fillText(String(i + 1).padStart(2, '0'), 92, H / 2 - 40);
    hg.font = font('mono', 34); hg.fillStyle = INK; hg.fillText('/ 13', 340, H / 2 - 92);
    hg.font = font('rubik', 74); hg.fillStyle = INK; hg.save(); hg.translate(96, H / 2 + 100); hg.scale(1, lerp(0.6, 1, pop)); hg.fillText(TL.LOOKS[i][1], 0, 0); hg.restore();
    hg.restore();
  }
  if (shot.id === 'voice') {
    const k = [17, 18, 19].filter(x => t >= b(x)).length, ru = k % 2 === 1, x = W / 2 - 150, y = H - 150;
    hg.fillStyle = 'rgba(244,241,234,0.12)'; hg.beginPath(); hg.roundRect(x, y - 36, 300, 72, 36); hg.fill();
    hg.fillStyle = HOT; hg.beginPath(); hg.roundRect(x + 6 + (ru ? 144 : 0), y - 30, 144, 60, 30); hg.fill();
    hg.font = font('rubik', 34); hg.textAlign = 'center'; hg.fillStyle = ru ? INK : '#0b0b0c'; hg.fillText('EN', x + 78, y + 2); hg.fillStyle = ru ? '#0b0b0c' : INK; hg.fillText('RU', x + 222, y + 2);
    hg.font = font('mono', 26); hg.fillStyle = 'rgba(244,241,234,0.7)'; hg.fillText('free voices · word-timed captions', W / 2, y + 74); hg.textAlign = 'left';
  }
  if (shot.id === 'music' && t >= b(22)) {
    const tall = t >= b(23) + 0.06; hg.font = font('rubik', 92); hg.textAlign = 'right';
    hg.fillStyle = tall ? 'rgba(244,241,234,0.35)' : HOT; hg.fillText('16:9', W - 120, H / 2 - 70);
    hg.fillStyle = tall ? HOT : 'rgba(244,241,234,0.35)'; hg.fillText('9:16', W - 120, H / 2 + 50); hg.textAlign = 'left';
    hg.font = font('mono', 26); hg.fillStyle = 'rgba(244,241,234,0.7)'; hg.textAlign = 'center'; hg.fillText('one story · both formats', W / 2, H - 120); hg.textAlign = 'left';
  }
  if (shot.id === 'music' && t < b(22)) { hg.font = font('mono', 26); hg.fillStyle = 'rgba(11,11,12,0.8)'; hg.textAlign = 'center'; hg.fillText('generated · follows the cuts', W / 2, H - 150); hg.textAlign = 'left'; }
}

// ─── accumulation + post ─────────────────────────────────────────────────────────────────────────────
const rtOpts = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: true };
const rtSample = new THREE.WebGLRenderTarget(W, H, rtOpts), rtAccum = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, depthBuffer: false });
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const accMat = new THREE.ShaderMaterial({
  uniforms: { tex: { value: rtSample.texture }, w: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * w, w); }   // alpha sums to 1: N samples must not leave alpha = N for the copy pass',
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false,
});
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new TexturePass(rtAccum.texture));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.2, 0.35, 0.9));
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, seed: { value: 0 }, res: { value: new THREE.Vector2(W, H) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float seed; uniform vec2 res; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main(){ vec2 d = vUv - .5; float r = dot(d, d);
      vec3 c = vec3(texture2D(tDiffuse, vUv - d * .004 * r).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + d * .004 * r).b);
      c *= mix(1., .78, smoothstep(.12, .6, r)); c += (h(vUv * res) - .5) * .006; gl_FragColor = vec4(c, 1.); }`,
});
composer.addPass(grade); composer.addPass(new OutputPass());

const UP = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3();
function place(cs, t, i, samples) {
  const sh = shake(t);
  camera.fov = cs.fov; camera.updateProjectionMatrix();
  camera.position.copy(cs.pos).add(new THREE.Vector3(sh.x, sh.y, 0));
  camera.up.set(Math.sin(cs.roll + sh.r), Math.cos(cs.roll + sh.r), 0);
  const focusPt = cs.target.clone();
  fwd.subVectors(cs.target, cs.pos).normalize(); right.crossVectors(fwd, UP).normalize(); upv.crossVectors(right, fwd);
  if (cs.ap && samples > 1) {
    focusPt.copy(cs.pos).addScaledVector(fwd, cs.focus);
    const a = halton(i + 1, 2) * Math.PI * 2, r = Math.sqrt(halton(i + 1, 3)) * cs.ap;
    camera.position.addScaledVector(right, Math.cos(a) * r).addScaledVector(upv, Math.sin(a) * r);
  }
  camera.lookAt(focusPt);
  if (samples > 1) camera.setViewOffset(W, H, halton(i + 1, 5) - 0.5, halton(i + 1, 7) - 0.5, W, H); else camera.clearViewOffset();
}
function renderFrame(t, samples) {
  const shot = TL.shotAt(t);
  drawHUD(t, shot);
  for (const k in SH) SH[k].paint?.(t);                          // canvas textures change once per frame, never between samples
  renderer.setClearColor(0x000000, 1); renderer.setRenderTarget(rtAccum); renderer.clear();
  const shutter = 0.5 / TL.FPS;
  for (let i = 0; i < samples; i++) {
    const ts = TL.clampToShot(t, Math.max(0, Math.min(TL.DUR - 1e-4, samples > 1 ? t + ((i + 0.5) / samples - 0.5) * shutter : t)));
    const s = SH[TL.shotAt(ts).id];
    s.update(ts);
    place(s.cam(ts), ts, i, samples);
    renderer.setClearColor(s.bg(ts), 1); renderer.setRenderTarget(rtSample); renderer.clear(); renderer.render(s.scene, camera);
    accMat.uniforms.w.value = 1 / samples; renderer.setRenderTarget(rtAccum); renderer.render(quadScene, quadCam);
  }
  camera.clearViewOffset(); renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear();   // never composite over the previous frame
  grade.uniforms.seed.value = (Math.round(t * TL.FPS) % 89) * 1.37;
  composer.render();
}

async function init() {
  await Promise.all(["800 40px Rubik", "700 40px 'JetBrains Mono'", "800 40px Inter"].map(f => document.fonts.load(f)));
  await Promise.all(TL.LOOKS.map(async ([id]) => { IMG[id] = await loadImg(`assets/look-${id}.jpg`); }));
  IMG.tall = await loadImg('assets/tall.jpg');
  buildTerminal(); buildPrompt(); buildLooks(); buildVoice(); buildMusic(); buildPipeline(); buildBuild(); buildEnd();
  return true;
}
window.__ready = init();
window.renderAt = async (t, samples) => { await window.__ready; renderFrame(t, samples ?? SAMPLES); renderer.getContext().finish(); return true; };
