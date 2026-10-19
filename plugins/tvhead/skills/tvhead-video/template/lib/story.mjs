// story.json → timeline (absolute seconds). Pure function of the story + voice clip metadata.
// See references/story-api.md for the full schema; this file is the source of truth for defaults.

export const GROUND = 615;
const STANDING = new Set(['tv', 'tvpile', 'feed', 'door', 'stairs', 'house', 'crowd', 'bed', 'laptop', 'money', 'spotlight']);
const PROP_Y = { tvpile: 790, crowd: GROUND, spotlight: GROUND, tv: GROUND - 60, money: GROUND - 14 };

export const spokenText = s => String(s || '').replace(/\[[^\]]*\]/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export const spokenWords = s => spokenText(s).split(' ').filter(Boolean);
export const normWord = w => w.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']/g, '');
export const syllables = w => Math.max(1, (normWord(w).replace(/e$/, '').match(/[aeiouy]+/g) || []).length);
const r3 = x => Math.round(x * 1000) / 1000;
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 1000003; return h; };

// estimated clip (no API key): ~0.19 s per syllable + small per-word cost, words spread by syllables
export function estimateClip(text) {
  const words = spokenWords(text), syl = words.map(syllables), total = syl.reduce((a, b) => a + b, 0);
  const punct = words.filter(w => /[,.;:!?—]$/.test(w)).length;
  const dur = r3(.25 + total * .19 + words.length * .03 + punct * .18);
  let acc = 0;
  const wt = words.map((w, i) => { const t = r3(.05 + (dur - .3) * acc / total); acc += syl[i]; return [w, t]; });
  return { dur, lead: 0, words: wt, speech: [[0, dur]], placeholder: true };
}

const CAM = {
  push: [[640, 360, 1], [640, 360, 1.07]], pull: [[640, 360, 1.08], [640, 360, 1]], still: [[640, 360, 1], [640, 360, 1]],
  'pan-left': [[700, 360, 1.08], [580, 360, 1.08]], 'pan-right': [[580, 360, 1.08], [700, 360, 1.08]],
  up: [[640, 430, 1.08], [640, 320, 1.08]], down: [[640, 320, 1.08], [640, 430, 1.08]],
};
function resolveCam(c) {
  if (!c) return { from: CAM.push[0], to: CAM.push[1] };
  if (typeof c === 'string') { const p = CAM[c]; if (!p) throw new Error(`unknown cam "${c}" (have: ${Object.keys(CAM).join(', ')})`); return { from: p[0], to: p[1] }; }
  if (c.from && c.to) return { from: c.from, to: c.to };
  if (c.focus) { const z = c.zoom || 1.4, [x, y] = c.focus; const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const fx = cl(x, 640 / z, 1280 - 640 / z), fy = cl(y, 360 / z, 720 - 360 / z);
    return c.push === false ? { from: [fx, fy, z], to: [fx, fy, z] } : { from: [fx, fy, z * .96], to: [fx, fy, z * 1.03] }; }
  throw new Error(`bad cam ${JSON.stringify(c)}`);
}

function layoutItems(sc) {
  const L = sc.layout; if (!L) return [];
  const n = sc.count || 4;
  if (L === 'solo') return [{ char: true, id: 'hero', x: 640 }];
  if (L === 'duo') return [{ char: true, id: 'a', x: 450 }, { char: true, id: 'b', x: 830, flip: true }];
  if (L === 'lineup') {
    const sp = Math.min(270, 1040 / Math.max(1, n - 1));
    return Array.from({ length: n }, (_, i) => ({ char: true, id: `p${i + 1}`, x: 640 + (i - (n - 1) / 2) * sp, pose: i % 2 ? 'raise' : 'idle', face: 'happy', delay: i * .14, scale: n > 5 ? .8 : 1 }));
  }
  if (L === 'crowd') return [{ type: 'crowd', id: 'crowd', x: 640, y: GROUND + 40, rows: 3, cols: 9, enter: 'fade' }, ...(sc.hero === false ? [] : [{ char: true, id: 'hero', x: 640, scale: 1 }])];
  if (L === 'pile') return [
    { type: 'feed', id: 'feed', x: 640, y: 140, height: 1000, enter: 'none' },
    { type: 'tvpile', id: 'pile', x: 640, y: 800, width: 980, height: 380, enter: 'none' },
    { char: true, id: 'hero', kind: 'mask', x: 640, y: 482, scale: 1, pose: 'up', arms: 'coil', face: 'neutral', enter: 'none' },
  ];
  throw new Error(`unknown layout "${L}" (have: solo, duo, lineup, crowd, pile)`);
}

// cue → absolute time. on: "word" | "word#2" (Nth occurrence), at: 0..1 fraction of the scene, delay: seconds after scene start
function cueTime(c, sc, def) {
  if (c.on != null) {
    const [wRaw, nRaw] = String(c.on).split('#'), want = normWord(wRaw), nth = Math.max(1, +nRaw || 1);
    const hits = sc.words.filter(([w]) => normWord(w) === want || (want.length >= 4 && normWord(w).startsWith(want)));
    if (hits.length >= nth) return hits[nth - 1][1];
    console.warn(`story: scene ${sc.index + 1}: cue word "${c.on}" not found in «${spokenText(sc.say)}» — using scene start`);
    return def;
  }
  if (c.at != null) return sc.from + Math.min(1, Math.max(0, c.at)) * (sc.to - sc.from);
  if (c.delay != null) return sc.from + c.delay;
  return def;
}

function finalState(it) {   // apply all changes → base for an inherited (keep:true) item
  const s = { ...it }; for (const c of it.then || []) for (const k in c) if (k !== 't' && k !== 'dur') s[k] = c[k];
  delete s.then; return s;
}

const META = new Set(['on', 'at', 'delay', 'then', 'char', 'type', 'out', 'outOn', 'outAt']);
function makeItem(raw, sc, idx) {
  const isChar = raw.char || raw.kind || (!raw.type && raw.face !== undefined) || raw.type === 'char';
  const it = { el: isChar ? 'char' : 'prop' };
  for (const k in raw) if (!META.has(k)) it[k] = raw[k];
  if (isChar) {
    Object.assign(it, { kind: raw.kind || 'tv', face: raw.face || 'happy', pose: raw.pose || 'idle', y: raw.y ?? GROUND, scale: raw.scale ?? 1 });
  } else {
    it.type = raw.type;
    it.y = raw.y ?? PROP_Y[raw.type] ?? (STANDING.has(raw.type) ? GROUND : 300);
    it.x = raw.x ?? 640; it.scale = raw.scale ?? 1;
    if (raw.type === 'text' && !raw.enter) it.enter = 'write';
  }
  it.x = it.x ?? 640;
  it.id = raw.id || `${raw.type || 'char'}${idx}`;   // idx = per-type counter (see buildTimeline)
  it.seed = hash(`${it.id}:${sc.index}`) + 1;
  it.t0 = r3(cueTime(raw, sc, sc.from + (raw.enter === 'none' ? 0 : .02)));
  if (raw.out != null || raw.outOn != null || raw.outAt != null) it.out = r3(cueTime({ on: raw.outOn, at: raw.outAt, delay: raw.out }, sc, sc.to));
  it.then = (raw.then || []).map(c => { const o = { t: r3(cueTime(c, sc, sc.from)) }; for (const k in c) if (!['on', 'at', 'delay'].includes(k)) o[k] = c[k]; return o; }).sort((a, b) => a.t - b.t);
  return it;
}

// clips[i] = { dur, lead, words:[[w, tRel]], speech:[[a,b]], placeholder }
export function buildTimeline(story, clips) {
  if (!Array.isArray(story.scenes) || !story.scenes.length) throw new Error('story.json: "scenes" must be a non-empty array');
  const pace = story.pace ?? 1, scenes = [], subs = [], talk = [], voice = [];
  let cursor = 0;
  story.scenes.forEach((raw, i) => {
    const clip = clips[i];
    const lead = i === 0 ? .55 : (raw.lead ?? .12);
    const from = r3(cursor);
    const vStart = r3(from + lead);
    const speechEnd = clip ? clip.dur : 0;
    const gap = (raw.pause ?? story.pause ?? .38) * pace;
    let to = r3(Math.max(from + (raw.minDur ?? 1.4), clip ? vStart + speechEnd + gap : from + (raw.dur ?? 2.2)) + (raw.hold ?? 0));
    if (i === story.scenes.length - 1) to = r3(to + (story.outro ?? 1.4));
    const words = clip ? clip.words.map(([w, t]) => [w, r3(vStart + t)]) : [];
    const sc = { index: i, from, to, say: raw.say, words };
    if (clip && !clip.silent) voice.push({ scene: i, start: r3(vStart - (clip.lead || 0)), file: clip.file || null, dur: clip.dur });

    // items: inherited (keep) + layout + explicit cast/props
    let items = [];
    if (raw.keep && scenes.length) {
      const prev = scenes[scenes.length - 1];
      items = prev.items.filter(it => it.out == null || it.out >= prev.to).map(it => ({ ...finalState(it), t0: from, enter: 'none', out: undefined }));
      const drop = new Set(raw.remove || []); items = items.filter(it => !drop.has(it.id));
    }
    const raws = [...layoutItems(raw).map(o => ({ ...o, ...(raw.cast || []).find(c => c.id === o.id) })), ...(raw.cast || []).filter(c => !layoutItems(raw).some(o => o.id === c.id)).map(c => ({ char: true, ...c })), ...(raw.props || [])];
    const perType = {};
    raws.forEach(r => {
      const ty = r.type || 'char'; perType[ty] = (perType[ty] || 0) + 1;
      const it = makeItem(r, sc, perType[ty]);
      const ex = items.findIndex(x => x.id === it.id);
      if (ex >= 0) items[ex] = it; else items.push(it);
    });
    for (const ch of raw.change || []) {   // timed changes for inherited items: { id, on|at|delay, …fields }
      const it = items.find(x => x.id === ch.id);
      if (!it) { console.warn(`story: scene ${i + 1}: change for unknown id "${ch.id}"`); continue; }
      const o = { t: r3(cueTime(ch, sc, from)) }; for (const k in ch) if (!['id', 'on', 'at', 'delay'].includes(k)) o[k] = ch[k];
      it.then = [...(it.then || []), o].sort((a, b) => a.t - b.t);
    }
    const speaker = raw.speaker && items.find(it => it.id === raw.speaker);
    if (speaker && clip) for (const [a, b] of clip.speech) talk.push([r3(vStart + a), r3(vStart + b), speaker.id]);

    const prevSc = raw.keep && scenes.length ? scenes[scenes.length - 1] : null;
    scenes.push({ from, to, cam: resolveCam(raw.cam), ground: raw.ground ?? prevSc?.ground ?? (raw.layout === 'pile' ? false : true),
      particles: raw.particles ?? prevSc?.particles ?? story.particles ?? 1, dark: raw.dark ?? prevSc?.dark ?? false, flash: raw.flash ?? (prevSc ? false : undefined), items });
    // captions: phrases of ≤ 6 words / ≤ 38 chars, broken after punctuation
    let cur = [];
    const flush = end => { if (!cur.length) return; subs.push({ from: cur[0][1], to: end, words: cur }); cur = []; };
    words.forEach(([w, t], k) => {
      if (cur.length && (cur.length >= 6 || [...cur.map(x => x[0]), w].join(' ').length > 38)) flush(t);
      cur.push([w, t]);
      if (/[.!?;:]$/.test(w) && k < words.length - 1) flush(words[k + 1][1]);
    });
    flush(Math.min(to, (words.length ? vStart + speechEnd + .35 : to)));
    cursor = to;
  });
  // make each caption end where the next begins if they overlap
  for (let k = 0; k < subs.length - 1; k++) subs[k].to = r3(Math.min(subs[k].to, subs[k + 1].from));
  return { duration: r3(cursor), captions: !!story.captions, scenes, subs, talk, voice };
}

// SubRip file from caption phrases
export function toSrt(subs) {
  const ts = s => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  return subs.map((s, i) => `${i + 1}\n${ts(s.from)} --> ${ts(s.to)}\n${s.words.map(w => w[0]).join(' ')}\n`).join('\n');
}
