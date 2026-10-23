// Choreography for clay characters and the objects they handle — pure functions of time (browser and node).
// An agent is a list of moves (hop / walk / idle) on the ground plane; a block is a list of states (float, held by an
// agent, flying, placed in a slot). pose(t) / where(t) are evaluated from those lists only, so any frame renders alone.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, s) => a + (b - a) * s;
export const smooth = s => (s = clamp(s), s * s * (3 - 2 * s));
export const smoother = s => (s = clamp(s), s * s * s * (s * (s * 6 - 15) + 10));
export const expo = s => (s = clamp(s), s === 1 ? 1 : 1 - Math.pow(2, -10 * s));
export const back = (s, k = 1.7) => (s = clamp(s), 1 + (k + 1) * Math.pow(s - 1, 3) + k * Math.pow(s - 1, 2));
export const v3lerp = (a, b, s) => [lerp(a[0], b[0], s), lerp(a[1], b[1], s), lerp(a[2], b[2], s)];
const angTo = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);
const wrapNear = (a, ref) => { while (a - ref > Math.PI) a -= 2 * Math.PI; while (a - ref < -Math.PI) a += 2 * Math.PI; return a; };

// ─── agents ──────────────────────────────────────────────────────────────────────────────────────────
export class Agent {
  constructor(id, { pos = [0, 0, 0], scale = 1, face = 0, head = 1.6, color = '#e5744f' } = {}) {
    Object.assign(this, { id, start: pos, scale, face0: face, head, color });
    this.moves = []; this.faces = []; this.leans = []; this.sits = []; this.blinks = []; this.extras = [];
  }
  hop(t0, t1, to, h = 1.2, o = {}) { this.moves.push({ type: 'hop', t0, t1, to, h, ...o }); return this; }
  walk(t0, t1, to, hz = 3) { this.moves.push({ type: 'walk', t0, t1, to, hz }); return this; }
  look(t, target) { this.faces.push({ t, target }); return this; }        // target: [x,y,z] or an angle
  lean(t, amount, dur = 0.5) { this.leans.push({ t, amount, dur }); return this; }   // +forward, − back (tug, bow)
  pull(t0, t1, amount = -0.35) { this.extras.push({ type: 'pull', t0, t1, amount }); return this; }
  sit(t0, t1) { this.sits.push({ t0, t1 }); return this; }
  squeeze(t, amt = 0.4) { this.extras.push({ type: 'squeeze', t, amt }); return this; }
  blink(...ts) { this.blinks.push(...ts); return this; }
  finish() {                                                             // sort and precompute positions + facing keys
    this.moves.sort((a, b) => a.t0 - b.t0);
    let p = this.start, f = this.face0; this.faceKeys = [[-1, f]];
    for (const m of this.moves) {
      m.from = p;
      const d = Math.hypot(m.to[0] - p[0], m.to[2] - p[2]);
      if (d > 0.05 && !m.keepFace) { f = wrapNear(angTo(p, m.to), f); this.faceKeys.push([m.t0 - 0.12, f]); }
      p = m.to;
    }
    for (const k of this.faces) { const a = typeof k.target === 'number' ? k.target : angTo(this.posAt(k.t), k.target); this.faceKeys.push([k.t, a]); }
    this.faceKeys.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < this.faceKeys.length; i++) this.faceKeys[i][1] = wrapNear(this.faceKeys[i][1], this.faceKeys[i - 1][1]);
    return this;
  }
  posAt(t) {
    let p = this.start;
    for (const m of this.moves) {
      if (t >= m.t1) { p = m.to; continue; }
      if (t < m.t0) break;
      const s = (t - m.t0) / (m.t1 - m.t0);
      if (m.type === 'hop') { const e = lerp(s, smooth(s), 0.35); const q = v3lerp(m.from, m.to, e); q[1] = lerp(m.from[1], m.to[1], s) + m.h * 4 * s * (1 - s); return q; }
      return v3lerp(m.from, m.to, smooth(s));
    }
    return p;
  }
  // full pose: position, squash, facing, tilt, flip, blink, sitting, run phase
  pose(t) {
    const pos = this.posAt(t);
    let sq = 1, air = 0, run = 0, pitch = 0, lean = 0;
    for (const m of this.moves) {
      if (m.type === 'hop') {
        const big = clamp(m.h / 2.2, 0.4, 1.1);
        if (t > m.t0 - 0.14 && t < m.t0) sq *= 1 - 0.22 * big * Math.sin(Math.PI * 0.5 * (t - (m.t0 - 0.14)) / 0.14);
        else if (t >= m.t0 && t < m.t1) { const s = (t - m.t0) / (m.t1 - m.t0); air = Math.sin(Math.PI * s); sq *= 1 + 0.15 * big * Math.sin(Math.PI * clamp(s / 0.45)) * (s < 0.45 ? 1 : 0); lean = 0.18 * air; if (m.flip) pitch = 2 * Math.PI * smoother((s - 0.1) / 0.75); }
        else if (t >= m.t1 && t < m.t1 + 0.55) { const dt = t - m.t1; sq *= 1 - 0.3 * big * Math.exp(-9 * dt) * Math.cos(20 * dt); }
      } else if (t >= m.t0 && t < m.t1) { run = (t - m.t0) * m.hz; lean = 0.12; pos[1] += 0.12 * Math.abs(Math.sin(Math.PI * run)); }
    }
    for (const e of this.extras) {
      if (e.type === 'squeeze' && t > e.t && t < e.t + 0.7) { const dt = t - e.t; sq *= 1 - e.amt * Math.sin(Math.PI * clamp(dt / 0.22)) * (dt < 0.22 ? 1 : 0) + (dt >= 0.22 ? -0.12 * Math.exp(-8 * (dt - 0.22)) * Math.cos(18 * (dt - 0.22)) : 0); }
      if (e.type === 'pull' && t > e.t0 && t < e.t1) lean += e.amount * smooth((t - e.t0) / 0.25) * (1 - smooth((t - e.t1 + 0.2) / 0.2)) + 0.04 * Math.sin(t * 31);
    }
    for (const l of this.leans) if (t > l.t && t < l.t + l.dur) lean += l.amount * Math.sin(Math.PI * (t - l.t) / l.dur);
    let face = this.faceKeys[0][1];
    for (let i = 1; i < this.faceKeys.length; i++) { const [k, a] = this.faceKeys[i]; if (t < k) break; face = lerp(face, a, smooth((t - k) / 0.22)); }
    let blink = 0; for (const b of this.blinks) if (t > b && t < b + 0.16) blink = Math.max(blink, Math.sin(Math.PI * (t - b) / 0.16));
    let sit = 0; for (const s of this.sits) sit = Math.max(sit, smooth((t - s.t0) / 0.3) * (1 - smooth((t - s.t1 + 0.25) / 0.25)));
    return { pos, sq, face, lean, pitch, air, run, blink, sit, scale: this.scale };
  }
  headAt(t) { const p = this.pose(t); const h = this.head * p.scale * p.sq * (1 - 0.16 * p.sit); return [p.pos[0], p.pos[1] + h, p.pos[2]]; }
  landings() { return this.moves.filter(m => m.type === 'hop').map(m => ({ t: m.t1, pos: m.to, h: m.h, id: this.id, t0: m.t0 })); }
}

// ─── blocks ──────────────────────────────────────────────────────────────────────────────────────────
// states: { t, mode: 'float', pos } | { t, mode: 'held', by } | { t, mode: 'fly', t1, to: pos|() => pos, h } |
//         { t, mode: 'place', slot: () => pos, dur } | { t, mode: 'hide' }
export class Block {
  constructor(id, o = {}) { Object.assign(this, { id, ...o }); this.states = []; }
  at(t, mode, o = {}) { this.states.push({ t, mode, ...o }); this.states.sort((a, b) => a.t - b.t); return this; }
  // agents: { id: Agent }, extra(t) → { pos } override (for zone motion etc.)
  where(t, agents) {
    let i = -1; for (let k = 0; k < this.states.length; k++) if (this.states[k].t <= t) i = k;
    if (i < 0) return null;
    const s = this.states[i];
    const posOf = (st, tt) => this._pos(st, tt, agents, i);
    switch (s.mode) {
      case 'hide': return null;
      case 'float': { const b = this.bob ?? 0.18, ph = (this.seed ?? 0) * 2.1; return { pos: [s.pos[0] + 0.08 * Math.sin(t * 0.7 + ph), s.pos[1] + b * Math.sin(t * 1.3 + ph), s.pos[2] + 0.08 * Math.cos(t * 0.6 + ph)], spin: 0.25 * Math.sin(t * 0.5 + ph) }; }
      case 'held': { const a = agents[s.by], h = a.headAt(t), grab = clamp((t - s.t) / 0.18); const prev = i > 0 ? this._pos(this.states[i - 1], s.t, agents, i - 1) : h;
        const top = [h[0], h[1] + (this.lift ?? 0.05), h[2]]; return { pos: v3lerp(prev, top, back(grab, 1.2)), face: a.pose(t).face, squash: 1 - 0.18 * Math.sin(Math.PI * grab) }; }
      case 'fly': { const from = i > 0 ? this._pos(this.states[i - 1], s.t, agents, i - 1) : [0, 0, 0]; const to = typeof s.to === 'function' ? s.to(s.t1) : s.to;
        const u = clamp((t - s.t) / (s.t1 - s.t)), p = v3lerp(from, to, u); p[1] += (s.h ?? 2) * 4 * u * (1 - u); return { pos: p, spin: (s.spin ?? 6) * u }; }
      case 'place': { const from = i > 0 ? this._pos(this.states[i - 1], s.t, agents, i - 1) : s.slot(t); const to = s.slot(t), d = s.dur ?? 0.3;
        const u = clamp((t - s.t) / d), p = v3lerp(from, to, smoother(u)); p[1] += 0.5 * Math.sin(Math.PI * u); const press = t > s.t + d ? Math.exp(-(t - s.t - d) * 9) * Math.cos((t - s.t - d) * 26) : 0;
        return { pos: p, placed: u >= 1, squash: 1 - 0.22 * press, face: s.face }; }
    }
    return null;
  }
  _pos(s, t, agents, i) {                                                 // position of a state at time t (for hand-offs)
    if (s.mode === 'held') { const h = agents[s.by].headAt(t); return [h[0], h[1] + (this.lift ?? 0.05), h[2]]; }
    if (s.mode === 'float') return s.pos;
    if (s.mode === 'fly') return typeof s.to === 'function' ? s.to(s.t1) : s.to;
    if (s.mode === 'place') return s.slot(t);
    return [0, -50, 0];
  }
}

// beat grid helper: times on a musical grid
export const grid = (bpm, t0 = 0.12) => { const beat = 60 / bpm; return { beat, bar: beat * 4, b: k => +(t0 + k * beat).toFixed(4) }; };
