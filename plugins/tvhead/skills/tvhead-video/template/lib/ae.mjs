// After Effects bridge: real 3D scenes (Cinema 4D renderer: extruded type and shapes, lights, shadows, depth of field)
// built by ExtendScript and rendered by aerender, then used as the background plate of a scene — our characters, props
// and captions are still drawn on top by the engine.
//   scene: "ae": { "recipe": "title3d" | "cube3d" | "cards3d" | "rings3d", "text", "sub", "items": [...], "colors": { bg, bg2, accent, fill, ink } }
// Flow: recipe → .jsx → AfterFX -r (builds the comp, saves an .aep, quits if we started it) → aerender → mp4 → JPG frames.
// Results are cached per (recipe, params, duration, size) in episodes/<slug>/build/ae/<hash>/.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export function findAE() {
  const roots = process.platform === 'win32' ? ['C:/Program Files/Adobe'] : ['/Applications'];
  for (const r of roots) {
    if (!existsSync(r)) continue;
    const dirs = readdirSync(r).filter(d => /^Adobe After Effects/.test(d)).sort().reverse();
    for (const d of dirs) {
      const sup = process.platform === 'win32' ? path.join(r, d, 'Support Files') : path.join(r, d);
      const afterfx = process.platform === 'win32' ? path.join(sup, 'AfterFX.exe') : path.join(sup, `${d}.app/Contents/MacOS/After Effects`);
      const aerender = path.join(sup, process.platform === 'win32' ? 'aerender.exe' : 'aerender');
      if (existsSync(aerender)) return { version: d, afterfx, aerender };
    }
  }
  return null;
}
const aeRunning = () => process.platform === 'win32'
  ? /AfterFX\.exe/i.test(spawnSync('tasklist', ['/FI', 'IMAGENAME eq AfterFX.exe'], { encoding: 'utf8' }).stdout || '')
  : /After Effects/.test(spawnSync('pgrep', ['-fl', 'After Effects'], { encoding: 'utf8' }).stdout || '');

const hex = h => { const m = String(h || '#000000').replace('#', ''); return [0, 2, 4].map(i => +(parseInt(m.slice(i, i + 2), 16) / 255).toFixed(4)); };
export const RECIPES = ['title3d', 'cube3d', 'cards3d', 'rings3d'];

// ─── ExtendScript (ES3) helpers shared by every recipe ─────────────────────────────────────────
const LIB = `
function P(l, n) { return l.property(n); }
function ease(prop, inf) { inf = inf || 75; for (var k = 1; k <= prop.numKeys; k++) { var t = prop.propertyValueType;
  var n = (t == PropertyValueType.ThreeD_SPATIAL || t == PropertyValueType.TwoD_SPATIAL || t == PropertyValueType.OneD) ? 1 : prop.value.length, a = [];
  for (var i = 0; i < n; i++) a.push(new KeyframeEase(0, inf)); prop.setTemporalEaseAtKey(k, a, a); } }
function keys(prop, list, inf) { for (var i = 0; i < list.length; i++) prop.setValueAtTime(list[i][0], list[i][1]); ease(prop, inf); }
function tf(l, n) { return l.property("ADBE Transform Group").property(n); }
function shadows(l, cast, accept) { var m = l.property("Material Options"); if (cast !== null) m.property("Casts Shadows").setValue(cast ? 1 : 0); if (accept !== null) m.property("Accepts Shadows").setValue(accept ? 1 : 0); }
function extrude(l, depth, bevel) { var g = l.property("Geometry Options"); g.property("Extrusion Depth").setValue(depth);
  if (bevel) { g.property("Bevel Style").setValue(4); g.property("Bevel Depth").setValue(bevel); } }
function rrect(comp, name, w, h, r, col) { var L = comp.layers.addShape(); L.name = name; L.threeDLayer = true;
  var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"), v = g.property("ADBE Vectors Group");
  var rc = v.addProperty("ADBE Vector Shape - Rect"); rc.property("ADBE Vector Rect Size").setValue([w, h]); rc.property("ADBE Vector Rect Roundness").setValue(r);
  v.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(col); return L; }
function ellipse(comp, name, w, h, col, strokeW) { var L = comp.layers.addShape(); L.name = name; L.threeDLayer = true;
  var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"), v = g.property("ADBE Vectors Group");
  v.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([w, h]);
  if (strokeW) { var s = v.addProperty("ADBE Vector Graphic - Stroke"); s.property("ADBE Vector Stroke Color").setValue(col); s.property("ADBE Vector Stroke Width").setValue(strokeW); }
  else v.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(col); return L; }
function text3d(comp, str, size, col, depth, perChar) { var L = comp.layers.addText(str); L.threeDLayer = true; if (perChar) L.threeDPerChar = true;
  var sp = L.property("ADBE Text Properties").property("ADBE Text Document"), d = sp.value; d.resetCharStyle(); d.fontSize = size; d.fillColor = col; d.applyFill = true; d.applyStroke = false;
  try { d.font = "Arial-BoldMT"; } catch (e) {} d.justification = ParagraphJustification.CENTER_JUSTIFY; d.tracking = 10; sp.setValue(d);
  var r = L.sourceRectAtTime(0, false); tf(L, "ADBE Anchor Point").setValue([r.left + r.width / 2, r.top + r.height / 2, 0]);
  if (depth) extrude(L, depth, Math.min(8, depth / 6)); shadows(L, true, null); return L; }
function cascade(L, from, dur, offset) { var A = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
  var pr = A.property("ADBE Text Animator Properties"); pr.addProperty("ADBE Text Position 3D").setValue(offset || [0, -260, -500]);
  pr.addProperty("ADBE Text Rotation").setValue(-90); pr.addProperty("ADBE Text Opacity").setValue(0);
  var sel = A.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  keys(sel.property("ADBE Text Percent Offset"), [[from, 0], [from + dur, 100]], 50); }
function background(comp, c1, c2) { var bg = comp.layers.addSolid(c1, "bg", comp.width, comp.height, 1); bg.moveToEnd();
  var r = bg.property("ADBE Effect Parade").addProperty("ADBE Ramp"); r.property("ADBE Ramp-0001").setValue([comp.width / 2, comp.height * .42]); r.property("ADBE Ramp-0002").setValue(c1);
  r.property("ADBE Ramp-0003").setValue([comp.width * 1.05, comp.height * 1.1]); r.property("ADBE Ramp-0004").setValue(c2); r.property("ADBE Ramp-0005").setValue(2); return bg; }
function floor(comp, col, y) { var f = comp.layers.addSolid(col, "floor", 8000, 8000, 1); f.threeDLayer = true; tf(f, "ADBE Rotate X").setValue(90);
  tf(f, "ADBE Position").setValue([comp.width / 2, y, 1500]); shadows(f, false, true); return f; }
function lights(comp, accent) { var k = comp.layers.addLight("key", [comp.width / 2, comp.height / 2]); k.lightType = LightType.SPOT;
  k.property("Light Options").property("Intensity").setValue(115); k.property("Light Options").property("Cone Angle").setValue(110);
  k.property("Light Options").property("Cone Feather").setValue(80);
  k.property("Light Options").property("Casts Shadows").setValue(1); k.property("Light Options").property("Shadow Darkness").setValue(55);
  k.property("Light Options").property("Shadow Diffusion").setValue(40);
  tf(k, "ADBE Position").setValue([comp.width * .3, -comp.height * .4, -1400]);
  var r = comp.layers.addLight("rim", [comp.width / 2, comp.height / 2]); r.lightType = LightType.POINT; r.property("Light Options").property("Color").setValue(accent);
  r.property("Light Options").property("Intensity").setValue(70); tf(r, "ADBE Position").setValue([comp.width * .85, comp.height * .2, 900]);
  var a = comp.layers.addLight("amb", [comp.width / 2, comp.height / 2]); a.lightType = LightType.AMBIENT; a.property("Light Options").property("Intensity").setValue(32); }
function camera(comp, path, focus) { var c = comp.layers.addCamera("cam", [comp.width / 2, comp.height / 2]); keys(tf(c, "ADBE Position"), path, 60);
  if (focus) { var o = c.property("Camera Options"); try { o.property("Depth of Field").setValue(1); } catch (e) {} try { o.property("Focus Distance").setValue(focus); } catch (e) {} try { o.property("Aperture").setValue(60); } catch (e) {} }
  return c; }
function dust(comp, n, col, spread) { for (var i = 0; i < n; i++) { var s = ellipse(comp, "dust" + i, 10, 10, col); var x = (Math.sin(i * 12.9898) * 43758.5453) % 1, y = (Math.sin(i * 78.233) * 12345.678) % 1, z = (Math.sin(i * 39.425) * 24634.6345) % 1;
  tf(s, "ADBE Position").setValue([comp.width / 2 + x * spread, comp.height / 2 + y * spread * .5, z * spread]); tf(s, "ADBE Opacity").setValue(55);
  tf(s, "ADBE Position").expression = "value + [Math.sin(time*0.6+" + i + ")*30, -time*" + (10 + i % 7 * 4) + ", 0]"; } }
`;

// ─── recipes: (p, W, H, D) → ExtendScript body using LIB; comp is "comp" ───────────────────────────
const R = {
  // extruded title cascading in letter by letter, sub line, orbiting camera, spotlight + shadows, floating dust
  title3d: (p, W, H, D) => `
background(comp, ${JSON.stringify(hex(p.colors.bg2))}, ${JSON.stringify(hex(p.colors.bg))});
floor(comp, ${JSON.stringify(hex(p.colors.bg))}, ${Math.round(H * .74)});
var T = text3d(comp, ${JSON.stringify(p.text || 'TV-HEAD')}, ${Math.round((H > W ? .13 : .16) * H)}, ${JSON.stringify(hex(p.colors.fill))}, 70, true);
tf(T, "ADBE Position").setValue([${W / 2}, ${Math.round(H * .48)}, 0]); cascade(T, 0.15, 1.1);
${p.sub ? `var S = text3d(comp, ${JSON.stringify(p.sub)}, ${Math.round(H * .05)}, ${JSON.stringify(hex(p.colors.accent))}, 18, false); tf(S, "ADBE Position").setValue([${W / 2}, ${Math.round(H * .62)}, -60]);
keys(tf(S, "ADBE Opacity"), [[0.9, 0], [1.5, 100]]); keys(tf(S, "ADBE Position"), [[0.9, [${W / 2}, ${Math.round(H * .66)}, -60]], [1.6, [${W / 2}, ${Math.round(H * .62)}, -60]]]);` : ''}
var bar = rrect(comp, "bar", ${Math.round(W * (H > W ? .7 : .42))}, 14, 7, ${JSON.stringify(hex(p.colors.accent))}); extrude(bar, 14, 3); tf(bar, "ADBE Position").setValue([${W / 2}, ${Math.round(H * .565)}, -20]);
keys(tf(bar, "ADBE Scale"), [[0.6, [0, 100, 100]], [1.3, [100, 100, 100]]]);
dust(comp, 26, ${JSON.stringify(hex(p.colors.accent))}, ${Math.round(Math.max(W, H) * 1.2)});
lights(comp, ${JSON.stringify(hex(p.colors.accent))});
camera(comp, [[0, [${W / 2 - W * .32}, ${H / 2 - H * .2}, -${Math.round(W * 1.05)}]], [${D}, [${W / 2 + W * .22}, ${H / 2 - H * .06}, -${Math.round(W * .78)}]]], ${Math.round(W * .9)});`,

  // the clay cube mascot in real 3D: rounded extruded body, eyes, legs, hops with squash, camera circles it
  cube3d: (p, W, H, D) => `
background(comp, ${JSON.stringify(hex(p.colors.bg2))}, ${JSON.stringify(hex(p.colors.bg))});
var FY = ${Math.round(H * .72)}; floor(comp, ${JSON.stringify(hex(p.colors.bg))}, FY);
var size = ${Math.round(Math.min(W, H) * .24)};
var ctrl = comp.layers.addNull(); ctrl.threeDLayer = true; ctrl.name = "ctrl"; tf(ctrl, "ADBE Position").setValue([${W / 2}, FY - size * .5 - size * .22, 0]);
tf(ctrl, "ADBE Position").expression = "var h=Math.abs(Math.sin(time*Math.PI*1.25)); value - [0, h*" + Math.round(size * .55) + ", 0]";
tf(ctrl, "ADBE Scale").expression = "var h=Math.abs(Math.sin(time*Math.PI*1.25)); var s=h<0.12 ? 1-(0.12-h)*1.6 : 1+h*0.04; [100/Math.sqrt(s), 100*s, 100/Math.sqrt(s)]";
tf(ctrl, "ADBE Rotate Y").expression = "Math.sin(time*0.9)*28";
var body = rrect(comp, "body", size, size, size * .16, ${JSON.stringify(hex(p.color || '#e07b54'))}); extrude(body, size, size * .1); body.parent = ctrl; tf(body, "ADBE Position").setValue([0, 0, size / 2]); shadows(body, true, false);
var eyes = []; for (var i = 0; i < 2; i++) { var e = rrect(comp, "eye" + i, size * .1, size * .2, size * .05, [0.08, 0.05, 0.04]); extrude(e, 6, 0); e.parent = ctrl;
  tf(e, "ADBE Position").setValue([(i ? 1 : -1) * size * .17, -size * .06, -2]);
  tf(e, "ADBE Scale").expression = "var b=(time%3.2)<0.12; [100, b?12:100, 100]"; }
var mouth = rrect(comp, "mouth", size * .16, size * .05, size * .025, [0.25, 0.08, 0.05]); extrude(mouth, 4, 0); mouth.parent = ctrl; tf(mouth, "ADBE Position").setValue([0, size * .14, -2]);
for (var j = 0; j < 4; j++) { var g = rrect(comp, "leg" + j, size * .16, size * .22, size * .06, [0.55, 0.28, 0.18]); extrude(g, size * .16, 4); g.parent = ctrl;
  tf(g, "ADBE Position").setValue([(j % 2 ? 1 : -1) * size * .28, size * .6, (j < 2 ? 1 : -1) * size * .26 + size / 2]); shadows(g, true, false); }
${p.text ? `var T = text3d(comp, ${JSON.stringify(p.text)}, ${Math.round(H * .085)}, ${JSON.stringify(hex(p.colors.fill))}, 40, true); tf(T, "ADBE Position").setValue([${W / 2}, ${Math.round(H * (H > W ? .24 : .2))}, 0]); cascade(T, 0.3, 1.0);` : ''}
dust(comp, 18, ${JSON.stringify(hex(p.colors.fill))}, ${Math.round(Math.max(W, H))});
lights(comp, ${JSON.stringify(hex(p.colors.fill))});
camera(comp, [[0, [${W / 2 - W * .28}, ${H / 2 - H * .1}, -${Math.round(Math.max(W, H) * 1.15)}]], [${D}, [${W / 2 + W * .22}, ${H / 2 - H * .22}, -${Math.round(Math.max(W, H) * 1.02)}]]], ${Math.round(Math.max(W, H) * 1.05)});`,

  // thick 3D cards with words fly past the camera one after another
  cards3d: (p, W, H, D) => { const items = (p.items && p.items.length ? p.items : [p.text || 'ONE', p.sub || 'TWO', 'THREE']).slice(0, 6), n = items.length;
    return `
background(comp, ${JSON.stringify(hex(p.colors.bg2))}, ${JSON.stringify(hex(p.colors.bg))});
var items = ${JSON.stringify(items)}, cols = [${[p.colors.accent, p.colors.fill, p.colors.accent2 || p.colors.accent].map(c => JSON.stringify(hex(c))).join(',')}];
var cw = ${Math.round(W * (H > W ? .62 : .36))}, ch = ${Math.round(H * (H > W ? .18 : .3))};
for (var i = 0; i < items.length; i++) { var z = i * 1300, x = ${W / 2} + (i % 2 ? 1 : -1) * ${Math.round(W * (H > W ? .2 : .29))};   // beside the camera path, never through it
  var c = rrect(comp, "card" + i, cw, ch, 36, cols[i % cols.length]); extrude(c, 40, 8); shadows(c, true, false);
  tf(c, "ADBE Position").setValue([x, ${H / 2}, z]); tf(c, "ADBE Rotate Y").setValue((i % 2 ? -1 : 1) * 14); tf(c, "ADBE Rotate Z").setValue((i % 2 ? 1 : -1) * 3);
  tf(c, "ADBE Rotate Y").expression = "value + Math.sin(time*1.1+" + i + ")*6";
  var fsz = Math.min(${Math.round(H * (H > W ? .055 : .075))}, cw * 0.7 / (items[i].length * 0.74));   // the word always fits its card
  var t = text3d(comp, items[i], Math.round(fsz), ${JSON.stringify(hex(p.colors.ink || '#111111'))}, 0, false); t.parent = c;   // flat label (keep each word in one script: mixed Latin + Cyrillic glyphs break in the C4D renderer)
  tf(t, "ADBE Position").setValue([0, 0, -64]); }   // in front of the extruded face
dust(comp, 30, ${JSON.stringify(hex(p.colors.fill))}, ${Math.round(Math.max(W, H) * 1.5)});
lights(comp, ${JSON.stringify(hex(p.colors.accent))});
var cam = camera(comp, [[0, [${W / 2}, ${H / 2 - 40}, -1700]], [${D}, [${W / 2}, ${H / 2 - 40}, ${Math.round((n - 1) * 1300 - 2100)}]]], 0);
var poi = tf(cam, "ADBE Anchor Point"); keys(poi, [[0, [${W / 2}, ${H / 2}, 0]], [${D}, [${W / 2}, ${H / 2}, ${Math.round((n - 1) * 1300)}]]]);`; },

  // flight through a tunnel of glowing extruded rings, a title waits at the end
  rings3d: (p, W, H, D) => `
background(comp, ${JSON.stringify(hex(p.colors.bg))}, [0, 0, 0]);
var N = 22; for (var i = 0; i < N; i++) { var r = ellipse(comp, "ring" + i, ${Math.round(Math.min(W, H) * .95)}, ${Math.round(Math.min(W, H) * .95)}, i % 2 ? ${JSON.stringify(hex(p.colors.accent))} : ${JSON.stringify(hex(p.colors.fill))}, 26);
  extrude(r, 50, 6); tf(r, "ADBE Position").setValue([${W / 2}, ${H / 2}, i * 420]); tf(r, "ADBE Rotate Z").expression = "time*" + (i % 2 ? 18 : -18); shadows(r, false, false); }
${p.text ? `var T = text3d(comp, ${JSON.stringify(p.text)}, ${Math.round(H * .13)}, ${JSON.stringify(hex(p.colors.fill))}, 50, true); tf(T, "ADBE Position").setValue([${W / 2}, ${H / 2}, N * 420 + 400]); cascade(T, ${Math.max(.5, D - 2.2).toFixed(2)}, 1.0, [0, 0, -900]);` : ''}
var a = comp.layers.addLight("amb", [${W / 2}, ${H / 2}]); a.lightType = LightType.AMBIENT; a.property("Light Options").property("Intensity").setValue(45);
var pl = comp.layers.addLight("head", [${W / 2}, ${H / 2}]); pl.lightType = LightType.POINT; pl.property("Light Options").property("Intensity").setValue(130);
pl.property("Light Options").property("Color").setValue(${JSON.stringify(hex(p.colors.accent))});
keys(tf(pl, "ADBE Position"), [[0, [${W / 2}, ${H / 2 - 200}, 0]], [${D}, [${W / 2}, ${H / 2 - 200}, N * 420]]]);
var cam = camera(comp, [[0, [${W / 2}, ${H / 2}, -900]], [${D}, [${W / 2}, ${H / 2}, N * 420 - 700]]], 0);
keys(tf(cam, "ADBE Anchor Point"), [[0, [${W / 2}, ${H / 2}, 0]], [${D}, [${W / 2}, ${H / 2}, N * 420 + 400]]]);`,
};

function jsx({ recipe, params, W, H, D, fps, aep, quit }) {
  if (!R[recipe]) throw new Error(`unknown ae recipe "${recipe}" (have: ${RECIPES.join(', ')})`);
  return `// generated by tvhead lib/ae.mjs — ${recipe}
(function () {
${LIB}
app.beginSuppressDialogs();
if (app.project && app.project.file !== null && app.project.dirty) { app.endSuppressDialogs(false); return; }   // never discard the user's unsaved work
app.newProject();
var comp = app.project.items.addComp("tvhead", ${W}, ${H}, 1, ${D}, ${fps});
comp.renderer = "ADBE Ernst"; comp.bgColor = ${JSON.stringify(hex(params.colors.bg))};
try {
${R[recipe](params, W, H, D)}
} catch (e) {   // report through a file name (works without the "allow scripts to write files" preference)
  var msg = ("L" + e.line + " " + e.toString()).replace(/[^A-Za-z0-9 ._-]/g, "_").substr(0, 120);
  app.project.save(new File(${JSON.stringify(path.dirname(aep).replace(/\\/g, '/'))} + "/ERR__" + msg + ".aep")); app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); app.endSuppressDialogs(false); ${quit ? 'app.quit();' : ''} return;
}
app.project.save(new File(${JSON.stringify(aep.replace(/\\/g, '/'))}));
app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
app.endSuppressDialogs(false);
${quit ? 'app.quit();' : ''}
})();`;
}

// build + render one clip; returns { dir, frames, mp4 } (cached)
export async function aeClip({ recipe, params = {}, duration, size, fps = 30, cacheDir, log = () => {} }) {
  const AE = findAE(); if (!AE) throw new Error('After Effects is not installed (aerender not found)');
  const [W, H] = size, D = +Math.max(1, duration).toFixed(2);
  const colors = { bg: '#141018', bg2: '#3a2a3e', accent: '#e07b54', fill: '#f6efe2', ink: '#14100c', ...(params.colors || {}) };
  const p = { ...params, colors };
  const key = createHash('sha1').update(JSON.stringify([recipe, p, D, W, H, fps, LIB, R[recipe].toString()])).digest('hex').slice(0, 12);   // recipe code is part of the key
  const dir = path.join(cacheDir, `${recipe}-${key}`), mp4 = path.join(dir, 'clip.mp4');
  const count = () => existsSync(dir) ? readdirSync(dir).filter(f => /^f_\d+\.jpg$/.test(f)).length : 0;
  if (count() > 0) return { dir, frames: count(), mp4, cached: true };
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const aep = path.join(dir, 'scene.aep'), jsxFile = path.join(dir, 'build.jsx');
  const wasRunning = aeRunning();
  writeFileSync(jsxFile, jsx({ recipe, params: p, W, H, D, fps, aep, quit: !wasRunning }));
  log(`ae: building ${recipe} (${D}s ${W}×${H}) in ${AE.version}…`);
  spawn(AE.afterfx, ['-r', jsxFile], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
  const t0 = Date.now();
  while (!existsSync(aep)) {
    const err = readdirSync(dir).find(f => f.startsWith('ERR__'));
    if (err) throw new Error(`After Effects script error in ${recipe}: ${err.slice(5, -4).replace(/_/g, ' ')}`);
    if (Date.now() - t0 > 240000) throw new Error(`After Effects did not build the scene in 4 min (an unsaved project open in AE blocks it; save or close it). Script: ${jsxFile}`);
    await new Promise(r => setTimeout(r, 1000));
  }
  let last = -1; while (true) { const s = statSync(aep).size; if (s === last && s > 0) break; last = s; await new Promise(r => setTimeout(r, 800)); }   // file fully written
  log(`ae: rendering with aerender…`);
  const r = spawnSync(AE.aerender, ['-project', aep, '-comp', 'tvhead', '-output', mp4], { encoding: 'latin1', maxBuffer: 1 << 26 });
  if (!existsSync(mp4)) throw new Error(`aerender failed (exit ${r.status}): ${String(r.stdout || '').split(/\r?\n/).filter(l => /ERROR|error/.test(l)).slice(-3).join(' | ') || 'no output file'}`);
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', mp4, '-q:v', '2', path.join(dir, 'f_%05d.jpg')]);
  log(`ae: ${recipe} ready — ${count()} frames (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  return { dir, frames: count(), mp4, cached: false };
}
