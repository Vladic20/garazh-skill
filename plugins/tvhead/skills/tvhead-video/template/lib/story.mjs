// story.json → timeline (absolute seconds) for ONE language. Pure function of the story + voice clip metadata.
// See references/story-api.md for the full schema; this file is the source of truth for defaults.

export const GROUND = 615;
export const LANGS = ['en', 'ru'];
const STANDING = new Set(['tv', 'tvpile', 'feed', 'door', 'stairs', 'house', 'crowd', 'bed', 'laptop', 'money', 'spotlight', 'grid']);

// ─── formats ───────────────────────────────────────────────────────────────────
// World size per format (rendered ×1.5: 1920×1080 or 1080×1920). Stories are written in 16:9 world coordinates by default;
// in 9:16 those numbers are mapped (x squeezed toward the centre, y stretched so the ground stays the ground) unless the
// value is format-keyed — { "16:9": 470, "9:16": 250 } — or the story says "remap": false (numbers are already portrait).
export const FORMATS = {
  '16:9': { id: '16:9', w: 1280, h: 720, ground: 615, out: [1920, 1080] },
  '9:16': { id: '9:16', w: 720, h: 1280, ground: 940, out: [1080, 1920] },
};
const FORMAT_ALIAS = { landscape: '16:9', horizontal: '16:9', wide: '16:9', portrait: '9:16', vertical: '9:16', shorts: '9:16', reels: '9:16' };
export function resolveFormat(f) {
  if (f == null || f === '') return FORMATS['16:9'];
  const id = FORMAT_ALIAS[String(f).toLowerCase()] || String(f).replace(/x/i, ':');
  if (!FORMATS[id]) throw new Error(`unknown format "${f}" (have: ${Object.keys(FORMATS).join(', ')})`);
  return FORMATS[id];
}
const isFmtObj = v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length && Object.keys(v).every(k => k in FORMATS);
// resolve every format-keyed value to this format's entry (falls back to the 16:9 one)
function pickFormat(v, F) {
  if (isFmtObj(v)) return pickFormat(v[F.id] !== undefined ? v[F.id] : v['16:9'], F);
  if (Array.isArray(v)) return v.map(x => pickFormat(x, F));
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = pickFormat(v[k], F); return o; }
  return v;
}
// geometry of one format: centre, default heights, 16:9 → this-world mapping
function geo(F, remap) {
  const port = F.id === '9:16', G = F.ground, cx = F.w / 2;
  const kx = F.w / 1280, ky = G / GROUND;
  const on = port && remap !== false;
  return { F, port, G, cx, W: F.w, H: F.h, on,
    mx: x => on && typeof x === 'number' ? r3(cx + (x - 640) * kx) : x,
    my: y => on && typeof y === 'number' ? r3(y * ky) : y,
    propY: port ? { tvpile: F.h + 70, crowd: G, spotlight: G, tv: G - 60, money: G - 14, words: 600, counter: 560, grid: G - 20 }
                : { tvpile: 790, crowd: G, spotlight: G, tv: G - 60, money: G - 14, words: 330, counter: 330, grid: G - 20 },
    floatY: port ? 460 : 300, charScale: port ? 1.2 : 1 };   // 9:16: figures a bit bigger in the tall frame
}
const pt = (g, p) => Array.isArray(p) ? [g.mx(p[0]), g.my(p[1]), ...p.slice(2)] : p;
// map one raw cast/prop/change entry's coordinates into this world. A format-keyed value is taken as-is (already native).
function adaptRaw(raw, g) {
  if (!raw || typeof raw !== 'object') return raw;
  const o = {}, nat = k => isFmtObj(raw[k]);
  for (const k in raw) o[k] = k === 'then' && Array.isArray(raw.then) ? raw.then.map(c => adaptRaw(c, g)) : pickFormat(raw[k], g.F);
  const fix = (k, f) => { if (o[k] !== undefined && !nat(k)) o[k] = f(o[k]); };
  fix('x', g.mx); fix('y', g.my); fix('from', p => pt(g, p)); fix('to', p => pt(g, p));
  if (g.port) portraitFit(o, raw, g);
  return o;
}
// props whose 16:9 size cannot fit 720 px wide get re-laid (only when their size was not given per format)
function portraitFit(o, raw, g) {
  const maxW = g.W - 100, plain = k => !isFmtObj(raw[k]);
  if (o.type === 'words' && plain('maxWidth')) o.maxWidth = Math.min(+pickFormat(raw.maxWidth, g.F) || maxW, maxW);
  for (const k of ['w', 'width']) if (['timeline', 'progress', 'chart', 'bars', 'crowd'].includes(o.type) && o[k] > maxW && plain(k)) o[k] = maxW;
  if (o.type === 'grid' && g.on && plain('cols') && plain('rows')) {
    let rows = o.rows || 3, cols = o.cols || 7, odd = o.odd;
    if (cols > rows) {   // transpose: 3×7 → 7×3, keep the odd one in the same (transposed) cell
      if (Number.isInteger(odd)) odd = (odd % cols) * rows + Math.floor(odd / cols);
      [rows, cols] = [cols, rows];
    }
    const cell = Math.min(o.cell || 120, (g.W - 60) / cols, 760 / (rows * .95));
    Object.assign(o, { rows, cols, cell: r3(cell), odd });
    if (plain('y')) o.y = r3(560 + (rows - 1) * cell * .95 / 2 + cell * .45);   // block centred around y≈560
    if (plain('x')) o.x = g.cx;
  }
}

// ─── themes (pick with "theme": "<name>" or { "preset": "<name>", …overrides }) ───────────────
export const THEMES = {
  paper:     { label: 'Grey paper (default)', paper: '#c6ccd0', paperLight: '#d3d8db', paperDark: '#9fa6aa', ink: '#141414', bezel: '#585858', screen: '#e9ebeb', fill: '#f1f2f1', accent: '#141414', dark: '#2c3134', halo: '#aab0b4', muted: '#7d8387' },
  sepia:     { label: 'Old sepia', paper: '#d8c9a8', paperLight: '#e6dbc1', paperDark: '#a8946c', ink: '#2b1d10', bezel: '#6b5638', screen: '#efe4cc', fill: '#f4ecd8', accent: '#8a2b17', dark: '#2a1d10', halo: '#b9a57e', muted: '#7a6a4f' },
  blueprint: { label: 'Blueprint', paper: '#1f4f8a', paperLight: '#2a62a6', paperDark: '#123461', ink: '#eaf2ff', bezel: '#3f6fae', screen: '#163c6b', fill: '#1b4479', accent: '#ffd166', dark: '#0b1d36', halo: '#2d5d99', muted: '#9fb7d8', texture: .1 },
  chalk:     { label: 'Chalkboard', paper: '#2f3b36', paperLight: '#3a4842', paperDark: '#1d2522', ink: '#eeeae0', bezel: '#55625c', screen: '#26302c', fill: '#2a3531', accent: '#f2c94c', dark: '#111614', halo: '#45534d', muted: '#9aa59f', texture: .12 },
  night:     { label: 'Night ink', paper: '#17191b', paperLight: '#232629', paperDark: '#0b0c0d', ink: '#e8e8e4', bezel: '#4a4d50', screen: '#2b2e31', fill: '#202326', accent: '#e8e8e4', dark: '#000000', halo: '#34383b', muted: '#8a8f93', texture: .1 },
  garage:    { label: 'Warm garage (cartoon)', paper: '#5a4a3a', paperLight: '#6e5b47', paperDark: '#3a2e23', ink: '#2a1c14', bezel: '#c8693a', screen: '#f6ecd2', fill: '#fbf3e1', accent: '#ffc93a', dark: '#0d0805', halo: '#2a1c14', muted: '#d8c7a5', texture: .05 },
  mint:      { label: 'Mint notebook', paper: '#cfe3d8', paperLight: '#e0efe7', paperDark: '#9fbcad', ink: '#14231c', bezel: '#4f6a5d', screen: '#eef6f1', fill: '#f3faf6', accent: '#e4572e', dark: '#15261e', halo: '#a9c6b7', muted: '#6c8478' },
};
export function resolveTheme(th, look) {
  if (!th) return { ...THEMES[look === 'cartoon' ? 'garage' : 'paper'] };
  if (typeof th === 'string') { if (!THEMES[th]) throw new Error(`unknown theme "${th}" (have: ${Object.keys(THEMES).join(', ')})`); return { ...THEMES[th] }; }
  return { ...THEMES[th.preset || (look === 'cartoon' ? 'garage' : 'paper')], ...th };
}

// ─── looks: "look": "doodle" (default: B&W pencil, boiling lines) | "cartoon" (warm flat colour, thick outlines, karaoke captions) ──
export const LOOKS = {
  doodle:  { label: 'Doodle — pencil on paper', theme: 'paper', captions: false, music: null },
  cartoon: { label: 'Cartoon — warm garage', theme: 'garage', captions: true, music: 'lofi' },
};
export function resolveLook(v) {
  const id = v || 'doodle';
  if (!LOOKS[id]) throw new Error(`unknown look "${v}" (have: ${Object.keys(LOOKS).join(', ')})`);
  return id;
}

// ─── languages ─────────────────────────────────────────────────────────────────
// Any string in the story may be { "en": "...", "ru": "..." }; localize() picks one language (falls back to en, then the first value).
const isLangObj = v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length && Object.keys(v).every(k => LANGS.includes(k));
export function localize(v, lang) {
  if (isLangObj(v)) return v[lang] ?? v.en ?? Object.values(v)[0];
  if (Array.isArray(v)) return v.map(x => localize(x, lang));
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = localize(v[k], lang); return o; }
  return v;
}
export function storyLanguages(story) {
  if (Array.isArray(story.languages) && story.languages.length) return story.languages.filter(l => LANGS.includes(l));
  const found = new Set();
  for (const s of story.scenes || []) if (isLangObj(s.say)) Object.keys(s.say).forEach(l => found.add(l));
  return found.size ? LANGS.filter(l => found.has(l)) : ['en'];
}

export const spokenText = s => String(s || '').replace(/\[[^\]]*\]/g, ' ').replace(/\([a-z ]+\)/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export const spokenWords = s => spokenText(s).split(' ').filter(Boolean);
export const normWord = w => String(w).toLowerCase().replace(/ё/g, 'е').replace(/[’']/g, "'").replace(/[^\p{L}\p{N}']/gu, '');
export const syllables = w => Math.max(1, (normWord(w).replace(/e$/, '').match(/[aeiouyаеиоуыэюя]+/g) || []).length);
const r3 = x => Math.round(x * 1000) / 1000;
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 1000003; return h; };

// estimated clip (no API key): ~0.19 s per syllable (+ per-word and punctuation cost), words spread by syllables
export function estimateClip(text, lang = 'en') {
  const words = spokenWords(text), syl = words.map(syllables), total = syl.reduce((a, b) => a + b, 0) || 1;
  const punct = words.filter(w => /[,.;:!?—…]$/.test(w)).length;
  const dur = r3(.25 + total * (lang === 'ru' ? .165 : .19) + words.length * .03 + punct * .18);
  let acc = 0;
  const wt = words.map((w, i) => { const t = r3(.05 + (dur - .3) * acc / total); acc += syl[i]; return [w, t]; });
  return { dur, lead: 0, words: wt, speech: [[0, dur]], placeholder: true };
}

// ─── camera ────────────────────────────────────────────────────────────────────
const CAM = {
  push: [[640, 360, 1], [640, 360, 1.07]], pull: [[640, 360, 1.08], [640, 360, 1]], still: [[640, 360, 1], [640, 360, 1]],
  'pan-left': [[700, 360, 1.08], [580, 360, 1.08]], 'pan-right': [[580, 360, 1.08], [700, 360, 1.08]],
  up: [[640, 430, 1.08], [640, 320, 1.08]], down: [[640, 320, 1.08], [640, 430, 1.08]],
  'push-fast': [[640, 360, 1], [640, 360, 1.18]], drift: [[620, 368, 1.04], [660, 352, 1.06]],
};
// 9:16: same moves around (360, 640); pans/tilts zoom a little more so the travel stays inside the narrow frame
const CAM_P = {
  push: [[360, 640, 1], [360, 640, 1.07]], pull: [[360, 640, 1.08], [360, 640, 1]], still: [[360, 640, 1], [360, 640, 1]],
  'pan-left': [[392, 640, 1.1], [328, 640, 1.1]], 'pan-right': [[328, 640, 1.1], [392, 640, 1.1]],
  up: [[360, 706, 1.12], [360, 574, 1.12]], down: [[360, 574, 1.12], [360, 706, 1.12]],
  'push-fast': [[360, 640, 1], [360, 640, 1.18]], drift: [[350, 648, 1.04], [370, 632, 1.06]],
};
// keep the view inside the world: centre within [W/2z, W − W/2z] (no clamping in 16:9, whose presets predate it)
function clampCam(p, g) {
  if (!g.port || !Array.isArray(p)) return p;
  const z = Math.max(1, p[2] ?? 1), cl = (v, a, b) => Math.min(b, Math.max(a, v));
  return [r3(cl(p[0], g.W / 2 / z, g.W - g.W / 2 / z)), r3(cl(p[1], g.H / 2 / z, g.H - g.H / 2 / z)), p[2] ?? 1];
}
function resolveCam(c, g) {
  if (isFmtObj(c)) return resolveCam(pickFormat(c, g.F), { ...g, mx: x => x, my: y => y });   // per-format cam = native values
  const P = g.port ? CAM_P : CAM, nat = k => isFmtObj(c[k]);
  if (!c) return { from: P.push[0], to: P.push[1] };
  if (typeof c === 'string') { const p = P[c]; if (!p) throw new Error(`unknown cam "${c}" (have: ${Object.keys(CAM).join(', ')})`); return { from: p[0], to: p[1] }; }
  const v = k => nat(k) ? pickFormat(c[k], g.F) : pt(g, pickFormat(c[k], g.F));
  if (c.from && c.to) return { from: clampCam(v('from'), g), to: clampCam(v('to'), g), ease: c.ease };
  if (c.focus) { const z = pickFormat(c.zoom, g.F) || 1.4, [x, y] = v('focus'); const cl = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    const fx = cl(x, g.W / 2 / z, g.W - g.W / 2 / z), fy = cl(y, g.H / 2 / z, g.H - g.H / 2 / z);
    if (c.from) return { from: clampCam(v('from'), g), to: [fx, fy, z] };   // travel from a wide shot onto the subject
    return c.push === false ? { from: [fx, fy, z], to: [fx, fy, z] } : { from: [fx, fy, z * .96], to: [fx, fy, z * 1.03] }; }
  throw new Error(`bad cam ${JSON.stringify(c)}`);
}

// ─── transitions (INTO a scene). Timings follow the velocity-matched seam idea from HyperFrames' cut-the-curve:
//     exit accelerates, the cut lands mid-motion, entry continues in the same direction and decelerates. ───
export const TRANSITIONS = {
  none:  { dOut: 0, dIn: 0 },        // same picture continues (default for keep:true)
  cut:   { dOut: 0, dIn: .1 },       // hard cut + projector flash + paper flip sound
  curve: { dOut: .3, dIn: .38 },     // cut-the-curve: ~12% partial travel in the film's direction
  zoom:  { dOut: .2, dIn: .5 },      // zoom-through: everything grows (deeper into the same thought)
  pull:  { dOut: .2, dIn: .55 },     // inverse zoom: everything shrinks (arrival / payoff)
  whip:  { dOut: .16, dIn: .26 },    // whip pan with horizontal smear
  iris:  { dOut: .38, dIn: .45 },    // old-cartoon iris: ink circle closes, then opens on the new scene
  wipe:  { dOut: 0, dIn: .55 },      // pencil-hatched edge sweeps the new scene in
  page:  { dOut: 0, dIn: .6 },       // new sheet of paper slides over the old one
  fade:  { dOut: .3, dIn: .35 },     // dip to paper (use for chapter breaks only)
};
function resolveTransition(raw, story, i, keep, g) {
  if (i === 0) return { type: 'none', dOut: 0, dIn: 0 };
  let tr = raw.transition ?? (keep ? 'none' : story.transition ?? 'curve');
  if (typeof tr === 'string') tr = { type: tr };
  const base = TRANSITIONS[tr.type];
  if (!base) throw new Error(`scene ${i + 1}: unknown transition "${tr.type}" (have: ${Object.keys(TRANSITIONS).join(', ')})`);
  const out = { ...base, dir: story.direction || 'left', ...tr };
  for (const k of ['at', 'from']) if (tr[k]) out[k] = isFmtObj(tr[k]) ? pickFormat(tr[k], g.F) : pt(g, tr[k]);
  return out;
}

function layoutItems(sc, g) {
  const L = sc.layout; if (!L) return [];
  const n = sc.count || 4;
  if (g.port) return layoutPortrait(L, n, sc, g);
  if (L === 'solo') return [{ char: true, id: 'hero', x: 640 }];
  if (L === 'duo') return [{ char: true, id: 'a', x: 450 }, { char: true, id: 'b', x: 830, flip: true }];
  if (L === 'lineup') {
    const sp = Math.min(270, 1040 / Math.max(1, n - 1));
    return Array.from({ length: n }, (_, i) => ({ char: true, id: `p${i + 1}`, x: 640 + (i - (n - 1) / 2) * sp, pose: i % 2 ? 'raise' : 'idle', face: 'happy', delay: i * .12, scale: n > 5 ? .8 : 1 }));
  }
  if (L === 'crowd') return [{ type: 'crowd', id: 'crowd', x: 640, y: GROUND + 40, rows: 3, cols: 9, enter: 'fade' }, ...(sc.hero === false ? [] : [{ char: true, id: 'hero', x: 640, scale: 1 }])];
  if (L === 'pile') return [
    { type: 'feed', id: 'feed', x: 640, y: 140, height: 1000, enter: 'none' },
    { type: 'tvpile', id: 'pile', x: 640, y: 800, width: 980, height: 380, enter: 'none' },
    { char: true, id: 'hero', kind: 'mask', x: 640, y: 482, scale: 1, pose: 'up', arms: 'coil', face: 'neutral', enter: 'none' },
  ];
  if (L === 'title') return [{ type: 'words', id: 'title', x: 640, y: 330, size: 92 }];
  throw new Error(`unknown layout "${L}" (have: solo, duo, lineup, crowd, pile, title)`);
}
// the same layouts re-laid for the 720×1280 world: figures smaller and closer, the pile taller, type narrower
function layoutPortrait(L, n, sc, g) {
  const { cx, G, H } = g;
  if (L === 'solo') return [{ char: true, id: 'hero', x: cx }];
  if (L === 'duo') return [{ char: true, id: 'a', x: cx - 165 }, { char: true, id: 'b', x: cx + 165, flip: true }];
  if (L === 'lineup') {
    const sp = Math.min(190, 560 / Math.max(1, n - 1)), scale = n > 4 ? .66 : n > 2 ? .8 : 1;
    return Array.from({ length: n }, (_, i) => ({ char: true, id: `p${i + 1}`, x: r3(cx + (i - (n - 1) / 2) * sp), pose: i % 2 ? 'raise' : 'idle', face: 'happy', delay: i * .12, scale }));
  }
  if (L === 'crowd') return [{ type: 'crowd', id: 'crowd', x: cx, y: G - 10, rows: 3, cols: 6, width: g.W + 40, enter: 'fade' }, ...(sc.hero === false ? [] : [{ char: true, id: 'hero', x: cx }])];
  if (L === 'pile') {
    const py = H + 70, ph = 560, hy = r3(py - ph * .83);
    return [
      { type: 'feed', id: 'feed', x: cx, y: r3(hy - 342), height: 1200, enter: 'none' },
      { type: 'tvpile', id: 'pile', x: cx, y: py, width: g.W + 40, height: ph, enter: 'none' },
      { char: true, id: 'hero', kind: 'mask', x: cx, y: hy, scale: 1, pose: 'up', arms: 'coil', face: 'neutral', enter: 'none' },
    ];
  }
  if (L === 'title') return [{ type: 'words', id: 'title', x: cx, y: 600, size: 80, maxWidth: g.W - 100 }];
  throw new Error(`unknown layout "${L}" (have: solo, duo, lineup, crowd, pile, title)`);
}

// cue → absolute time. on: "word" | "word#2" (Nth occurrence), at: 0..1 fraction of the scene, delay: seconds after scene start
function cueTime(c, sc, def) {
  if (c.on != null && c.on !== '') {
    const [wRaw, nRaw] = String(c.on).split('#'), want = normWord(wRaw), nth = Math.max(1, +nRaw || 1);
    const hits = sc.words.filter(([w]) => normWord(w) === want || (want.length >= 4 && normWord(w).startsWith(want)));
    if (hits.length >= nth) return hits[nth - 1][1];
    console.warn(`story: scene ${sc.index + 1} [${sc.lang}]: cue word "${c.on}" not found in «${spokenText(sc.say)}» — using ${c.at != null ? 'at' : 'scene start'}`);
  }
  if (c.at != null) return sc.from + Math.min(1, Math.max(0, c.at)) * (sc.to - sc.from);
  if (c.delay != null) return sc.from + c.delay;
  return def;
}

// kinetic words: match the prop's text to the spoken words (so each word lands when it is said)
function wordTimes(text, sc) {
  const ws = spokenWords(text);
  if (!ws.length) return [];
  const spoken = sc.words, out = new Array(ws.length).fill(null);
  let j = 0;
  ws.forEach((w, i) => { const n = normWord(w); for (let k = j; k < spoken.length; k++) if (normWord(spoken[k][0]) === n) { out[i] = spoken[k][1]; j = k + 1; break; } });
  const a0 = spoken.length ? spoken[0][1] : sc.from + .2, a1 = spoken.length ? spoken[spoken.length - 1][1] + .3 : sc.to - .3;
  for (let i = 0; i < ws.length; i++) if (out[i] == null) {
    let a = i - 1; while (a >= 0 && out[a] == null) a--;
    let b = i + 1; while (b < ws.length && out[b] == null) b++;
    const ta = a >= 0 ? out[a] : a0, tb = b < ws.length ? out[b] : a1;
    out[i] = ta + (tb - ta) * (i - a) / (b - a);
  }
  return ws.map((w, i) => [w, r3(out[i])]);
}

// ─── cast: story-level character designs ("characters": { "<id>": { head, body, hat, … } }) ─────────────
// A cast entry inherits the design of characters[entry.as || entry.id]; "*" is the default look for everyone else.
// name / desc / voice / ref are notes for the storyboard (not drawn).
const LOOK_SKIP = new Set(['name', 'desc', 'ref', 'refs', 'voice', 'role']);
export function lookOf(story, id, as) {
  const C = story.characters || {}, src = C[as || id] || (id && C[id]) || C['*'] || {};
  const o = {}; for (const k in src) if (!LOOK_SKIP.has(k)) o[k] = src[k];
  return o;
}
// sets: "set": "city" | { "type": "city", "night": true, … }; weather: "rain" | "snow" | "leaves" | "wind" | { "type": "rain", "amount": 1.5 }
const normSet = v => v == null || v === false ? null : typeof v === 'string' ? { type: v } : v;

function finalState(it) {   // apply all changes → base for an inherited (keep:true) item
  const s = { ...it }; for (const c of it.then || []) for (const k in c) if (k !== 't' && k !== 'dur') s[k] = c[k];
  delete s.then; return s;
}

// timed lists inside "screen" props (chat messages, app steps, terminal lines): each entry's on|at|delay → absolute t
const TIMED = ['chat', 'steps', 'lines'];
function resolveTimed(list, sc) {
  const cued = c => c && typeof c === 'object' && (c.on != null || c.at != null || c.delay != null);
  return list.map(m => {
    if (!m || typeof m !== 'object') return m;
    const o = { ...m };
    if (cued(m)) o.t = r3(cueTime(m, sc, sc.from));
    if (cued(m.click)) o.click = r3(cueTime(m.click, sc, sc.from));
    return o;
  });
}
const META = new Set(['on', 'at', 'delay', 'then', 'char', 'type', 'out', 'outOn', 'outAt', 'note', 'as', 'name', 'desc', 'ref', 'refs', 'role']);
function makeItem(raw, sc, idx, ctx, g) {
  const isChar = raw.char || raw.kind || (!raw.type && raw.face !== undefined) || raw.type === 'char';
  const it = { el: isChar ? 'char' : 'prop' };
  for (const k in raw) if (!META.has(k) || (k === 'role' && !isChar)) it[k] = raw[k];   // a prop's role is drawn (badge)
  if (isChar) {
    Object.assign(it, { kind: raw.kind || 'tv', face: raw.face || 'happy', pose: raw.pose || 'idle', y: raw.y ?? g.G, scale: raw.scale ?? g.charScale });
  } else {
    it.type = raw.type;
    it.y = raw.y ?? g.propY[raw.type] ?? (STANDING.has(raw.type) ? g.G : g.floatY);
    it.x = raw.x ?? g.cx; it.scale = raw.scale ?? 1;
    if (raw.type === 'text' && !raw.enter) it.enter = 'write';
    if (raw.type === 'words') { it.words = wordTimes(raw.text ?? sc.say, sc); it.enter = raw.enter || 'none'; }
    if (raw.type === 'photo' && raw.src && !/^(https?:|data:)/.test(raw.src)) it.src = ctx.assetBase + raw.src.replace(/\\/g, '/');
  }
  it.x = it.x ?? g.cx;
  it.id = raw.id || `${raw.type || 'char'}${idx}`;   // idx = per-type counter
  it.seed = hash(`${it.id}:${sc.index}`) + 1;
  const firstWord = sc.words.length ? sc.words[0][1] : sc.from;
  it.t0 = r3(raw.type === 'words' && raw.on == null && raw.at == null && raw.delay == null ? Math.min(firstWord, (it.words[0] || [0, firstWord])[1]) - .05 : cueTime(raw, sc, sc.from + (raw.enter === 'none' ? 0 : .02)));
  if (raw.out != null || raw.outOn != null || raw.outAt != null) it.out = r3(cueTime({ on: raw.outOn, at: raw.outAt, delay: raw.out }, sc, sc.to));
  for (const key of TIMED) if (Array.isArray(raw[key])) it[key] = resolveTimed(raw[key], sc);   // timed lists inside screens
  it.then = (raw.then || []).map(c => { const o = { t: r3(cueTime(c, sc, sc.from)) }; for (const k in c) if (!['on', 'at', 'delay'].includes(k)) o[k] = c[k]; return o; }).sort((a, b) => a.t - b.t);
  return it;
}

// story = already localized to `lang`; clips[i] = { dur, lead, words:[[w, tRel]], speech:[[a,b]], file?, silent? }
// ctx = { lang, assetBase (episode dir relative to engine/, with trailing slash), format? (overrides story.format) }
export function buildTimeline(story0, clips, ctx = { lang: 'en', assetBase: '' }) {
  if (!Array.isArray(story0.scenes) || !story0.scenes.length) throw new Error('story.json: "scenes" must be a non-empty array');
  const F = resolveFormat(ctx.format || story0.format), g = geo(F, story0.remap), look = resolveLook(story0.look);
  // scene fields other than coordinates just pick their format's value; cast/props/change/cam/transition are mapped into the world
  const SPECIAL = new Set(['cast', 'props', 'change', 'cam', 'transition']);
  const story = { ...pickFormat({ ...story0, scenes: undefined }, F), scenes: story0.scenes.map(s => {
    const o = {}; for (const k in s) o[k] = SPECIAL.has(k) ? s[k] : pickFormat(s[k], F);
    for (const k of ['cast', 'props', 'change']) if (Array.isArray(s[k])) o[k] = s[k].map(c => adaptRaw(c, g));
    return o;
  }) };
  const pace = story.pace ?? 1, scenes = [], subs = [], talk = [], voice = [];
  const capWords = g.port ? 5 : 6, capChars = g.port ? 28 : 38;
  let cursor = 0;
  story.scenes.forEach((raw, i) => {
    const clip = clips[i];
    const keep = !!(raw.keep && scenes.length);
    const transition = resolveTransition(raw, story, i, keep, g);
    const lead = i === 0 ? .55 : (raw.lead ?? Math.max(.12, transition.dIn * .6));
    const from = r3(cursor);
    const vStart = r3(from + lead);
    const speechEnd = clip ? clip.dur : 0;
    const nextTr = story.scenes[i + 1] ? resolveTransition(story.scenes[i + 1], story, i + 1, !!story.scenes[i + 1].keep, g) : null;
    const gap = Math.max((raw.pause ?? story.pause ?? .38) * pace, nextTr ? nextTr.dOut + .08 : 0);   // exit motion happens after the line ends
    let to = r3(Math.max(from + (raw.minDur ?? 1.4), clip ? vStart + speechEnd + gap : from + (raw.dur ?? 2.2)) + (raw.hold ?? 0));
    if (i === story.scenes.length - 1) to = r3(to + (story.outro ?? 1.4));
    const words = clip ? clip.words.map(([w, t]) => [w, r3(vStart + t)]) : [];
    const sc = { index: i, from, to, say: raw.say, words, lang: ctx.lang };
    if (clip && !clip.silent) voice.push({ scene: i, start: r3(vStart - (clip.lead || 0)), file: clip.file || null, dur: clip.dur });

    // items: inherited (keep) + layout + explicit cast/props
    let items = [];
    if (keep) {
      const prev = scenes[scenes.length - 1];
      items = prev.items.filter(it => it.out == null || it.out >= prev.to).map(it => ({ ...finalState(it), t0: from, enter: 'none', out: undefined }));
      const drop = new Set(raw.remove || []); items = items.filter(it => !drop.has(it.id));
    }
    const lay = layoutItems(raw, g);
    const look = o => o.char || o.kind || o.head || (!o.type && o.face !== undefined) ? { ...lookOf(story, o.id, o.as), ...o } : o;
    const raws = [...lay.map(o => look({ ...o, ...(raw.cast || []).find(c => c.id === o.id), ...(raw.props || []).find(c => c.id === o.id) })),
      ...(raw.cast || []).filter(c => !lay.some(o => o.id === c.id)).map(c => look({ char: true, ...c })),
      ...(raw.props || []).filter(c => !lay.some(o => o.id === c.id))];
    const perType = {};
    raws.forEach(r => {
      const ty = r.type || 'char'; perType[ty] = (perType[ty] || 0) + 1;
      const it = makeItem(r, sc, perType[ty], ctx, g);
      const ex = items.findIndex(x => x.id === it.id);
      if (ex >= 0) items[ex] = it; else items.push(it);
    });
    for (const ch of raw.change || []) {   // timed changes for inherited items: { id, on|at|delay, …fields }
      const it = items.find(x => x.id === ch.id);
      if (!it) { console.warn(`story: scene ${i + 1}: change for unknown id "${ch.id}"`); continue; }
      const o = { t: r3(cueTime(ch, sc, from)) }; for (const k in ch) if (!['id', 'on', 'at', 'delay'].includes(k)) o[k] = ch[k];
      for (const key of TIMED) {   // addChat / addSteps / addLines: append entries (cued in this scene) to the item's list
        const addKey = 'add' + key[0].toUpperCase() + key.slice(1);
        if (Array.isArray(ch[addKey])) { const base = [...(it.then || [])].reverse().find(c => Array.isArray(c[key]))?.[key] || it[key] || []; o[key] = [...base, ...resolveTimed(ch[addKey], sc)]; delete o[addKey]; }
        else if (Array.isArray(ch[key])) o[key] = resolveTimed(ch[key], sc);
      }
      it.then = [...(it.then || []), o].sort((a, b) => a.t - b.t);
    }
    const speaker = raw.speaker && items.find(it => it.id === raw.speaker);
    if (speaker && clip) for (const [a, b] of clip.speech) talk.push([r3(vStart + a), r3(vStart + b), speaker.id]);

    const prevSc = keep ? scenes[scenes.length - 1] : null;
    scenes.push({ from, to, cam: resolveCam(raw.cam, g), transition, ground: raw.ground ?? prevSc?.ground ?? (raw.layout === 'pile' || raw.layout === 'title' ? false : true),
      particles: raw.particles ?? prevSc?.particles ?? story.particles ?? 1, dark: raw.dark ?? prevSc?.dark ?? false,
      set: normSet(raw.set !== undefined ? raw.set : prevSc ? prevSc.set : story.set), weather: normSet(raw.weather !== undefined ? raw.weather : prevSc ? prevSc.weather : story.weather), items });
    // captions: phrases of ≤ 6 words / ≤ 38 chars (9:16: ≤ 5 / ≤ 28), broken after punctuation
    let cur = [];
    const flush = end => { if (!cur.length) return; subs.push({ from: cur[0][1], to: end, words: cur }); cur = []; };
    words.forEach(([w, t], k) => {
      if (cur.length && (cur.length >= capWords || [...cur.map(x => x[0]), w].join(' ').length > capChars)) flush(t);
      cur.push([w, t]);
      if (/[.!?;:…]$/.test(w) && k < words.length - 1) flush(words[k + 1][1]);
    });
    flush(Math.min(to, (words.length ? vStart + speechEnd + .35 : to)));
    cursor = to;
  });
  for (let k = 0; k < subs.length - 1; k++) subs[k].to = r3(Math.min(subs[k].to, subs[k + 1].from));
  const scripts = (story.scripts || []).map(s => ctx.assetBase + String(s).replace(/\\/g, '/'));
  return { lang: ctx.lang, format: F.id, world: { w: F.w, h: F.h, ground: F.ground }, duration: r3(cursor), look, captions: !!(story.captions ?? LOOKS[look].captions), theme: resolveTheme(story.theme, look), scripts, scenes, subs, talk, voice };
}

// SubRip file from caption phrases
export function toSrt(subs) {
  const ts = s => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  return subs.map((s, i) => `${i + 1}\n${ts(s.from)} --> ${ts(s.to)}\n${s.words.map(w => w[0]).join(' ')}\n`).join('\n');
}
