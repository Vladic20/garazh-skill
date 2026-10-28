// ─── scene: element state at time t, enter/exit animation, camera, transitions, frame assembly ──
// window.TL is written by make.mjs (build/<lang>/timeline.js): absolute times only, no word cues left to resolve.
//   TL = { duration, captions, theme, scenes: [{ from, to, cam, transition:{type,dir,dOut,dIn,at?}, ground, particles, dark, items:[…] }], subs, talk }
//   item = { el:'char'|'prop', type, id, x, y, scale, rot, flip, z, t0, enter, enterDur, out, exit, then:[{ t, dur, …changes }], …type-specific }
const NUMERIC = ['x', 'y', 'scale', 'rot', 'tilt', 'opacity'];

function itemState(it, t) {
  const s = { ...it, poseK: 1, prevPose: it.pose, poseT: it.t0, antic: 0 };
  for (const c of it.then || []) {
    // anticipation: a small dip in the 0.14 s before a pose change (motion principle #2)
    if (c.pose && c.t > t) { const a = prog(t, c.t - .14, c.t); s.antic = Math.max(s.antic, Math.sin(a * Math.PI)); }
    if (c.t > t) continue;
    for (const k in c) {
      if (k === 't' || k === 'dur') continue;
      if (NUMERIC.includes(k) && typeof c[k] === 'number') {
        const from = s[k] ?? (k === 'scale' || k === 'opacity' ? 1 : 0);
        s[k] = lerp(from, c[k], easeInOut(prog(t, c.t, c.t + (c.dur ?? .6))));
      } else if (k === 'pose') {
        if (c.pose !== s.pose) { s.prevPose = s.pose; s.pose = c.pose; s.poseK = prog(t, c.t, c.t + (c.dur ?? .3)); s.poseT = c.t; }
      } else s[k] = c[k];
    }
  }
  return s;
}

// enter/exit: returns { tf (svg transform about the anchor), op } or null if invisible
function presence(s, t) {
  if (t < s.t0) return null;
  const d = s.enterDur ?? (s.enter === 'fade' ? .4 : .38), k = prog(t, s.t0, s.t0 + d);
  let sx = 1, sy = 1, dx = 0, dy = 0, op = s.opacity ?? 1;
  switch (s.enter || 'pop') {
    case 'pop': sx = sy = easeOutBack(k); op *= k > 0 ? 1 : 0; break;
    case 'fade': case 'write': op *= easeInOut(k); break;
    case 'drop': {   // fall, then squash on landing (squash & stretch)
      dy = -520 * (1 - easeOutBounceless(k));
      const land = prog(t, s.t0 + d, s.t0 + d + .22); if (land > 0 && land < 1) { const q = Math.sin(land * Math.PI) * .12; sy = 1 - q; sx = 1 + q; }
      break; }
    case 'rise': dy = 420 * (1 - easeOut(k)); break;
    case 'slide-left': dx = -1000 * (1 - easeOut(k)); break;
    case 'slide-right': dx = 1000 * (1 - easeOut(k)); break;
    case 'grow': sx = sy = easeOut(k); break;
  }
  if (s.out != null && t >= s.out) {
    const e = prog(t, s.out, s.out + .28);
    if (e >= 1) return null;
    if ((s.exit || 'pop') === 'pop') { sx *= 1 - easeInOut(e); sy *= 1 - easeInOut(e); } else op *= 1 - e;
  }
  if (op <= 0.001 || sx <= 0.001) return null;
  const tf = `translate(${f2(s.x + dx)} ${f2(s.y + dy)}) scale(${f2(sx)} ${f2(sy)}) translate(${f2(-s.x)} ${f2(-s.y)})`;
  return { tf, op };
}
const easeOutBounceless = k => 1 - Math.pow(1 - k, 2.4);

function itemSvg(it, t) {
  const s = itemState(it, t), pr = presence(s, t);
  if (!pr) return '';
  let body;
  if (s.el === 'char') {
    s.talking = (TL.talk || []).some(([a, b, id]) => id === s.id && t >= a && t < b);
    body = characterSvg(s, t);
  } else {
    const draw = PROPS[s.type] || (window.CUSTOM && CUSTOM[s.type]);
    if (!draw) throw new Error(`unknown prop type "${s.type}" (have: ${Object.keys(PROPS).join(', ')}${window.CUSTOM ? ', ' + Object.keys(CUSTOM).join(', ') : ''})`);
    const inner = draw(s, t, t - s.t0);
    body = s.type === 'arrow' ? inner : `<g transform="translate(${f2(s.x)} ${f2(s.y)}) rotate(${f2(s.rot || 0)}) scale(${f2((s.flip ? -1 : 1) * (s.scale ?? 1))} ${f2(s.scale ?? 1)})">${inner}</g>`;
  }
  return `<g transform="${pr.tf}" opacity="${f2(pr.op)}">${body}</g>`;
}

// cam.ease "glide": travel from where the previous scene's camera ended to `to` in ~1 s, then a slow live push (one
// connected camera path across keep-chains); "shake" = glide + a tremor; "from" = start this glide at cam.from (first shot).
const camEnd = new Map();
function glideCam(sc, t) {
  const c = sc.cam, i = TL.scenes.indexOf(sc);
  const end = j => { if (!camEnd.has(j)) camEnd.set(j, camAt(TL.scenes[j], TL.scenes[j].to)); return camEnd.get(j); };
  const from = i > 0 && c.ease !== 'from' ? end(i - 1) : (c.from || c.to), to = c.to;
  const gd = Math.min(1.05, (sc.to - sc.from) * .7), k = easeInOut(prog(t, sc.from, sc.from + gd));
  const drift = Math.exp(Math.log(1.035) * easeInOut(prog(t, sc.from + gd, Math.max(sc.to, sc.from + gd + 2))));
  const z = Math.exp(lerp(Math.log(from[2]), Math.log(to[2]), k)) * drift, cl = (v, a, b) => Math.min(b, Math.max(a, v));
  let x = cl(lerp(from[0], to[0], k), W / 2 / z, W - W / 2 / z), y = cl(lerp(from[1], to[1], k), H / 2 / z, H - H / 2 / z);
  if (c.ease === 'shake') { const a = 5 * clamp((t - sc.from) / .3); x += (Math.sin(t * 47) + Math.sin(t * 31) * .6) * a / z; y += Math.sin(t * 53 + 1) * a * .8 / z; }
  return [x, y, z];
}
function camAt(sc, t) {
  if (sc.cam && ['glide', 'shake', 'from'].includes(sc.cam.ease)) return glideCam(sc, t);
  const c = sc.cam || { from: [CX, CY, 1], to: [CX, CY, 1.06] }, k = easeInOut(prog(t, sc.from, sc.to));
  // zoom interpolated in log space so push-ins feel constant-speed
  return [lerp(c.from[0], c.to[0], k), lerp(c.from[1], c.to[1], k), Math.exp(lerp(Math.log(c.from[2]), Math.log(c.to[2]), k))];
}

function groundSvg() {   // slightly uneven pencil horizon
  const r = rng(5); let d = `M-200 ${GROUND}`;
  for (let x = -200; x <= W + 200; x += 80) d += ` L${x} ${f2(GROUND + (r() - .5) * 2.2)}`;
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
}

function sceneIndex(t) {
  const S = TL.scenes;
  for (let i = 0; i < S.length; i++) if (t >= S[i].from && t < S[i].to) return i;
  return S.length - 1;
}

// ─── transitions ───────────────────────────────────────────────────────────────
const e4in = k => k * k * k * k, e4out = k => 1 - Math.pow(1 - k, 4), e3in = k => k * k * k, e3out = k => 1 - Math.pow(1 - k, 3);
const expoOut = k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k);
const DIRV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const TRAVEL = 230 * Math.max(W, H) / 1920;   // partial travel ≈ 12% of the frame's long side
const COVER = Math.hypot(W, H) / 2 + 40;

// layer = { sc, dx, dy, s, op, blur, hblur, paper, clip, overlay, shade }
function applyOut(L, tr, k) {
  const [vx, vy] = DIRV[tr.dir] || DIRV.left;
  switch (tr.type) {
    case 'curve': { const e = e4in(k); L.dx += vx * TRAVEL * e; L.dy += vy * TRAVEL * e; L.op *= 1 - clamp(k * 1.15); L.blur = 7 * k; break; }
    case 'zoom': L.s *= lerp(1, 1.2, e3in(k)); L.op *= lerp(1, .15, k); L.blur = 6 * k; break;
    case 'pull': L.s *= lerp(1, .8, e3in(k)); L.op *= lerp(1, .15, k); L.blur = 6 * k; break;
    case 'whip': L.dx += vx * W * .55 * e3in(k); L.dy += vy * H * .55 * e3in(k); L.hblur = vy ? 0 : 22 * k; L.vblur = vy ? 22 * k : 0; break;
    case 'iris': L.overlay = irisSvg(tr.from || [CX, CY], COVER * (1 - e3in(k))); break;
    case 'fade': L.op *= 1 - easeInOut(k); break;
  }
}
function applyIn(L, prevL, tr, k) {
  const [vx, vy] = DIRV[tr.dir] || DIRV.left;
  switch (tr.type) {
    case 'curve': { const r = 1 - e4out(k); L.dx -= vx * TRAVEL * r; L.dy -= vy * TRAVEL * r; L.op *= .35 + .65 * clamp(k * 2.2); L.blur = 7 * (1 - k); break; }
    case 'zoom': L.s *= lerp(.75, 1, expoOut(k)); L.op *= lerp(.15, 1, expoOut(k)); L.blur = 6 * (1 - k); break;
    case 'pull': L.s *= lerp(1.25, 1, expoOut(k)); L.op *= lerp(.15, 1, expoOut(k)); L.blur = 6 * (1 - k); break;
    case 'whip': { const r = 1 - e3out(k); L.dx -= vx * W * .55 * r; L.dy -= vy * H * .55 * r; L.hblur = vy ? 0 : 22 * (1 - k); L.vblur = vy ? 22 * (1 - k) : 0; break; }
    case 'iris': L.overlay = irisSvg(tr.at || [CX, CY], COVER * e3out(k)); break;
    case 'fade': L.op *= easeInOut(k); break;
    case 'wipe': { L.paper = true; L.clip = wipeClip(vx, vy, easeInOut(k)); L.edge = wipeEdge(vx, vy, easeInOut(k)); break; }
    case 'page': { const e = easeInOut(k); L.paper = true; L.dx -= vx * W * (1 - e); L.dy -= vy * H * (1 - e); L.shadow = [vx, vy];
      if (prevL) { prevL.dx += vx * 50 * e; prevL.dy += vy * 50 * e; prevL.shade = .25 * e; } break; }
  }
}
function irisSvg([cx, cy], r) {
  r = Math.max(0, r);
  return `<path fill-rule="evenodd" fill="${INK}" d="M-20 -20H${W + 20}V${H + 20}H-20Z M${f2(cx - r)} ${f2(cy)} a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0 a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z"/>
    <circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="none" stroke="${INK}" stroke-width="5"/>`;
}
// revealed region of a wipe moving in direction (vx,vy): a polygon with a ragged pencil edge
function wipePoly(vx, vy, e) {
  const r = rng(31), pts = [], N = 14;
  if (vx) {   // horizontal: edge is a vertical ragged line at x
    const x = vx < 0 ? W + 60 - (W + 120) * e : -60 + (W + 120) * e;
    for (let i = 0; i <= N; i++) pts.push([x + (r() - .5) * 26, -20 + i * (H + 40) / N]);
    return vx < 0 ? [...pts, [W + 40, H + 20], [W + 40, -20]] : [...pts, [-40, H + 20], [-40, -20]];
  }
  const y = vy < 0 ? H + 60 - (H + 120) * e : -60 + (H + 120) * e;
  for (let i = 0; i <= N; i++) pts.push([-20 + i * (W + 40) / N, y + (r() - .5) * 26]);
  return vy < 0 ? [...pts, [W + 20, H + 40], [-20, H + 40]] : [...pts, [W + 20, -40], [-20, -40]];
}
function wipeClip(vx, vy, e) { return wipePoly(vx, vy, e); }
function wipeEdge(vx, vy, e) {
  const p = wipePoly(vx, vy, e).slice(0, 15);
  return `<path d="M${p.map(q => q.map(f2).join(' ')).join(' L')}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M${p.map(q => [q[0] + (vx ? -vx * 9 : 0), q[1] + (vy ? -vy * 9 : 0)].map(f2).join(' ')).join(' L')}" fill="none" stroke="${INK}" stroke-width="1.5" opacity=".6"/>`;
}

function layersAt(t) {
  const S = TL.scenes, i = sceneIndex(t), sc = S[i], next = S[i + 1];
  const L = { sc, dx: 0, dy: 0, s: 1, op: 1, blur: 0 };
  const layers = [L];
  if (next && next.transition && next.transition.dOut > 0 && t >= next.from - next.transition.dOut) applyOut(L, next.transition, prog(t, next.from - next.transition.dOut, next.from));
  const tr = sc.transition;
  if (i > 0 && tr && tr.dIn > 0 && t < sc.from + tr.dIn && tr.type !== 'none' && tr.type !== 'cut') {
    let prevL = null;
    if (tr.type === 'wipe' || tr.type === 'page') { prevL = { sc: S[i - 1], dx: 0, dy: 0, s: 1, op: 1, blur: 0 }; layers.unshift(prevL); }
    applyIn(L, prevL, tr, prog(t, sc.from, sc.from + tr.dIn));
  }
  return layers;
}

function layerSvg(L, t, idx) {
  const sc = L.sc, [cx, cy, z] = camAt(sc, t);
  const items = [...sc.items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map(it => itemSvg(it, t)).join('');
  const SL = setLayers(sc, t);   // environment + weather (engine/sets.js)
  const cam = `translate(${f2(CX - cx * z)} ${f2(CY - cy * z)}) scale(${f2(z)})`;
  const pz = 1 + (z - 1) * .5, pcam = `translate(${f2(CX - (CX + (cx - CX) * .5) * pz)} ${f2(CY - (CY + (cy - CY) * .5) * pz)}) scale(${f2(pz)})`;
  const tf = `translate(${f2(L.dx)} ${f2(L.dy)}) translate(${CX} ${CY}) scale(${f2(L.s)}) translate(${-CX} ${-CY})`;
  const fl = L.hblur > .5 ? `filter="url(#hblur${Math.min(4, Math.ceil(L.hblur / 6))})"` : L.vblur > .5 ? `filter="url(#vblur${Math.min(4, Math.ceil(L.vblur / 6))})"` : L.blur > .5 ? `filter="url(#blur${Math.min(8, Math.round(L.blur))})"` : '';
  const clipId = `wc${idx}`;
  const clip = L.clip ? `<clipPath id="${clipId}"><path d="M${L.clip.map(q => q.map(f2).join(' ')).join(' L')}Z"/></clipPath>` : '';
  const paper = L.paper ? `<rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="url(#paperGrad)"/>` : '';
  const shadow = L.shadow ? pageShadow(L.shadow) : '';
  const dark = sc.dark ? `<rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="${THEME.dark}" opacity=".72"/>` : '';
  return `${clip}<g transform="${tf}" opacity="${f2(clamp(L.op))}" ${fl} ${L.clip ? `clip-path="url(#${clipId})"` : ''}>${shadow}${paper}${dark}
      <g filter="${boilFilter(t)}"><g transform="${pcam}">${particles(t, sc.particles ?? 1)}</g><g transform="${cam}">${SL.back}${sc.ground === false || SL.noGround ? '' : groundSvg()}${items}${SL.front}${SL.weather}</g></g>
      ${L.shade ? `<rect width="${W}" height="${H}" fill="#000" opacity="${f2(L.shade)}"/>` : ''}
    </g>${L.edge || ''}${L.overlay || ''}`;
}
function pageShadow([vx, vy]) {   // soft shadow on the leading edge of a sliding sheet
  if (vx) { const x = vx < 0 ? -26 : W; return `<rect x="${x}" y="-40" width="26" height="${H + 80}" fill="#000" opacity=".18"/>`; }
  const y = vy < 0 ? -26 : H; return `<rect x="-40" y="${y}" width="${W + 80}" height="26" fill="#000" opacity=".18"/>`;
}

function frameSvg(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${layersAt(t).map((L, i) => layerSvg(L, t, i)).join('')}
    ${filmDamage(t)}
  </svg>`;
}

function captionHtml(t) {
  if (!TL.captions) return '';
  const ph = (TL.subs || []).find(p => t >= p.from && t < p.to);
  if (!ph) return '';
  return `<div class="cap">${ph.words.map(([w, wt]) => `<span class="${t >= wt ? 'on' : ''}">${esc(w)}</span>`).join(' ')}</div>`;
}

window.render = function (t) {
  document.getElementById('art').innerHTML = frameSvg(t);
  document.getElementById('ui').innerHTML = captionHtml(t);
  const fi = Math.round(t * 30), sc = TL.scenes[sceneIndex(t)];
  document.querySelectorAll('.grain').forEach((g, i) => g.style.display = i === Math.floor(fi / 2) % 6 ? 'block' : 'none');
  // projector flicker + a short flash on hard cuts
  const cut = sc.from > 0 && sc.transition && sc.transition.type === 'cut' ? Math.max(0, 1 - (t - sc.from) / .1) : 0;
  document.getElementById('flicker').style.opacity = (0.04 + 0.035 * Math.sin(fi * 2.7) * Math.sin(fi * 1.3) + cut * .35).toFixed(3);
  // fade from/to paper at the very start and end
  const fade = Math.max(prog(t, 0, .35) < 1 ? 1 - prog(t, 0, .35) : 0, prog(t, TL.duration - .6, TL.duration));
  document.getElementById('fade').style.opacity = fade.toFixed(3);
};
