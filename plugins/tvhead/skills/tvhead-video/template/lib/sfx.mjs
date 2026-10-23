// Synthesized sound design for films/*: deterministic SFX placed on timeline cues, a small room, a music bed with a level
// curve and ducking, loudness normalisation and muxing. No samples, no network.
//   const mix = createMix(15); mix.cues(cues()); mix.music(file, levelKeys); mix.voice(lines); mix.write(out, { video })
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SR = 48000;
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const lp = fc => { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0; return x => (y = (1 - a) * x + a * y); };
const hp = fc => { const f = lp(fc); return x => x - f(x); };
function svf() { let lo = 0, band = 0; return (x, fc, q = 0.7) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); const hi = x - lo - q * band; band += f * hi; lo += f * band; return band; }; }
const env = (tt, a, d) => tt < a ? tt / a : Math.exp(-(tt - a) / d);
function sweep(f0, f1, dur) { let ph = 0; return tt => { const f = f0 * Math.pow(f1 / f0, Math.min(1, tt / dur)); ph += 2 * Math.PI * f / SR; return Math.sin(ph); }; }
function ff(args, label) { const p = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }); if (p.status) throw new Error(`${label}: ${p.stderr.slice(-600)}`); }
export function decode(file, channels = 1) {
  const p = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', String(channels), '-ar', String(SR), '-'], { maxBuffer: 1 << 29 });
  if (p.status) throw new Error('decode ' + file);
  return new Float32Array(p.stdout.buffer, p.stdout.byteOffset, p.stdout.length / 4);
}

export function createMix(duration, seed = 99) {
  const N = Math.round(duration * SR), r = rng(seed);
  const L = new Float32Array(N), R = new Float32Array(N), voice = new Float32Array(N);
  let music = null, level = () => 1, duckAmt = 0.55;
  function put(t, gain, pan, gen, len) {
    const i0 = Math.round(t * SR), n = Math.round(len * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < n; i++) { const k = i0 + i; if (k < 0 || k >= N) continue; const v = gen(i, i / SR); L[k] += v * gl; R[k] += v * gr; }
  }
  const SFX = {
    pop(t, g, c) { const p = c.pitch || 1, s = sweep(900 * p, 260 * p, 0.07), n = hp(2000); put(t, g * 0.5, 0, (i, tt) => s(tt) * env(tt, 0.002, 0.06) + n(r() - 0.5) * 0.4 * env(tt, 0.001, 0.006), 0.35); },
    squash(t, g, c) { const p = c.pitch || 1, s = sweep(170 * p, 62 * p, 0.12), f = lp(900), f2 = svf(), pp = sweep(520 * p, 240 * p, 0.05);
      put(t, g * 0.75, (r() - 0.5) * 0.3, (i, tt) => s(tt) * env(tt, 0.003, 0.11) * 0.9 + f(r() - 0.5) * 1.6 * env(tt, 0.004, 0.05) + f2(r() - 0.5, 1400 - 900 * Math.min(1, tt / 0.08), 0.4) * 0.5 * env(tt, 0.002, 0.04) + pp(tt) * 0.25 * env(tt, 0.002, 0.04), 0.6); },
    hopUp(t, g) { const s = sweep(280, 760, 0.09); put(t - 0.02, g * 0.22, 0, (i, tt) => s(tt) * env(tt, 0.01, 0.06), 0.25); },
    step(t, g) { const f = svf(), s = sweep(240, 150, 0.03); put(t, g * 0.35, (r() - 0.5) * 0.4, (i, tt) => f(r() - 0.5, 1300, 0.5) * env(tt, 0.001, 0.018) * 1.4 + s(tt) * env(tt, 0.002, 0.025) * 0.6, 0.12); },
    whoosh(t, g, c) { const d = c.dur || 0.5, f = svf(), lo = c.low ? 120 : 300, hi = c.low ? 900 : 2600;
      put(t - d * 0.35, g * 0.55, 0, (i, tt) => { const x = tt / d, e = Math.sin(Math.PI * Math.min(1, x)) ** 2; return f(r() - 0.5, lo + (hi - lo) * Math.sin(Math.PI * Math.min(1, x)), 0.5) * e * 2.2; }, d); },
    shimmer(t, g) { const parts = [1180, 1770, 2360, 2950, 3540].map(f => ({ f: f * (1 + (r() - 0.5) * 0.01), ph: r() * 6 }));
      put(t, g * 0.18, 0, (i, tt) => parts.reduce((a, p, k) => a + Math.sin(2 * Math.PI * p.f * tt + p.ph) * Math.exp(-tt / (0.5 + k * 0.12)), 0) * Math.min(1, tt / 0.01), 1.6); },
    uiclick(t, g, c) { const p = c.pitch || 1, n = hp(3000); put(t, g * 0.35, 0.1, (i, tt) => Math.sin(2 * Math.PI * 2400 * p * tt) * env(tt, 0.0005, 0.008) + n(r() - 0.5) * env(tt, 0.0003, 0.003), 0.05); },
    tick(t, g) { const n = hp(2500); put(t, g * 0.32, (r() - 0.5) * 0.5, (i, tt) => n(r() - 0.5) * 1.3 * env(tt, 0.0004, 0.005) + Math.sin(2 * Math.PI * (1700 + r() * 300) * tt) * 0.3 * env(tt, 0.001, 0.01), 0.04); },
    digital(t, g) { [880, 1320, 1760].forEach((f, k) => put(t + k * 0.055, g * 0.16, -0.2 + k * 0.2, (i, tt) => Math.sin(2 * Math.PI * f * tt + Math.sin(2 * Math.PI * f * 2 * tt) * 0.6) * env(tt, 0.002, 0.06), 0.25)); },
    tap(t, g) { const f = svf(); put(t, g * 0.4, (r() - 0.5) * 0.4, (i, tt) => f(r() - 0.5, 1800, 0.6) * env(tt, 0.001, 0.03) * 1.6, 0.1); },
    rise(t, g, c) { const d = c.dur || 1, f = svf(), s = sweep(220, 880, d); put(t, g * 0.3, 0, (i, tt) => { const x = Math.min(1, tt / d), e = x * x * (1 - Math.max(0, (tt - d) / 0.15)); return (f(r() - 0.5, 400 + 3000 * x, 0.6) * 1.2 + s(tt) * 0.25) * Math.max(0, e); }, d + 0.15); },
    morph(t, g) { const f = svf(); let ph = 0; put(t, g * 0.35, 0, (i, tt) => { const x = tt / 0.55, fr = 500 + 420 * Math.sin(Math.PI * x); ph += 2 * Math.PI * fr / SR; return (Math.sin(ph) * 0.35 * (1 + 0.4 * Math.sin(2 * Math.PI * 18 * tt)) + f(r() - 0.5, 700 + 1800 * x, 0.5)) * Math.sin(Math.PI * Math.min(1, x)) ** 2; }, 0.55); },
    thud(t, g) { const s = sweep(120, 52, 0.18), f = lp(600); put(t, g * 0.7, (r() - 0.5) * 0.3, (i, tt) => s(tt) * env(tt, 0.003, 0.16) + f(r() - 0.5) * env(tt, 0.002, 0.04) * 1.2, 0.5); },
    settle(t, g) { const s = sweep(200, 110, 0.15), f = svf(); put(t, g * 0.6, 0, (i, tt) => s(tt) * env(tt, 0.004, 0.16) + f(r() - 0.5, 900, 0.5) * env(tt, 0.003, 0.08) * 0.5, 0.6); },
    impact(t, g) { const s = sweep(70, 38, 0.5), f = lp(400); put(t, g * 0.8, 0, (i, tt) => s(tt) * env(tt, 0.005, 0.7) + f(r() - 0.5) * env(tt, 0.002, 0.12) * 1.5, 2.2); SFX.shimmer(t + 0.02, g * 0.8); },
    final(t, g) { SFX.impact(t, g * 0.9); [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => put(t + k * 0.02, g * 0.1, -0.3 + k * 0.2, (i, tt) => (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * tt) * Math.exp(-tt / 0.3)) * env(tt, 0.004, 1.4), 2.8)); },
    // hard-hitting promo kit
    slam(t, g) {                                              // word slam: sub drop + body + crack, slight stereo width
      const s = sweep(95, 42, 0.22), f = lp(1800), n = hp(3500);
      put(t, g * 0.85, 0, (i, tt) => s(tt) * env(tt, 0.002, 0.2) * 1.1 + f(r() - 0.5) * env(tt, 0.001, 0.035) * 1.4 + n(r() - 0.5) * env(tt, 0.0005, 0.012) * 0.8, 0.7);
    },
    pass(t, g, c) {                                           // something flying past the camera: short doppler swish
      const p = c.pitch || 1, f = svf();
      put(t - 0.06, g * 0.5, (r() - 0.5) * 1.2, (i, tt) => { const x = tt / 0.16; return f(r() - 0.5, (2600 - 1500 * x) * p, 0.45) * Math.sin(Math.PI * Math.min(1, x)) ** 1.5 * 2; }, 0.16);
    },
    glitch(t, g) {                                            // bit-crushed blips
      const hold = Math.round(SR / 2400); let v = 0;
      put(t, g * 0.35, (r() - 0.5) * 0.8, (i, tt) => { if (i % hold === 0) v = Math.sign(Math.sin(2 * Math.PI * (600 + 900 * Math.floor(tt * 40) % 3) * tt)) * (r() < 0.85 ? 1 : 0); return v * env(tt, 0.001, 0.05); }, 0.12);
    },
    snap(t, g) { const n = hp(1200); put(t, g * 0.6, 0, (i, tt) => n(r() - 0.5) * env(tt, 0.0004, 0.02) * 1.6 + Math.sin(2 * Math.PI * 1500 * tt) * env(tt, 0.001, 0.015) * 0.4, 0.1); },
    tear(t, g) {                                              // ripping: a falling noise sweep with crackle grains and a low thump
      const f = svf(), s = sweep(160, 50, 0.3);
      put(t, g * 0.8, 0, (i, tt) => { const x = Math.min(1, tt / 0.45); const grain = r() < 0.03 * (1 - x) ? (r() - 0.5) * 3 : 0;
        return f(r() - 0.5, 3800 - 3200 * x, 0.35) * (1 - x) * 1.6 + grain + s(tt) * env(tt, 0.003, 0.18) * 0.9; }, 0.6);
    },
    chime(t, g, c) {                                          // a check: bell in A minor pentatonic, rising with every step
      const steps = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27], f = 440 * Math.pow(2, steps[(c.step || 0) % steps.length] / 12);
      put(t, g * 0.22, ((c.step || 0) % 5 - 2) * 0.25, (i, tt) => (Math.sin(2 * Math.PI * f * tt) + 0.35 * Math.sin(2 * Math.PI * f * 2.01 * tt) * Math.exp(-tt / 0.25)) * env(tt, 0.002, 0.7), 1.6);
    },
    stab(t, g) {                                              // detuned saw chord stab
      const fs = [220, 261.6, 329.6, 440].flatMap(f => [f * 0.997, f * 1.003]), ph = fs.map(() => r());
      put(t, g * 0.16, 0, (i, tt) => fs.reduce((a, f, k) => a + (((tt * f + ph[k]) % 1) * 2 - 1), 0) / fs.length * 2.2 * env(tt, 0.003, 0.09) * (1 - Math.min(1, tt / 0.18)), 0.2);
    },
  };
  return {
    SR, N,
    cues(list) { for (const c of list) { const f = SFX[c.type]; if (!f) throw new Error('no sfx ' + c.type); f(c.t, c.gain, c); } },
    music(file, keys = [[0, 1], [duration, 1]], duck = 0.55) {
      music = decode(file, 2); duckAmt = duck;
      level = t => { for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [a, x] = keys[i - 1], [b, y] = keys[i]; const s = (t - a) / (b - a); return x + (y - x) * s * s * (3 - 2 * s); } return keys[keys.length - 1][1]; };
    },
    voice(lines) {                                            // [{ file, at, lead }] → narration bus, levelled to a steady speech RMS
      for (const ln of lines) { if (!ln.file) continue; const x = decode(ln.file), i0 = Math.round((ln.at - (ln.lead || 0)) * SR); for (let i = 0; i < x.length; i++) { const k = i0 + i; if (k >= 0 && k < N) voice[k] += x[i]; } }
      let s = 0, n = 0; for (let i = 0; i < N; i++) if (Math.abs(voice[i]) > 0.01) { s += voice[i] ** 2; n++; }
      const g = n ? 0.12 / Math.sqrt(s / n) : 0; for (let i = 0; i < N; i++) voice[i] = Math.tanh(voice[i] * g * 1.2) / 1.2;
    },
    write(wav, { video, mp4, musicGain = 0.55, sfxGain = 0.9, lufs = -14 } = {}) {
      // small room on the SFX bus
      const room = x => { const out = new Float32Array(N), buf = new Float32Array(N), taps = [[0.029, 0.5], [0.037, 0.42], [0.044, 0.36], [0.053, 0.3]].map(([d, g]) => [Math.round(d * SR), g]);
        for (let i = 0; i < N; i++) { let w = 0; for (const [d, g] of taps) if (i >= d) w += buf[i - d] * g; buf[i] = x[i] + w * 0.55; out[i] = x[i] + buf[i] * 0.064; } return out; };
      const sL = room(L), sR = room(R), data = Buffer.alloc(N * 8);
      let duck = 0; const att = Math.exp(-1 / (0.03 * SR)), rel = Math.exp(-1 / (0.35 * SR));
      for (let i = 0; i < N; i++) {
        const a = Math.abs(voice[i]); duck = a > duck ? att * duck + (1 - att) * a : rel * duck + (1 - rel) * a;
        const m = music ? level(i / SR) * (1 - duckAmt * Math.min(1, duck * 9)) * musicGain : 0;
        data.writeFloatLE((music ? music[2 * i] || 0 : 0) * m + sL[i] * sfxGain + voice[i], i * 8);
        data.writeFloatLE((music ? music[2 * i + 1] || 0 : 0) * m + sR[i] * sfxGain + voice[i], i * 8 + 4);
      }
      const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
      h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
      const raw = wav.replace(/\.wav$/, '.raw.wav'); writeFileSync(raw, Buffer.concat([h, data]));
      // two-pass loudnorm: a single pass undershoots on short clips
      const m = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', raw, '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=9:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
      const j = JSON.parse(m.slice(m.lastIndexOf('{'), m.lastIndexOf('}') + 1));
      ff(['-i', raw, '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=9:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, '-ar', String(SR), '-c:a', 'pcm_s16le', wav], 'loudnorm');
      if (video && mp4) ff(['-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', mp4], 'mux');
      return { wav, mp4 };
    },
  };
}
