// "Claude Duet builds the studio": clay agents assemble the repo and the app in a glass studio. Pure render(t);
// every frame averages N renders over the shutter (motion blur, AA) and the lens (depth of field).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as TL from './timeline.js';
import { clamp, lerp, smooth, smoother, expo, back, v3lerp } from '../../lib/choreo.js';

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);
let SAMPLES = +(Q.get('samples') || 8);
const AG = TL.AG;

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.autoClear = false;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const hud = document.createElement('canvas'); hud.width = W; hud.height = H; hud.id = 'hud'; document.body.appendChild(hud);
const hg = hud.getContext('2d');
const ANISO = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0c10, 34, 78);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 400);

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); return c; };
const texOf = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; };
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + src)); i.src = src; });
const V = a => new THREE.Vector3(a[0], a[1], a[2]);
const font = (w, px, fam = 'Inter') => `${w} ${px}px ${fam === 'mono' ? "'JetBrains Mono'" : fam === 'rubik' ? 'Rubik' : 'Inter'}`;
const IMG = { cards: [] };
function cover(g, img, x, y, w, h) { const ir = img.width / img.height, r = w / h; let sw = img.width, sh = img.height, sx = 0, sy = 0; if (ir > r) { sw = sh * r; sx = (img.width - sw) / 2; } else { sh = sw / r; sy = (img.height - sh) / 2; } g.drawImage(img, sx, sy, sw, sh, x, y, w, h); }

// ─── studio: floor, grid, glass scaffold ─────────────────────────────────────────────────────────────
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.82, metalness: 0.05 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(90, 90, 0x2a3442, 0x1c222c); grid.position.y = 0.005; grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);
const frameMat = new THREE.LineBasicMaterial({ color: 0x4f86a8, transparent: true, opacity: 0.32 });
const studioBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(52, 13, 24)), frameMat); studioBox.position.set(0, 6.5, -3); scene.add(studioBox);
for (let i = -3; i <= 3; i++) { const post = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.01, 13, 24)), frameMat); post.position.set(i * 8.6, 6.5, -3); scene.add(post); }
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(52, 13), new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.9, transparent: true, opacity: 0.85 })); backWall.position.set(0, 6.5, -15); scene.add(backWall);
// lights
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x20160f, 0.8); scene.add(hemi);
const key = new THREE.DirectionalLight(0xffe2c4, 2.4); key.position.set(-14, 26, 18); key.target.position.set(0, 0, -1); scene.add(key, key.target);
key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 3;
Object.assign(key.shadow.camera, { left: -30, right: 30, top: 22, bottom: -22, near: 1, far: 90 }); key.shadow.camera.updateProjectionMatrix();
const rim = new THREE.DirectionalLight(0x8fb8ff, 1.1); rim.position.set(12, 10, -20); scene.add(rim);
const warm = new THREE.PointLight(0xff9a5a, 60, 22, 2); warm.position.set(0, 6, 7); scene.add(warm);

// ─── clay material ───────────────────────────────────────────────────────────────────────────────────
function clayBump() { const c = canvas(256, 256), g = c.getContext('2d'); let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) { const x = r() * 256, y = r() * 256, rad = 3 + r() * 14, v = r() < 0.5 ? 0 : 255, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${v},${v},${v},${0.05 + r() * 0.08})`); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const BUMP = clayBump();
const clay = color => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color(0xffd2bf), sheenRoughness: 0.6, bumpMap: BUMP, bumpScale: 0.7 });

// ─── zones ───────────────────────────────────────────────────────────────────────────────────────────
const ZG = {};
for (const [key, z] of Object.entries(TL.ZONES)) {
  const g = new THREE.Group(), col = new THREE.Color(z.color);
  const plat = new THREE.Mesh(new RoundedBoxGeometry(TL.PLAT.w, TL.PLAT.h, TL.PLAT.d, 3, 0.1), new THREE.MeshPhysicalMaterial({ color: 0x1a2130, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.78, clearcoat: 0.6 }));
  plat.position.y = TL.PLAT.h / 2; plat.castShadow = true; plat.receiveShadow = true; g.add(plat);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TL.PLAT.w, TL.PLAT.h, TL.PLAT.d)), new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(1.6) })); edge.position.y = TL.PLAT.h / 2; g.add(edge);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x223044, roughness: 0.15, transparent: true, opacity: 0.42, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.04 });
  if (key === 'skill') { const page = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.3, 0.08), glassMat); page.position.set(0, 0.3 + 2.15, -1.2); g.add(page);
    const pe = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.6, 4.3, 0.08)), new THREE.LineBasicMaterial({ color: col })); pe.position.copy(page.position); g.add(pe); }
  if (key === 'ui') { const scr = new THREE.Mesh(new THREE.BoxGeometry(5.3, 3.5, 0.1), glassMat); scr.position.set(0.3, 0.55 + 1.75, -1.2); g.add(scr);
    const se = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.3, 3.5, 0.1)), new THREE.LineBasicMaterial({ color: col })); se.position.copy(scr.position); g.add(se);
    for (const x of [-1.8, 2.4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), glassMat); leg.position.set(x, 0.42, -1.2); g.add(leg); } }
  if (key === 'three') { const disk = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x2b3446, roughness: 0.4, emissive: col, emissiveIntensity: 0.08 })); disk.position.set(0, 0.34, 0.2); disk.receiveShadow = true; g.add(disk); }
  const tag = (() => { const c = canvas(512, 96), x = c.getContext('2d'); x.font = font(800, 54, 'mono'); x.fillStyle = z.color; x.textBaseline = 'middle'; x.fillText(z.label, 18, 50); return c; })();
  g.userData = { tagCanvas: tag };
  scene.add(g); ZG[key] = g;
}
function poseZones(t) {
  for (const [key, g] of Object.entries(ZG)) {
    const show = TL.zoneShow(key), k = key === 'repo' ? 1 : back(clamp((t - show) / 0.6), 1.6), fin = 1 - smooth((t - TL.T.collapse - 1.2) / 1.6);
    g.visible = k > 0.001 && fin > 0.001;
    g.position.copy(V(TL.zoneOrigin(key, t))); g.position.y = -2.2 * (1 - clamp(k)); g.scale.set(1, Math.max(0.01, k * fin), 1);
  }
}

// ─── blocks ──────────────────────────────────────────────────────────────────────────────────────────
function labelCanvas(text, w, h, bg, fg, px, mono = true) {
  const c = canvas(w, h), g = c.getContext('2d'); g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, Math.min(w, h) * 0.12); g.fill();
  g.fillStyle = fg; g.font = font(mono ? 700 : 800, px, mono ? 'mono' : 'rubik'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + px * 0.04); return c;
}
const ZC = k => TL.ZONES[k].color;
const BM = new Map();                                                   // block id → { root, body, label?, kind, live? }
function buildBlock(bl) {
  const root = new THREE.Group(), col = new THREE.Color(ZC(bl.zone)), dark = col.clone().multiplyScalar(0.35);
  const mat = new THREE.MeshPhysicalMaterial({ color: dark, roughness: 0.35, clearcoat: 0.5, emissive: col, emissiveIntensity: 0.06 });
  const add = (geo, m, y = 0) => { const me = new THREE.Mesh(geo, m); me.position.y = y; me.castShadow = true; me.receiveShadow = true; root.add(me); return me; };
  const face = (c, w, h, pos, rot, glow = 0.55) => { const t = texOf(c); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: glow, roughness: 0.5, transparent: true })); p.position.copy(pos); if (rot) p.rotation.copy(rot); root.add(p); return { p, t, c }; };
  let rec = { root, kind: bl.kind, h: 0.3 };
  switch (bl.kind) {
    case 'tile': add(new RoundedBoxGeometry(1.5, 0.24, 1.05, 2, 0.06), mat); face(labelCanvas(bl.label, 600, 420, ZC(bl.zone), '#0d1016', 74), 1.36, 0.95, new THREE.Vector3(0, 0.125, 0), new THREE.Euler(-Math.PI / 2, 0, 0)); rec.h = 0.24; break;
    case 'chip': add(new RoundedBoxGeometry(3.0, 0.42, 0.18, 2, 0.06), mat); face(labelCanvas(bl.label, 1000, 140, ZC(bl.zone), '#0d1016', 76), 2.9, 0.4, new THREE.Vector3(0, 0, 0.095)); rec.h = 0.42; break;
    case 'chipS': add(new RoundedBoxGeometry(1.1, 0.38, 0.18, 2, 0.06), mat); rec.face = face(labelCanvas(bl.label, 520, 180, ZC(bl.zone), '#0d1016', 64), 1.05, 0.36, new THREE.Vector3(0, 0, 0.095)); rec.h = 0.38; break;
    case 'panel': { add(new RoundedBoxGeometry(3.2, 1.8, 0.12, 2, 0.05), mat); const c = canvas(640, 360); rec.live = face(c, 3.08, 1.72, new THREE.Vector3(0, 0, 0.065), null, 0.28); rec.live.p.material = new THREE.MeshBasicMaterial({ map: rec.live.t, color: 0xa8a8a8 });   /* a screen: unlit, capped so white frames don't bloom out */ rec.h = 1.8; break; }
    case 'bar': { add(new RoundedBoxGeometry(4.6, 0.36, 0.14, 2, 0.05), mat); const c = canvas(1150, 90); rec.bar = face(c, 4.5, 0.34, new THREE.Vector3(0, 0, 0.075)); rec.h = 0.36; break; }
    case 'button': add(new RoundedBoxGeometry(0.6, 0.6, 0.16, 2, 0.1), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.4, clearcoat: 0.6, emissive: col, emissiveIntensity: 0.15 })); rec.face = face(labelCanvas(bl.label, 200, 200, 'rgba(0,0,0,0)', '#0d1016', 120, false), 0.5, 0.5, new THREE.Vector3(0, 0, 0.085)); rec.h = 0.6; break;
    case 'part': {
      if (bl.label === 'body') { add(new RoundedBoxGeometry(1.1, 0.95, 0.95, 4, 0.24), clay(0xe5744f)); rec.h = 0.95; }
      else if (bl.label === 'eyeL' || bl.label === 'eyeR') { const e = add(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x0b0706, roughness: 0.1, clearcoat: 1 })); e.scale.set(1, 1.4, 0.5); rec.h = 0.28; }
      else if (bl.label === 'legs') { for (const x of [-0.26, 0.26]) { const l = add(new RoundedBoxGeometry(0.26, 0.3, 0.26, 2, 0.08), clay(0xe5744f)); l.position.x = x; } rec.h = 0.3; }
      else if (bl.label === 'backdrop') { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 40, 1, true, -0.85, 1.7), new THREE.MeshStandardMaterial({ color: 0x3b4c66, roughness: 0.7, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.05 })); m.position.set(0, 1.2, 1.25); m.rotation.y = Math.PI; m.castShadow = true; m.receiveShadow = true; root.add(m); rec.h = 2.4; rec.base = true; }
      else if (bl.label === 'lamp') { add(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0x9aa3b0, metalness: 0.6, roughness: 0.3 }), 0.75); const hd = add(new THREE.ConeGeometry(0.28, 0.36, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, emissive: 0xffd9a0, emissiveIntensity: 0.6, side: THREE.DoubleSide }), 1.55); hd.rotation.z = 0.9; rec.h = 1.7; rec.base = true; }
      break;
    }
  }
  root.visible = false; scene.add(root); rec.root = root; rec.base = rec.base || false;
  bl.lift = rec.base ? 0.04 : rec.h / 2 + 0.04;                          // carried on the head, not through it
  if (bl === TL.CONFIG) { rec.halves = [0, 1].map(i => { const hg2 = new THREE.Group(); const m = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.38, 0.18, 2, 0.05), mat); m.castShadow = true; hg2.add(m); hg2.visible = false; scene.add(hg2); return hg2; }); }
  BM.set(bl.id, rec);
}
// fragments (tear) and check rings
const FRAG_N = 46, fragMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), new THREE.MeshStandardMaterial({ color: 0xe8c547, emissive: 0xe8c547, emissiveIntensity: 0.6 }), FRAG_N); fragMesh.visible = false; scene.add(fragMesh);
const rings = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.visible = false; scene.add(m); return m; });

// ─── agents ──────────────────────────────────────────────────────────────────────────────────────────
const AM = {};
for (const a of Object.values(AG)) {
  const root = new THREE.Group(), sq = new THREE.Group(), tilt = new THREE.Group(), body = new THREE.Group();
  root.add(sq); sq.add(tilt); tilt.add(body); scene.add(root);
  const m = clay(a.color), B = { w: 1.3, h: 1.1, d: 1.1 }, LEG = 0.35;
  const torso = new THREE.Mesh(new RoundedBoxGeometry(B.w, B.h, B.d, 5, 0.27), m); torso.castShadow = true; torso.receiveShadow = true; body.add(torso);
  const eyeM = new THREE.MeshPhysicalMaterial({ color: 0x0b0706, roughness: 0.1, clearcoat: 1 }), glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [-0.29, 0.29].map(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), eyeM); e.position.set(x, 0.12, B.d / 2 - 0.02); e.scale.set(0.95, 1.35, 0.5); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), glint); gl.position.set(-0.03, 0.045, 0.08); e.add(gl); body.add(e); return e; });
  const nubs = [-1, 1].map(s => { const n = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.24, 0.26, 2, 0.09), m); n.position.set(s * (B.w / 2 + 0.08), -0.06, 0.04); n.castShadow = true; body.add(n); return n; });
  const legs = [-0.31, 0.31].map(x => { const p = new THREE.Group(); p.position.set(x, -B.h / 2 + 0.04, 0); body.add(p); const l = new THREE.Mesh(new RoundedBoxGeometry(0.27, LEG + 0.06, 0.27, 2, 0.09), m); l.position.y = -(LEG + 0.06) / 2 + 0.02; l.castShadow = true; p.add(l); return p; });
  AM[a.id] = { root, sq, tilt, body, eyes, legs, nubs, LEG, B };
}
function poseAgent(a, t) {
  const g = AM[a.id], p = a.pose(t);
  const hidden = a.id !== 'coord' && t < TL.T.cut - 0.7;
  g.root.visible = !hidden; if (hidden) return;
  g.root.position.set(p.pos[0], p.pos[1], p.pos[2]); g.root.rotation.y = p.face; g.root.scale.setScalar(p.scale);
  const side = 1 / Math.sqrt(p.sq); g.sq.scale.set(side, p.sq, side);
  g.tilt.rotation.set(p.lean, 0, 0);
  g.body.position.y = g.LEG + g.B.h / 2 - g.LEG * p.sit; g.body.rotation.x = p.pitch;
  g.legs.forEach((l, i) => { let rx = p.run ? 0.7 * Math.sin(Math.PI * p.run + i * Math.PI) : 0; if (p.air > 0) rx = -0.35 * p.air; l.rotation.x = lerp(rx, -1.4, p.sit); l.position.z = 0.25 * p.sit; });
  g.nubs.forEach((n, i) => { n.rotation.z = (i ? -1 : 1) * 0.5 * p.air; });
  for (const e of g.eyes) e.scale.y = 1.35 * (1 - 0.9 * p.blink) + 0.02;
}

// ─── cables ──────────────────────────────────────────────────────────────────────────────────────────
const SEG = 30, cableMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 8), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x5fc0ff, emissiveIntensity: 0.9, roughness: 0.3 }), SEG * TL.LINKS.length);
cableMesh.castShadow = true; scene.add(cableMesh);
const Mx = new THREE.Matrix4(), Qq = new THREE.Quaternion(), Sv = new THREE.Vector3(), Pv = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
function anchor(key, side, t) { const o = TL.zoneOrigin(key, t); return [o[0] + side * (TL.PLAT.w / 2 - 0.2), 0.32, o[2] + 1.4]; }
function poseCables(t) {
  let n = 0;
  TL.LINKS.forEach(l => {
    const sa = TL.ZONES[l.a].at[0] < TL.ZONES[l.b].at[0] ? 1 : -1;
    let A = anchor(l.a, sa, t), Bp = anchor(l.b, -sa, t), grow = smooth((t - l.on) / 0.6), sag = 0.9, glow = 1;
    if (l.snap && t >= l.snap && t < l.relink) {                                   // snapped: one loose strand from A
      const k = t - l.snap; let end;
      if (t < TL.CABLE_GRAB) { const mid = v3lerp(A, Bp, 0.5); end = [mid[0] + 0.6 * Math.sin(k * 9) * Math.exp(-k * 3), Math.max(0.06, mid[1] + 1.2 * Math.exp(-k * 4) - 0.25 * k), mid[2] + 1.2]; }
      else { const h = AG.coord.headAt(t); end = [h[0], h[1] - 0.2, h[2]]; }
      Bp = end; sag = 0.3; glow = 0.35;
    }
    if (l.relink && t >= l.relink) glow = 1 + 2 * Math.exp(-(t - l.relink) * 3);
    const fade = 1 - smooth((t - TL.T.collapse - 0.5) / 1.0);
    for (let i = 0; i < SEG; i++) {
      const u0 = i / SEG, u1 = (i + 1) / SEG, vis = u1 <= grow && fade > 0.01;
      const pt = u => { const p = v3lerp(A, Bp, u); p[1] += sag * 4 * u * (1 - u) * -0.6 + 0.9 * 4 * u * (1 - u); return p; };
      const p0 = pt(u0), p1 = pt(u1), d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      Pv.set((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2); Qq.setFromUnitVectors(UPV, new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize());
      Sv.set(vis ? fade : 0.001, vis ? d * 1.05 : 0.001, vis ? fade : 0.001); if (!vis) Pv.y = -40;
      Mx.compose(Pv, Qq, Sv); cableMesh.setMatrixAt(n++, Mx);
    }
    cableMesh.material.emissiveIntensity = 0.9 * glow;
  });
  cableMesh.instanceMatrix.needsUpdate = true;
}

// ─── poses for blocks ────────────────────────────────────────────────────────────────────────────────
const tmpE = new THREE.Euler();
function poseBlocks(t) {
  for (const bl of TL.BLOCKS) {
    const r = BM.get(bl.id); let w = null;
    const s = bl.states.filter(st => st.t <= t).pop();
    // config: tug / torn / rejoin (custom)
    if (bl === TL.CONFIG && s && ['tug', 'torn', 'rejoin'].includes(s.mode)) {
      const ha = AG[s.a ?? 'skill'].headAt(t), hb = AG[s.b ?? 'ui'].headAt(t);
      if (s.mode === 'tug') { const mid = v3lerp(ha, hb, 0.5); mid[1] += 0.1; r.root.visible = true; r.root.position.copy(V(mid)); r.root.rotation.set(0, 0, 0.04 * Math.sin(t * 40));
        const k = smooth((t - TL.T.tug) / (TL.T.tear - TL.T.tug)); r.root.scale.set(1 + 1.6 * k + 0.05 * Math.sin(t * 50), 1 - 0.25 * k, 1); r.halves.forEach(h => h.visible = false); continue; }
      r.root.visible = false;
      const k = t - TL.T.tear;
      r.halves.forEach((h, i) => { h.visible = true; const hd = i ? hb : ha; let p = [hd[0] + (i ? -0.35 : 0.35), hd[1] + 0.12, hd[2]];
        if (s.mode === 'torn') { const pop = Math.exp(-k * 6); p[0] += (i ? 1 : -1) * 0.5 * pop; p[1] += 0.3 * pop; }
        if (s.mode === 'rejoin') { const u = smoother((t - TL.T.rejoin) / 0.5), dst = [hb[0], hb[1] + 0.25, hb[2]]; p = v3lerp(p, [dst[0] + (i ? 0.28 : -0.28), dst[1], dst[2]], u); }
        h.position.copy(V(p)); h.rotation.set(0, 0, (i ? 1 : -1) * 0.25 * Math.exp(-Math.max(0, k) * 3)); });
      continue;
    }
    if (bl === TL.CONFIG) r.halves.forEach(h => h.visible = false);
    w = bl.where(t, AG);
    // finale collapse into the compact object
    const tc = TL.collapseAt(bl);
    if (t > tc && w) { const u = smoother((t - tc) / 0.9), fp = TL.finalPos(bl); const p = v3lerp(w.pos, fp, u); p[1] += 1.4 * Math.sin(Math.PI * u); w = { ...w, pos: p, collapse: u }; }
    if (!w) { r.root.visible = false; continue; }
    r.root.visible = true; r.root.position.copy(V(w.pos));
    // orientation: chips/panels stand facing +z, tiles lie flat; spin in flight; in the repo tower everything lies flat
    let ry = (w.spin ?? 0), rx = 0;
    if (w.face != null && !w.placed) ry += w.face;
    const tower = (bl.zone === 'repo' || bl.zone === 'skill') && w.collapse;
    if (tower && bl.kind === 'chip') rx = -Math.PI / 2 * w.collapse;
    if (w.collapse) ry *= 1 - w.collapse;
    r.root.rotation.set(rx, ry, 0);
    // scale: oversize pieces until squeezed; the finale scales studio pieces down
    let sy = 1; if (bl.oversize && s && s.mode === 'place') { const tq = bl.zone === 'repo' ? TL.SQUEEZE.repo : TL.SQUEEZE.three; sy = t < tq ? bl.oversize : lerp(bl.oversize, 1, expo((t - tq) / 0.2)) - 0.12 * Math.exp(-(t - tq) * 8) * Math.sin((t - tq) * 30); }
    const fin = w.collapse ? lerp(1, bl.zone === 'ui' ? 0.92 : bl.zone === 'three' ? 0.72 : 1, w.collapse) : 1;
    const cloud = s && s.mode === 'float' && t < TL.T.cut + 1 && (bl.kind === 'part' || bl.kind === 'panel' || bl.kind === 'bar') ? 0.6 : 1;   // big pieces read as pieces, not agents
    const sq = w.squash ?? 1;
    r.root.scale.set(cloud * fin / Math.sqrt(sq), cloud * fin * sy * sq, cloud * fin / Math.sqrt(sq));
    // slots: placed pieces sit with their base on the slot point (tiles/parts) or centred on it (vertical pieces)
    if (r.base || bl.kind === 'tile' || bl.label === 'legs' || bl.label === 'body') r.root.position.y += (r.base ? 0 : r.h / 2) * (r.base ? 0 : (sy - 1) * 1 + 0);
  }
  // fragments of the tear
  const k = t - TL.T.tear; fragMesh.visible = k > 0 && k < 1.8;
  if (fragMesh.visible) { for (let i = 0; i < FRAG_N; i++) { const a = i * 2.39996, sp = 2.2 + (i % 5) * 0.6, vy = 2.5 + (i % 7) * 0.5;
      Pv.set(Math.cos(a) * sp * k, 2.3 + vy * k - 4.9 * k * k, 3.9 + Math.sin(a) * sp * k * 0.8); if (Pv.y < 0.05) Pv.y = 0.05; Sv.setScalar(Math.max(0.01, 1 - k / 1.8)); Qq.setFromEuler(tmpE.set(k * 8 + i, k * 6, 0)); Mx.compose(Pv, Qq, Sv); fragMesh.setMatrixAt(i, Mx); }
    fragMesh.instanceMatrix.needsUpdate = true; }
  // check rings
  const active = TL.CHECKS.filter(c => t > c.t && t < c.t + 0.7).slice(-rings.length);
  rings.forEach((m, i) => { const c = active[i]; m.visible = !!c; if (!c) return; const u = (t - c.t) / 0.7, p = TL.slotWorld(c.zone, c.slot)(t);
    m.position.set(p[0], p[1] + 0.3, p[2] + 0.4); m.scale.setScalar(0.3 + 1.6 * expo(u)); m.material.opacity = 1 - u; m.material.color.set(ZC(c.zone)); m.lookAt(camera.position); });
}

// ─── live canvases (painted once per frame) ──────────────────────────────────────────────────────────
function paint(t) {
  const prev = BM.get(TL.blk('ui', 0).id).live, bar = BM.get(TL.blk('ui', 1).id).bar;
  const g = prev.c.getContext('2d'), playing = t >= TL.PLAY.t0;
  if (!playing) { cover(g, IMG.still, 0, 0, 640, 360); g.fillStyle = 'rgba(8,10,14,0.45)'; g.fillRect(0, 0, 640, 360); g.fillStyle = '#e8c547'; g.font = font(800, 40, 'mono'); g.textAlign = 'center'; g.fillText('▶', 320, 196); }
  else { const u = t - TL.PLAY.t0, card = Math.floor(u / 2) % 6, f = Math.floor(u * 8) % 16; cover(g, IMG.cards[card][f], 0, 0, 640, 360); }
  g.strokeStyle = '#e8c547'; g.lineWidth = 8; g.strokeRect(0, 0, 640, 360);
  prev.t.needsUpdate = true;
  const b = bar.c.getContext('2d'); b.clearRect(0, 0, 1150, 90); b.fillStyle = '#0e1219'; b.beginPath(); b.roundRect(2, 2, 1146, 86, 18); b.fill();
  const clips = [['#5fb7a8', 20, 260], ['#9b8fd6', 290, 250], ['#e8c547', 550, 300], ['#6fa5e0', 860, 270]];
  for (const [c, x, w] of clips) { b.fillStyle = c; b.beginPath(); b.roundRect(x, 20, w, 50, 10); b.fill(); }
  const ph = playing ? smooth((t - TL.PLAY.t0) / (TL.PLAY.t1 - TL.PLAY.t0)) : 0;
  b.fillStyle = '#ffffff'; b.fillRect(20 + ph * 1110, 6, 6, 78);
  bar.t.needsUpdate = true;
}

// ─── title ───────────────────────────────────────────────────────────────────────────────────────────
function drawHUD(t) {
  hg.clearRect(0, 0, W, H);
  const a = smooth((t - TL.T.title) / 1.2) * (1 - smooth((t - TL.T.fadeOut) / 0.7)), a2 = smooth((t - TL.T.title - 1.5) / 1.0) * (1 - smooth((t - TL.T.fadeOut) / 0.7));
  if (a > 0) {
    hg.save(); hg.globalAlpha = a; hg.textAlign = 'center'; hg.textBaseline = 'middle';
    hg.shadowColor = 'rgba(255,150,90,0.55)'; hg.shadowBlur = 40; hg.fillStyle = '#f7f3ec'; hg.font = font(800, 132, 'rubik');
    hg.fillText('Claude Duet', W / 2, H * 0.2 + 18 * (1 - a)); hg.restore();
  }
  if (a2 > 0) { hg.save(); hg.globalAlpha = a2; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillStyle = '#ff7a3d'; hg.font = font(700, 34, 'mono'); hg.letterSpacing = '6px'; hg.fillText('tvhead-studio', W / 2, H * 0.2 + 100); hg.restore(); }
}

// ─── accumulation + post ─────────────────────────────────────────────────────────────────────────────
const rtOpts = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: true };
const rtSample = new THREE.WebGLRenderTarget(W, H, rtOpts), rtAccum = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, depthBuffer: false });
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const accMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: rtSample.texture }, w: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * w, w); }',
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false });
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new TexturePass(rtAccum.texture));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.35, 0.5, 0.9));
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, fade: { value: 1 }, seed: { value: 0 }, res: { value: new THREE.Vector2(W, H) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float fade, seed; uniform vec2 res; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main(){ vec2 d = vUv - .5; float r = dot(d, d); vec3 c = texture2D(tDiffuse, vUv).rgb;
      c *= mix(1., .7, smoothstep(.1, .62, r)); c *= vec3(1.02, 1.0, .97); c += (h(vUv * res) - .5) * .005; gl_FragColor = vec4(max(c, 0.) * fade, 1.); }` });
composer.addPass(grade); composer.addPass(new OutputPass());

function halton(i, base) { let f = 1, r = 0; while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); } return r; }
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3();
function renderFrame(t, samples) {
  paint(t); drawHUD(t);
  renderer.setClearColor(0x000000, 1); renderer.setRenderTarget(rtAccum); renderer.clear();
  const shutter = 0.5 / TL.FPS;
  for (let i = 0; i < samples; i++) {
    const ts = TL.clampToShot(t, Math.max(0, Math.min(TL.DUR - 1e-4, samples > 1 ? t + ((i + 0.5) / samples - 0.5) * shutter : t)));
    poseZones(ts); for (const a of Object.values(AG)) poseAgent(a, ts); poseBlocks(ts); poseCables(ts);
    const sh = TL.shotAt(ts), cs = sh.cam(ts, sh);
    camera.fov = cs.fov; camera.updateProjectionMatrix();
    const pos = V(cs.pos), tgt = V(cs.target), focus = pos.distanceTo(tgt);
    camera.position.copy(pos); camera.up.set(0, 1, 0);
    fwd.subVectors(tgt, pos).normalize(); right.crossVectors(fwd, camera.up).normalize(); upv.crossVectors(right, fwd);
    if (samples > 1 && cs.ap) { const a = halton(i + 1, 2) * Math.PI * 2, r = Math.sqrt(halton(i + 1, 3)) * cs.ap; camera.position.addScaledVector(right, Math.cos(a) * r).addScaledVector(upv, Math.sin(a) * r); }
    camera.lookAt(pos.clone().addScaledVector(fwd, focus));
    if (samples > 1) camera.setViewOffset(W, H, halton(i + 1, 5) - 0.5, halton(i + 1, 7) - 0.5, W, H); else camera.clearViewOffset();
    renderer.setClearColor(0x0b0c10, 1); renderer.setRenderTarget(rtSample); renderer.clear(); renderer.render(scene, camera);
    accMat.uniforms.w.value = 1 / samples; renderer.setRenderTarget(rtAccum); renderer.render(quadScene, quadCam);
  }
  camera.clearViewOffset(); renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear();
  grade.uniforms.fade.value = smooth(t / 1.0) * (1 - smooth((t - (TL.DUR - 0.8)) / 0.8));
  grade.uniforms.seed.value = (Math.round(t * TL.FPS) % 89) * 1.37;
  composer.render();
}

async function init() {
  await Promise.all(["800 40px Rubik", "700 40px 'JetBrains Mono'", "800 40px Inter"].map(f => document.fonts.load(f)));
  const pad = n => String(n).padStart(2, '0');
  IMG.cards = await Promise.all([0, 1, 2, 3, 4, 5].map(i => Promise.all(Array.from({ length: 16 }, (_, f) => loadImg(`assets/card${i}/${pad(f + 1)}.jpg`)))));
  IMG.still = await loadImg('assets/still.jpg');
  for (const bl of TL.BLOCKS) buildBlock(bl);
  return true;
}
window.__ready = init();
window.renderAt = async (t, samples) => { await window.__ready; renderFrame(t, samples ?? SAMPLES); renderer.getContext().finish(); return true; };
