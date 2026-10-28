// ─── look "marker": a hand draws the explanation with felt-tip markers on a gridded sheet ─────────────────────────
// "look": "marker", "set": "sheet" (paper, grid, margin). Black outlines first, red for problems (crosses, rings, "!"),
// green / blue for the fixes that cut into the drawing, handwritten numbers and calculations next to the parts.
// Prop "sk" = a drawing: { shapes: [...], obj: "<name>" (MK_OBJ generator), speed (px/s, 650), dur (s, fits all strokes) }.
// Shapes (world coords): l line {p:[[x,y],…], close} · r rect {x,y,w,h} · o circle/arc {x,y,r,a0,a1} · q curve {p:[a,c,b]}
//   a arrow {from,to,bend} · x cross {x,y,r} · v check {x,y,s} · z spring {x,y0,y1,w,n} · h hatch {x,y,w,h,gap}
//   f highlighter fill {x,y,w,h} · t text {x,y,s,size,anchor} · u underline {x,y,w} · d dimension {from,to,text}
//   every shape: c ("k" black, "r" red, "g" green, "b" blue, "o" orange, "y" yellow or #hex), w (width), op.
// Prop "hand" (add once, z 999): the hand with a marker follows whatever is being drawn right now.
(function () {
  const INK = { k: '#1f2024', r: '#e5322d', g: '#1e9e4a', b: '#2470d8', o: '#f08a24', y: '#ffd23f', p: '#8a4fd0', w: '#ffffff' };
  const col = c => INK[c] || c || INK.k;
  const HANDF = `Hand, 'Neucha', sans-serif`;
  window.MK = { INK, col };

  if (isLook('marker')) {
    addCss(`
      .look-marker .grain { opacity: .035; }
      .look-marker #vignette { background: radial-gradient(ellipse 90% 80% at 50% 45%, transparent 62%, rgba(40,40,50,.16) 100%) !important; }
      .look-marker #flicker { display: none; }
      .look-marker #fade { background: #fbfaf6 !important; }
      .mk-cap { position: absolute; left: 50%; bottom: 176px; transform: translateX(-50%); width: max-content; max-width: 600px; text-align: center;
        background: rgba(251,250,246,.9); border-radius: 14px; padding: 4px 16px 8px; box-shadow: 0 2px 8px rgba(30,30,40,.08);
        font: 400 46px/1.04 Hand, Neucha, sans-serif; color: #1f2024; letter-spacing: .3px;
        text-shadow: 0 0 6px #fbfaf6, 0 0 10px #fbfaf6, 0 0 3px #fbfaf6; }
      .mk-cap span { display: inline-block; margin: 0 .1em; }
      .mk-cap .r { color: #e5322d; } .mk-cap .g { color: #1e9e4a; } .mk-cap .b { color: #2470d8; } .mk-cap .o { color: #e07a14; }
    `);
    filmDamage = () => '';
    boilFilter = () => 'none';
    groundSvg = () => '';
    particles = () => '';
  }

  // ── paper: warm white sheet with a faint 24 px grid and a red margin line ──
  SETS_LIB.sheet = function (o, t) {
    let s = `<rect x="-80" y="-80" width="${W + 160}" height="${H + 160}" fill="${o.paper || '#fbfaf6'}"/>`;
    const g = o.grid ?? 24;
    if (g) { let d = ''; for (let x = 0; x <= W; x += g) d += `M${x} -80V${H + 80}`; for (let y = 0; y <= H; y += g) d += `M-80 ${y}H${W + 80}`;
      s += `<path d="${d}" stroke="${o.gridColor || '#dde5ee'}" stroke-width="1"/>`; }
    if (o.margin !== false) s += `<path d="M${o.margin ?? 34} -80V${H + 80}" stroke="#f2b8b5" stroke-width="2"/>`;
    return { back: s, noGround: true };
  };

  // ── geometry: shapes → strokes [{ pts, c, w, op, hl, text }] with a hand-drawn wobble ──
  const wob = (pts, seed, amp = .9) => {
    const r = rng(seed), out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 18)), nx = -(y1 - y0) / (L || 1), ny = (x1 - x0) / (L || 1);
      for (let j = 0; j < n; j++) { const k = j / n, o = (j === 0 && i === 0) ? 0 : (r() - .5) * 2 * amp; out.push([x0 + (x1 - x0) * k + nx * o, y0 + (y1 - y0) * k + ny * o]); }
    }
    out.push(pts[pts.length - 1]); return out;
  };
  const arcPts = (x, y, r, a0 = 0, a1 = 360, ry) => { const n = Math.max(12, Math.round(Math.abs(a1 - a0) / 8)), o = [];
    for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([x + Math.cos(a) * r, y + Math.sin(a) * (ry ?? r)]); } return o; };
  const qPts = (a, c, b, n = 20) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n, u = 1 - k; return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1]]; });
  const textW = (s, size) => [...String(s)].length * size * .47;
  function toStrokes(sh, seed) {
    // stroke width: shapes with a geometric width (r, h, f, u, s, dots) take it from w2, the others from w
    const geo = ['r', 'h', 'f', 'u', 's', 'dots'].includes(sh.k), c = col(sh.c), w = (geo ? sh.w2 : sh.w) ?? (sh.k === 'f' ? 22 : sh.k === 'h' ? 2.5 : 4.5), base = { c, w, op: sh.op ?? 1 }, S = [];
    const line = (pts, extra = {}) => S.push({ ...base, ...extra, pts: sh.k === 'f' || sh.raw ? pts : wob(pts, seed + S.length * 7, sh.wob ?? .9) });
    switch (sh.k) {
      case 'l': line(sh.close ? [...sh.p, sh.p[0]] : sh.p); break;
      case 'r': { const { x, y, w: ww, h } = sh; line([[x, y], [x + ww, y], [x + ww, y + h], [x, y + h], [x, y - 1]]); break; }
      case 'o': line(arcPts(sh.x, sh.y, sh.r, sh.a0 ?? -100, sh.a1 ?? 262, sh.ry)); break;
      case 'q': line(qPts(...sh.p)); break;
      case 'a': { const [a, b] = [sh.from, sh.to], bend = sh.bend ?? .18, mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * bend, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * bend;
        const P = qPts(a, [mx, my], b), e = P[P.length - 1], p = P[P.length - 4], ang = Math.atan2(e[1] - p[1], e[0] - p[0]), hl = sh.head ?? 18;
        line(P); line([[e[0] + Math.cos(ang + 2.6) * hl, e[1] + Math.sin(ang + 2.6) * hl], e, [e[0] + Math.cos(ang - 2.6) * hl, e[1] + Math.sin(ang - 2.6) * hl]]); break; }
      case 'x': { const r = sh.r || 30; line([[sh.x - r, sh.y - r * .9], [sh.x + r, sh.y + r * .9]], { w: sh.w ?? 7 }); line([[sh.x + r, sh.y - r * .9], [sh.x - r, sh.y + r * .9]], { w: sh.w ?? 7 }); break; }
      case 'v': { const s = sh.s || 22; line([[sh.x - s * .6, sh.y - s * .05], [sh.x - s * .1, sh.y + s * .45], [sh.x + s * .8, sh.y - s * .6]], { w: sh.w ?? 6 }); break; }
      case 'z': { const n = sh.n || 6, ww = sh.w2 || 18, P = [[sh.x, sh.y0]]; for (let i = 1; i < n * 2; i++) P.push([sh.x + (i % 2 ? ww : -ww) / 2 * 1.0, sh.y0 + (sh.y1 - sh.y0) * i / (n * 2)]); P.push([sh.x, sh.y1]); S.push({ ...base, pts: P }); break; }
      case 'h': { const g = sh.gap || 14, { x, y, w: ww, h } = sh;   // 45° hatch clipped to the rect
        for (let d = g; d < ww + h; d += g) { const a = [x + Math.max(0, d - h), y + Math.min(h, d)], b = [x + Math.min(ww, d), y + Math.max(0, d - ww)]; line([a, b]); } break; }
      case 'f': { const { x, y, w: ww, h } = sh, g = w * .8, P = []; for (let yy = y + g / 2, i = 0; yy < y + h; yy += g, i++) P.push(i % 2 ? [x + ww, yy] : [x, yy], i % 2 ? [x, yy] : [x + ww, yy]);
        S.push({ ...base, op: sh.op ?? .32, hl: true, pts: P }); break; }
      case 't': { const tw = textW(sh.s, sh.size || 32), x0 = sh.anchor === 'middle' ? sh.x - tw / 2 : sh.anchor === 'end' ? sh.x - tw : sh.x;
        S.push({ ...base, text: String(sh.s), size: sh.size || 32, x0, y: sh.y, tw, pts: [[x0, sh.y], [x0 + tw, sh.y]] }); break; }
      case 'u': line([[sh.x, sh.y], [sh.x + sh.w, sh.y + (sh.tilt || -3)]]); break;
      case 'd': { const [a, b] = [sh.from, sh.to], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(ang) * 10, ny = Math.cos(ang) * 10;
        line([a, b], { w: 2.5 }); line([[a[0] - nx, a[1] - ny], [a[0] + nx, a[1] + ny]], { w: 2.5 }); line([[b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]], { w: 2.5 });
        if (sh.text) { const sz = sh.size || 24, tw = textW(sh.text, sz), mx = (a[0] + b[0]) / 2 + (sh.tx || 0), my = (a[1] + b[1]) / 2 + (sh.ty ?? -10);
          S.push({ ...base, text: sh.text, size: sz, x0: mx - tw / 2, y: my, tw, pts: [[mx - tw / 2, my], [mx + tw / 2, my]] }); } break; }
      case 's': { const r = rng(seed), P = []; for (let i = 0; i < (sh.n || 14); i++) P.push([sh.x + r() * sh.w, sh.y + r() * sh.h]); S.push({ ...base, pts: qSmooth(P) }); break; }
      case 'dots': { const r = rng(seed); for (let i = 0; i < (sh.n || 20); i++) { const x = sh.x + r() * sh.w, y = sh.y + r() * sh.h; S.push({ ...base, w: sh.w2 ?? 6, pts: [[x, y], [x + .5, y + .5]] }); } break; }
    }
    return S;
  }
  const qSmooth = P => { const o = [P[0]]; for (let i = 1; i < P.length - 1; i++) o.push(...qPts([(P[i - 1][0] + P[i][0]) / 2, (P[i - 1][1] + P[i][1]) / 2], P[i], [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2], 6)); o.push(P[P.length - 1]); return o; };
  const plen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  function partial(pts, k) {
    const L = plen(pts) * k; if (k >= 1) return pts; let acc = 0; const o = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= L) { const u = d ? (L - acc) / d : 0; o.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); return o; }
      acc += d; o.push(pts[i]); }
    return o;
  }

  // ── series helpers (use as "obj"): one title / summary / CTA grammar for every episode of a series ──
  // mkTitle { text, num ("3" → a red "№3" ring), sub }; mkHead { text ("ИТОГ") }; mkResult { lines: [..], top (), c ("g") } boxed
  // mkRows { rows: [[problem, fix], …], top (), step (72) } problem struck in red → fix in green ✓; mkCta { text, sub, top () }
  window.MK_OBJ = window.MK_OBJ || {};
  const fit = (s, size, max) => Math.min(size, max / Math.max(1, [...String(s)].length * .47));
  Object.assign(MK_OBJ, {
    mkTitle: p => { const sz = fit(p.text, 44, 560), tw = textW(p.text, sz); const o = [{ k: 't', x: 380, y: 104, s: p.text, size: sz, anchor: 'middle' }, { k: 'u', x: 380 - tw / 2 - 4, y: 118, w: tw + 8, w2: 5 }];
      if (p.num) o.unshift({ k: 't', x: 50, y: 112, s: '№' + p.num, size: 30, c: 'r', anchor: 'middle' }, { k: 'o', x: 50, y: 102, r: 30, c: 'r', w: 3.5 });
      if (p.sub) o.push({ k: 't', x: 380, y: 160, s: p.sub, size: 28, anchor: 'middle', c: '#8a8f98' });
      return o; },
    mkHead: p => [{ k: 't', x: 360, y: p.top || 150, s: p.text || 'ИТОГ', size: 56, anchor: 'middle' }, { k: 'u', x: 360 - textW(p.text || 'ИТОГ', 56) / 2 - 6, y: (p.top || 150) + 16, w: textW(p.text || 'ИТОГ', 56) + 12, w2: 5 }],
    mkResult: p => { const L = p.lines || [], y0 = p.top || 250, sz = Math.min(...L.map(s => fit(s, 50, 580))), h = L.length * sz * 1.25 + 30;
      return [...L.map((s, i) => ({ k: 't', x: 360, y: y0 + 18 + (i + .8) * sz * 1.25, s, size: sz, anchor: 'middle', c: p.c || 'g' })), { k: 'r', x: 60, y: y0, w: 600, h, c: p.c || 'g', w2: 5 }]; },
    mkRows: p => { const y0 = p.top || 480, st = p.step || 78; return (p.rows || []).flatMap(([a, b], i) => {
      const y = y0 + i * st, sa = fit(a, 36, 230), wa = textW(a, sa), x1 = 60 + wa + 16, sb = fit(b, 36, 640 - x1 - 70 - 50), wb = textW(b, sb);
      return [{ k: 't', x: 60, y, s: a, size: sa, c: 'r' }, { k: 'l', p: [[56, y - sa * .32], [64 + wa, y - sa * .32]], c: 'r', w: 4 },
        { k: 'a', from: [x1, y - 12], to: [x1 + 50, y - 12], bend: 0, head: 13 }, { k: 't', x: x1 + 64, y, s: b, size: sb, c: 'g' }, { k: 'v', x: Math.min(670, x1 + 64 + wb + 26), y: y - 14, s: 24, c: 'g' }]; }); },
    mkCta: p => { const y = p.top || 840; return [{ k: 't', x: 360, y, s: p.text || 'Что нарисовать дальше?', size: fit(p.text || 'Что нарисовать дальше?', 50, 620), anchor: 'middle' },
      { k: 'a', from: [360, y + 26], to: [360, y + 110], bend: .15 }, { k: 't', x: 360, y: y + 150, s: p.sub || 'пишите идеи в комментариях', size: 36, anchor: 'middle', c: 'b' }]; },
  });

  // ── schedule: each prop's strokes laid out in time from its t0 (cached per item) ──
  window.MK_OBJ = window.MK_OBJ || {};
  const cache = new Map();   // keyed by id + t0: the renderer hands props over as per-frame copies
  function schedule(p) {
    const ck = p.id + ":" + p.t0; if (cache.has(ck)) return cache.get(ck);
    const shapes = [...(p.obj ? MK_OBJ[p.obj](p) : []), ...(p.shapes || [])];
    let strokes = []; shapes.forEach((sh, i) => strokes.push(...toStrokes(sh, (p.seed || 1) * 131 + i * 17)));
    const sp = p.speed || 650, lift = p.lift ?? .06;
    let dur = strokes.map(s => s.text != null ? Math.max(.12, s.text.length * .055) : s.hl ? Math.max(.1, plen(s.pts) / (sp * 2.2)) : Math.max(.05, plen(s.pts) / sp));
    let total = dur.reduce((a, b) => a + b, 0) + lift * Math.max(0, strokes.length - 1);
    if (p.dur) { const f = (p.dur - lift * Math.max(0, strokes.length - 1)) / (total - lift * Math.max(0, strokes.length - 1)); dur = dur.map(d => d * Math.max(.15, f)); total = p.dur; }
    let tt = p.t0; strokes = strokes.map((s, i) => { const o = { ...s, a: tt, b: tt + dur[i] }; tt += dur[i] + lift; return o; });
    const r = { strokes, end: tt - lift }; cache.set(ck, r); return r;
  }
  window.MK.schedule = schedule;
  const DRAWN = new Set(['sk']);
  window.MK.DRAWN = DRAWN;

  function strokeSvg(s, k) {
    if (k <= 0) return '';
    if (s.text != null) {
      const id = `mt${Math.round(s.x0 * 10)}_${Math.round(s.y * 10)}`;
      const txt = `<text x="${f2(s.x0)}" y="${f2(s.y)}" font-family="${HANDF}" font-size="${s.size}" fill="${s.c}" opacity="${s.op}">${esc(s.text)}</text>`;
      if (k >= 1) return txt;
      return `<clipPath id="${id}"><rect x="${f2(s.x0 - 6)}" y="${f2(s.y - s.size * 1.1)}" width="${f2((s.tw + 12) * k)}" height="${f2(s.size * 1.5)}"/></clipPath><g clip-path="url(#${id})">${txt}</g>`;
    }
    const P = partial(s.pts, k); if (P.length < 2) return '';
    const d = 'M' + P.map(q => q.map(f2).join(' ')).join(' L');
    if (s.hl) return `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="${s.w}" stroke-linecap="square" stroke-linejoin="round" opacity="${s.op}" style="mix-blend-mode:multiply"/>`;
    return `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round" opacity="${f2(.94 * s.op)}"/>`;
  }
  PROPS.sk = function (p, t, lt) {
    const S = schedule(p), done = p.enter === 'none';
    return `<g transform="translate(${-p.x} ${-p.y})">${S.strokes.map(s => strokeSvg(s, done ? 1 : clamp((t - s.a) / (s.b - s.a)))).join('')}</g>`;
  };
  // drawn props never pop or scale in: the drawing itself is the entrance
  const _presence = presence;
  presence = function (s, t) {
    if (DRAWN.has(s.type) && s.enter !== 'none') return t < s.t0 - .001 ? null : (s.out != null && t >= s.out ? null : { tf: '', op: s.opacity ?? 1 });
    return _presence(s, t);
  };

  // ── the hand ──
  function activeStrokes(t) {
    const sc = TL.scenes[sceneIndex(t)], out = [];
    for (const it of sc.items) if (DRAWN.has(it.type) && it.enter !== 'none') out.push(...schedule(it).strokes);
    return out.sort((a, b) => a.a - b.a);
  }
  const REST = [230, 380];   // offset from the last point towards the lower right, where the hand leaves
  function handState(t) {
    const S = activeStrokes(t); if (!S.length) return null;
    const tip = (s, k) => { if (s.text != null) return [s.x0 + s.tw * k, s.y + 4]; const P = partial(s.pts, clamp(k)); return P[P.length - 1]; };
    let prev = null, next = null;
    for (const s of S) { if (t >= s.a && t <= s.b) return { p: tip(s, (t - s.a) / (s.b - s.a)), c: s.c, draw: true, hl: s.hl };
      if (s.b < t && (!prev || s.b > prev.b)) prev = s; if (s.a > t && (!next || s.a < next.a)) next = s; }
    const pe = prev && tip(prev, 1), ns = next && tip(next, 0);
    if (prev && next && next.a - prev.b < 1.4) { const k = easeInOut((t - prev.b) / (next.a - prev.b)); return { p: [lerp(pe[0], ns[0], k), lerp(pe[1], ns[1], k) - Math.sin(k * Math.PI) * 26], c: next.c, lift: Math.sin(k * Math.PI) }; }
    if (prev && t - prev.b < .55) { const k = easeInOut((t - prev.b) / .55); return { p: [pe[0] + REST[0] * k * k, pe[1] + REST[1] * k * k], c: prev.c, lift: k }; }
    if (next && next.a - t < .55) { const k = easeInOut(1 - (next.a - t) / .55); return { p: [ns[0] + REST[0] * (1 - k) ** 2, ns[1] + REST[1] * (1 - k) ** 2], c: next.c, lift: 1 - k }; }
    return null;
  }
  // hand + marker, tip at 0,0, the arm goes down-right
  function handSvg(c, t, draw, lift) {
    const jit = draw ? Math.sin(t * 31) * 1.2 : 0, sc = 1 + (lift || 0) * .04;
    const K = '#1f2024', skin = '#f2c6a0', skin2 = '#e2a983', sleeve = '#2f4f6f';
    return `<g transform="rotate(${f2(jit)}) scale(${f2(sc)})">
      <g opacity=".14" transform="translate(${f2(10 + (lift || 0) * 14)} ${f2(12 + (lift || 0) * 18)})"><path d="M0 0 L60 92 L130 150 L250 330 L330 300 L190 110 L120 40 Z" fill="#000"/></g>
      <g transform="rotate(56)">
        <path d="M0 0 L16 -6 L16 6 Z" fill="${c}" stroke="${K}" stroke-width="2"/>
        <rect x="14" y="-10" width="150" height="20" rx="6" fill="#f4f4f2" stroke="${K}" stroke-width="3"/>
        <rect x="20" y="-10" width="18" height="20" fill="${c}" stroke="${K}" stroke-width="2.5"/>
        <rect x="150" y="-11" width="22" height="22" rx="5" fill="${c}" stroke="${K}" stroke-width="3"/>
        <path d="M150 34 C 210 40 250 30 300 30 L 300 -38 C 250 -40 200 -48 160 -40 Z" fill="${sleeve}" stroke="${K}" stroke-width="3"/>
        <path d="M58 -14 C 70 -40 110 -48 150 -42 C 175 -38 185 -10 182 10 C 178 34 150 44 120 40 C 96 37 80 30 66 22 C 52 14 50 0 58 -14 Z" fill="${skin}" stroke="${K}" stroke-width="3"/>
        <path d="M44 -10 C 52 -22 74 -24 88 -16 C 96 -11 92 -2 82 -2 C 70 -3 60 -2 50 -4 C 44 -5 42 -7 44 -10 Z" fill="${skin}" stroke="${K}" stroke-width="3"/>
        <path d="M70 12 C 80 22 96 26 112 24 M84 4 C 96 10 110 12 124 10" fill="none" stroke="${skin2}" stroke-width="3" stroke-linecap="round"/>
        <path d="M62 14 C 66 24 80 30 92 30" fill="none" stroke="${K}" stroke-width="2.5" stroke-linecap="round"/>
      </g></g>`;
  }
  PROPS.hand = function (p, t) {
    const h = handState(t); if (!h) return '';
    return `<g transform="translate(${f2(h.p[0] - p.x)} ${f2(h.p[1] - p.y)})">${handSvg(h.c, t, h.draw, h.lift)}</g>`;
  };

  // ── sound: a squeak for every stroke run, a tick for each check mark ──
  if (isLook('marker')) window.sfxEvents = function () {
    const ev = [], seen = new Set();
    for (const sc of TL.scenes) for (const it of sc.items) {
      if (!DRAWN.has(it.type) || it.enter === 'none') continue;
      const key = it.id + ':' + it.t0; if (seen.has(key)) continue; seen.add(key);
      for (const s of schedule(it).strokes) {
        if (s.text != null) ev.push({ t: s.a, dur: s.b - s.a, kind: 'marker', gain: .8 });
        else ev.push({ t: s.a, dur: Math.max(.06, s.b - s.a), kind: 'marker', gain: s.hl ? .55 : 1 });
      }
    }
    // merge overlapping / touching squeaks into runs
    ev.sort((a, b) => a.t - b.t); const out = [];
    for (const e of ev) { const l = out[out.length - 1]; if (l && e.t - (l.t + l.dur) < .03) l.dur = Math.max(l.dur, e.t + e.dur - l.t); else out.push({ ...e }); }
    return out;
  };

  // ── captions: handwritten, words appear as spoken, coloured by stems from the "ui" prop's colors ──
  PROPS.ui = PROPS.ui || (() => '');
  let COLORS = null;
  const stem = w => w.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9°%]/g, '');
  function wordClass(w) {
    if (!COLORS) { COLORS = {}; for (const sc of TL.scenes) for (const it of sc.items) if (it.type === 'ui' && it.colors) { COLORS = it.colors; break; } }
    const s = stem(w); if (!s) return '';
    for (const cls of ['r', 'g', 'b', 'o']) for (const key of COLORS[cls] || []) { const k2 = stem(key); if (k2 && (s === k2 || (k2.length >= 4 && s.startsWith(k2)))) return cls; }
    return '';
  }
  if (isLook('marker')) captionHtml = function (t) {
    if (!TL.captions) return '';
    const ph = (TL.subs || []).find(p => t >= p.from && t < p.to); if (!ph) return '';
    const vis = ph.words.filter(([, wt]) => t >= wt - .04); if (!vis.length) return '';
    return `<div class="mk-cap">${vis.map(([w, wt]) => { const k = clamp((t - wt + .04) / .14);
      return `<span class="${wordClass(w)}" style="transform:translateY(${f2(8 * (1 - easeOut(k)))}px);opacity:${f2(.3 + .7 * k)}">${esc(w.replace(/[«»"]/g, ''))}</span>`; }).join('')}</div>`;
  };
})();
