// Procedural background music: no samples, no network, deterministic. Renders a 48 kHz stereo WAV the length of the film.
//   "music": "lofi" | "ambient" | "upbeat" | { "preset": "lofi", "bpm": 80, "volume": 0.5 } | "track.mp3" (a file in the episode folder)
// lofi    — warm electric-piano ii–V–I–vi, dusty swung drums, round bass, vinyl crackle (default for the cartoon style)
// ambient — slow evolving pads and a soft piano, no drums (essays, calm or sad topics)
// upbeat  — brighter chords, plucked arpeggio, claps, four-on-the-floor-ish groove (launches, product demos)
// The arrangement follows the film: drums enter after the intro, drop out in `quiet` windows (dark / blackout scenes),
// a soft swell + kick lands on each `hits` time (big transitions), and the last bars resolve on a held chord.
import { writeFileSync } from 'node:fs';

const SR = 48000;
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
function rng(seed) { seed = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// chord = [bass, ...voicing] (MIDI)
export const MUSIC_PRESETS = {
  lofi: { label: 'Lo-fi', bpm: 84, swing: .58, barsPerChord: 1, drums: 'lofi', ep: 1, pad: .22, pluck: 0, crackle: 1, lp: 5200, volume: .55,
    chords: [[43, 58, 62, 65, 69], [48, 58, 62, 64, 67], [41, 57, 60, 64, 67], [38, 53, 57, 60, 64]] },
  ambient: { label: 'Ambient', bpm: 68, swing: .5, barsPerChord: 2, drums: null, ep: .55, pad: .7, pluck: 0, crackle: .25, lp: 7000, volume: .6,
    chords: [[36, 55, 59, 62, 64], [33, 52, 55, 59, 62], [29, 53, 57, 60, 66], [31, 55, 59, 62, 64]] },
  upbeat: { label: 'Upbeat', bpm: 108, swing: .52, barsPerChord: 1, drums: 'upbeat', ep: .7, pad: .3, pluck: 1, crackle: 0, lp: 11000, volume: .5,
    chords: [[36, 60, 64, 67, 74], [43, 59, 62, 67, 69], [45, 60, 64, 69, 71], [41, 60, 65, 69, 72]] },
};

// ─── tiny DSP kit ────────────────────────────────────────────────────────────────
function biquad(type, f, q = .707) {   // RBJ cookbook; returns a per-sample function
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; }   // band-pass
  a0 = 1 + a; a1 = -2 * c; a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
function makeHit(len, fn) { const n = Math.round(len * SR), b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = fn(i / SR, i); return b; }
function place(buf, hit, t, gain, pan = 0, L, R) {   // mix a mono hit into the stereo bus
  const i0 = Math.round(t * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4) * 1.414, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * 1.414;
  for (let i = 0; i < hit.length; i++) { const j = i0 + i; if (j < 0) continue; if (j >= L.length) break; L[j] += hit[i] * gl; R[j] += hit[i] * gr; }
}
function reverb(inL, inR, mix = .3, size = 1) {   // Freeverb-lite: 4 combs + 2 all-passes per channel
  const n = inL.length, outL = new Float32Array(n), outR = new Float32Array(n);
  const sc = SR / 44100 * size, combs = [1557, 1617, 1491, 1422], aps = [556, 441];
  for (const [src, dst, off] of [[inL, outL, 0], [inR, outR, 23]]) {
    const cb = combs.map(d => ({ buf: new Float32Array(Math.round((d + off) * sc)), i: 0, f: 0 }));
    const ab = aps.map(d => ({ buf: new Float32Array(Math.round((d + off) * sc)), i: 0 }));
    for (let k = 0; k < n; k++) {
      const x = src[k] * .015; let y = 0;
      for (const c of cb) { const o = c.buf[c.i]; c.f = o * .7 + c.f * .3; c.buf[c.i] = x + c.f * .82; c.i = (c.i + 1) % c.buf.length; y += o; }
      for (const a of ab) { const o = a.buf[a.i]; const v = -y + o; a.buf[a.i] = y + o * .5; a.i = (a.i + 1) % a.buf.length; y = v; }
      dst[k] = y * mix * 4;
    }
  }
  return [outL, outR];
}

// ─── instruments ────────────────────────────────────────────────────────────────
// Rhodes-ish electric piano: FM tine with a decaying index, bell partial, tremolo; written straight into the buses
function epNote(L, R, sendL, sendR, n, t0, dur, vel, pan, wow, bright = 1) {
  const f = mtof(n), len = dur + 1.6, i0 = Math.round(t0 * SR), N = Math.round(len * SR);
  const dec = 1.1 + 40 / f, gl = Math.cos((pan + 1) * Math.PI / 4) * 1.414, gr = Math.sin((pan + 1) * Math.PI / 4) * 1.414, amp = vel * .16 / Math.sqrt(1 + f / 600);
  for (let i = 0; i < N; i++) {
    const j = i0 + i; if (j >= L.length) break; if (j < 0) continue;
    const tt = i / SR, ta = j / SR + wow(j / SR);
    let env = Math.exp(-tt / dec) * (1 - Math.exp(-tt / .004));
    if (tt > dur) env *= Math.exp(-(tt - dur) / .22);
    if (env < 1e-4 && tt > .05) break;
    const idx = (1.6 * bright) * Math.exp(-tt / .28) + .25;
    const y = (Math.sin(2 * Math.PI * f * ta + idx * Math.sin(2 * Math.PI * f * ta)) + .14 * bright * Math.sin(2 * Math.PI * f * 4 * ta) * Math.exp(-tt / .09)) * env * amp
      * (1 + .12 * Math.sin(2 * Math.PI * 4.6 * (j / SR)));
    L[j] += y * gl; R[j] += y * gr; sendL[j] += y * gl * .5; sendR[j] += y * gr * .5;
  }
}
function padNote(L, R, sendL, sendR, n, t0, dur, vel) {   // two detuned sine stacks, slow swell
  const f = mtof(n), N = Math.round((dur + 2.2) * SR), i0 = Math.round(t0 * SR), amp = vel * .05;
  for (let i = 0; i < N; i++) {
    const j = i0 + i; if (j >= L.length) break; if (j < 0) continue;
    const tt = i / SR, ta = j / SR;
    let env = Math.min(1, tt / 1.2); if (tt > dur) env *= Math.max(0, 1 - (tt - dur) / 2.2);
    const v = k => Math.sin(2 * Math.PI * f * k * ta) + .3 * Math.sin(2 * Math.PI * 2 * f * k * ta) + .12 * Math.sin(2 * Math.PI * 3 * f * k * ta);
    const a = v(1.0023) * env * amp, b = v(.9977) * env * amp;
    L[j] += a; R[j] += b; sendL[j] += a * .6; sendR[j] += b * .6;
  }
}
function bassNote(L, R, n, t0, dur, vel) {
  const f = mtof(n), N = Math.round((dur + .12) * SR), i0 = Math.round(t0 * SR), amp = vel * .3;
  for (let i = 0; i < N; i++) {
    const j = i0 + i; if (j >= L.length) break; if (j < 0) continue;
    const tt = i / SR; let env = (1 - Math.exp(-tt / .008)) * (.62 + .38 * Math.exp(-tt / .25)); if (tt > dur) env *= Math.exp(-(tt - dur) / .04);
    const y = Math.tanh((Math.sin(2 * Math.PI * f * tt) + .28 * Math.sin(4 * Math.PI * f * tt)) * 1.3) * env * amp;
    L[j] += y; R[j] += y;
  }
}
function pluckNote(L, R, sendL, sendR, n, t0, vel, pan) {
  const f = mtof(n), N = Math.round(.5 * SR), i0 = Math.round(t0 * SR), amp = vel * .07;
  const gl = Math.cos((pan + 1) * Math.PI / 4) * 1.414, gr = Math.sin((pan + 1) * Math.PI / 4) * 1.414;
  for (let i = 0; i < N; i++) {
    const j = i0 + i; if (j >= L.length) break; if (j < 0) continue;
    const tt = i / SR, env = Math.exp(-tt / .14) * (1 - Math.exp(-tt / .002));
    const y = (Math.sin(2 * Math.PI * f * tt) + .45 * Math.sin(4 * Math.PI * f * tt) * Math.exp(-tt / .05) + .2 * Math.sin(6 * Math.PI * f * tt) * Math.exp(-tt / .03)) * env * amp;
    L[j] += y * gl; R[j] += y * gr; sendL[j] += y * gl * .5; sendR[j] += y * gr * .5;
  }
}
function drumKit(seed) {
  const r = rng(seed);
  let ph = 0;
  const kick = makeHit(.45, tt => { const f = 46 + 90 * Math.exp(-tt / .035); ph += 2 * Math.PI * f / SR; return (Math.sin(ph) * Math.exp(-tt / .3) + (tt < .004 ? (r() - .5) * .6 : 0)) * .9; });
  const bp = biquad('bp', 1900, .8), hpS = biquad('hp', 400);
  const snare = makeHit(.35, tt => (hpS(bp(r() * 2 - 1)) * 2.2 * Math.exp(-tt / .11) + .45 * Math.sin(2 * Math.PI * 185 * tt) * Math.exp(-tt / .05)) * .55);
  const clapBp = biquad('bp', 1300, 1.2);
  const clap = makeHit(.3, tt => { const e = [0, .011, .022].reduce((a, d) => a + (tt >= d ? Math.exp(-(tt - d) / (d === .022 ? .09 : .008)) : 0), 0); return clapBp(r() * 2 - 1) * e * .9; });
  const hats = [0, 1, 2].map(v => { const hp = biquad('hp', 7200 + v * 600); return makeHit(.09, tt => hp(r() * 2 - 1) * Math.exp(-tt / (.018 + v * .006)) * .5); });
  const hpO = biquad('hp', 6000);
  const swell = makeHit(1.1, tt => hpO(r() * 2 - 1) * Math.pow(tt / 1.1, 3) * .35);   // reversed cymbal → lands at the end
  return { kick, snare, clap, hats, swell };
}

// ─── arrangement ────────────────────────────────────────────────────────────────
export function renderMusic(opts, outFile) {
  const P = { ...MUSIC_PRESETS[opts.preset || 'lofi'], ...(opts.bpm ? { bpm: opts.bpm } : {}) };
  if (!P.chords) throw new Error(`unknown music preset "${opts.preset}" (have: ${Object.keys(MUSIC_PRESETS).join(', ')})`);
  const duration = Math.max(2, opts.duration), N = Math.round((duration + .05) * SR);
  const L = new Float32Array(N), R = new Float32Array(N), sL = new Float32Array(N), sR = new Float32Array(N);
  const r = rng(opts.seed || 7), beat = 60 / P.bpm, bar = beat * 4, start = .12;
  const bars = Math.ceil((duration - start) / bar) + 1, introBars = duration > 24 ? 2 : duration > 12 ? 1 : 0, outroAt = duration - Math.min(bar * 2, duration * .15);
  const quiet = (opts.quiet || []).map(([a, b]) => [a - .05, b]);
  const inQuiet = t => quiet.some(([a, b]) => t >= a && t < b);
  const wow = t => .00045 * Math.sin(2 * Math.PI * .55 * t) + .00015 * Math.sin(2 * Math.PI * 6.3 * t);
  const kit = P.drums ? drumKit((opts.seed || 7) + 3) : null;
  const swing = (b8) => (b8 % 2 ? (P.swing - .5) * beat : 0);
  for (let b = 0; b < bars; b++) {
    const t0 = start + b * bar; if (t0 >= duration) break;
    const ch = P.chords[Math.floor(b / P.barsPerChord) % P.chords.length], first = b % P.barsPerChord === 0;
    const ending = t0 >= outroAt, last = t0 + bar >= duration - .2 || (ending && t0 + bar * 2 > duration);
    const q = inQuiet(t0 + beat), bright = introBars && b < introBars ? .55 : 1;
    // keys
    if (P.ep && first) {
      const hold = last ? duration - t0 : bar * P.barsPerChord - .05;
      ch.slice(1).forEach((n, k) => epNote(L, R, sL, sR, n, t0 + k * .018 + r() * .006, hold, P.ep * (.75 + r() * .2) * (q ? .8 : 1), (k - 1.5) * .25, wow, bright));
      if (!last && P.barsPerChord === 1 && P.drums) ch.slice(2).forEach((n, k) => epNote(L, R, sL, sR, n, t0 + beat * 2.5 + swing(1) + k * .015, beat * 1.2, P.ep * .42, (k - 1) * .3, wow, bright));
    }
    if (P.pad && first) ch.slice(1, 4).forEach(n => padNote(L, R, sL, sR, n - 12 * (n > 64), t0, (last ? duration - t0 : bar * P.barsPerChord) + .1, P.pad));
    // bass
    if (b >= introBars || !P.drums) {
      const root = ch[0];
      if (last) bassNote(L, R, root, t0, Math.max(.3, duration - t0 - .4), .9);
      else if (P.drums === 'upbeat') for (let e = 0; e < 8; e++) bassNote(L, R, root + (e % 4 === 3 ? 12 : 0), t0 + e * beat / 2, beat * .4, .7);
      else if (P.drums) { bassNote(L, R, root, t0, beat * 1.4, .9); bassNote(L, R, root, t0 + beat * 2.5 + swing(1), beat * .8, .7); if (b % 2) bassNote(L, R, root + 7, t0 + beat * 3.5 + swing(1), beat * .4, .5); }
      else if (first) bassNote(L, R, root, t0, bar * P.barsPerChord - .1, .55);
    }
    // arpeggio
    if (P.pluck && b >= introBars && !ending && !q) for (let s = 0; s < 16; s++) { const notes = ch.slice(1); pluckNote(L, R, sL, sR, notes[[0, 2, 1, 3, 2, 4, 3, 1][s % 8] % notes.length] + 12, t0 + s * beat / 4, P.pluck * (s % 4 ? .55 : .9), s % 2 ? .35 : -.35); }
    // drums
    if (kit && b >= introBars && !ending) {
      for (let e = 0; e < 8; e++) {
        const tt = t0 + e * beat / 2 + swing(e); if (inQuiet(tt)) continue;
        if (P.drums === 'lofi') {
          if (e === 0 || e === 5 || (e === 3 && b % 4 === 3)) place(L, kit.kick, tt, e === 0 ? .9 : .7, 0, L, R);
          if (e === 2 || e === 6) place(L, kit.snare, tt + .012, .6 + r() * .08, .05, L, R), place(sL, kit.snare, tt + .012, .5, 0, sL, sR);
          place(L, kit.hats[e % 3], tt, (e % 2 ? .22 : .32) * (.8 + r() * .4), .3, L, R);
        } else {
          if (e % 2 === 0) place(L, kit.kick, tt, .85, 0, L, R);
          if (e === 2 || e === 6) { place(L, kit.clap, tt, .6, -.05, L, R); place(sL, kit.clap, tt, .4, 0, sL, sR); }
          place(L, kit.hats[e % 2 ? 0 : 1], tt + (e % 2 ? 0 : beat / 4), e % 2 ? .34 : .18, .3, L, R);
        }
      }
    }
  }
  // transition hits: swell into the moment + a kick on it (skipped in quiet windows / the very start)
  for (const t of opts.hits || []) {
    if (t <= 1.5 || t >= duration - .8 || inQuiet(t)) continue;
    if (kit) { place(L, kit.swell, t - 1.1, .8, 0, L, R); place(L, kit.kick, t, .7, 0, L, R); }
    else padNote(L, R, sL, sR, 79, t - .2, .6, .5);
  }
  // vinyl crackle + tape hiss
  if (P.crackle) { const hp = biquad('hp', 1800), lp = biquad('lp', 3500);
    for (let i = 0; i < N; i++) { let x = lp(r() * 2 - 1) * .006 * P.crackle; if (r() < 7 * P.crackle / SR) x += (r() - .5) * .5; const y = hp(x); L[i] += y; R[i] += y * .9; } }
  // reverb send, tone, tape saturation, fades
  const [rvL, rvR] = reverb(sL, sR, P.drums ? .28 : .42, P.drums ? 1 : 1.3);
  const lpL = biquad('lp', P.lp), lpR = biquad('lp', P.lp);
  let rms = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, fade = Math.min(1, t / .6, (duration - t) / 2.4);
    L[i] = Math.tanh(lpL(L[i] + rvL[i]) * 1.15) * Math.max(0, fade); R[i] = Math.tanh(lpR(R[i] + rvR[i]) * 1.15) * Math.max(0, fade);
    rms += L[i] * L[i] + R[i] * R[i];
  }
  rms = Math.sqrt(rms / (2 * N)) || 1;
  let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = Math.min(.12 / rms, .95 / (peak || 1));   // ≈ −18 dBFS RMS, never clipping
  const out = Buffer.alloc(44 + N * 4);
  out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4); }
  writeFileSync(outFile, out);
  return { preset: opts.preset || 'lofi', bpm: P.bpm, volume: P.volume, file: outFile };
}
