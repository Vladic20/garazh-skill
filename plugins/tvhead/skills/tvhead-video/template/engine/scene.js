// ─── scene: element state at time t, enter/exit animation, camera, frame assembly ──
// window.TL is written by make.mjs (build/<ep>/timeline.js): absolute times only, no word cues left to resolve.
//   TL = { duration, captions, scenes: [{ from, to, cam:{from:[cx,cy,s], to:[cx,cy,s]}, ground, particles, dark, flash, items:[…] }], subs:[{from,to,words:[[w,t]]}], talk:[[a,b,id]] }
//   item = { el:'char'|'prop', type, id, x, y, scale, rot, flip, z, t0, enter, enterDur, out, exit, then:[{ t, dur, …changes }], …type-specific }
const NUMERIC = ['x', 'y', 'scale', 'rot', 'tilt', 'opacity'];

function itemState(it, t) {
  const s = { ...it, poseK: 1, prevPose: it.pose };
  for (const c of it.then || []) {
    if (c.t > t) break;
    for (const k in c) {
      if (k === 't' || k === 'dur') continue;
      if (NUMERIC.includes(k) && typeof c[k] === 'number') {
        const from = s[k] ?? (k === 'scale' || k === 'opacity' ? 1 : 0);
        s[k] = lerp(from, c[k], easeInOut(prog(t, c.t, c.t + (c.dur ?? .6))));
      } else if (k === 'pose') {
        if (c.pose !== s.pose) { s.prevPose = s.pose; s.pose = c.pose; s.poseK = prog(t, c.t, c.t + (c.dur ?? .3)); }
      } else s[k] = c[k];
    }
  }
  return s;
}

// enter/exit: returns { tf (svg transform about the anchor), op } or null if invisible
function presence(s, t) {
  if (t < s.t0) return null;
  const d = s.enterDur ?? (s.enter === 'fade' ? .4 : .38), k = prog(t, s.t0, s.t0 + d);
  let sc = 1, dx = 0, dy = 0, op = s.opacity ?? 1;
  switch (s.enter || 'pop') {
    case 'pop': sc = easeOutBack(k); op *= k > 0 ? 1 : 0; break;
    case 'fade': case 'write': op *= easeInOut(k); break;
    case 'drop': dy = -520 * (1 - easeOutBack(k)); break;
    case 'rise': dy = 420 * (1 - easeOut(k)); break;
    case 'slide-left': dx = -1000 * (1 - easeOut(k)); break;
    case 'slide-right': dx = 1000 * (1 - easeOut(k)); break;
    case 'grow': sc = easeOut(k); break;
  }
  if (s.out != null && t >= s.out) {
    const e = prog(t, s.out, s.out + .3);
    if (e >= 1) return null;
    if ((s.exit || 'pop') === 'pop') sc *= 1 - easeInOut(e); else op *= 1 - e;
  }
  if (op <= 0.001 || sc <= 0.001) return null;
  const tf = `translate(${f2(s.x + dx)} ${f2(s.y + dy)}) scale(${f2(sc)}) translate(${f2(-s.x)} ${f2(-s.y)})`;
  return { tf, op };
}

function itemSvg(it, t) {
  const s = itemState(it, t), pr = presence(s, t);
  if (!pr) return '';
  let body;
  if (s.el === 'char') {
    s.talking = (TL.talk || []).some(([a, b, id]) => id === s.id && t >= a && t < b);
    body = characterSvg(s, t);
  } else {
    const draw = PROPS[s.type];
    if (!draw) throw new Error(`unknown prop type "${s.type}" (have: ${Object.keys(PROPS).join(', ')})`);
    const inner = draw(s, t, t - s.t0);
    body = s.type === 'arrow' ? inner : `<g transform="translate(${f2(s.x)} ${f2(s.y)}) rotate(${f2(s.rot || 0)}) scale(${f2((s.flip ? -1 : 1) * (s.scale ?? 1))} ${f2(s.scale ?? 1)})">${inner}</g>`;
  }
  return `<g transform="${pr.tf}" opacity="${f2(pr.op)}">${body}</g>`;
}

function camAt(sc, t) {
  const c = sc.cam || { from: [640, 360, 1], to: [640, 360, 1.06] }, k = easeInOut(prog(t, sc.from, sc.to));
  return [lerp(c.from[0], c.to[0], k), lerp(c.from[1], c.to[1], k), lerp(c.from[2], c.to[2], k)];
}

function groundSvg(t) {   // slightly uneven pencil horizon
  const r = rng(5); let d = `M-200 ${GROUND}`;
  for (let x = -200; x <= W + 200; x += 80) d += ` L${x} ${f2(GROUND + (r() - .5) * 2.2)}`;
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
}

function sceneAt(t) {
  const S = TL.scenes;
  return S.find(s => t >= s.from && t < s.to) || S[S.length - 1];
}

function frameSvg(t) {
  const sc = sceneAt(t), [cx, cy, z] = camAt(sc, t);
  const items = [...sc.items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map(it => itemSvg(it, t)).join('');
  const dark = sc.dark ? `<rect width="${W}" height="${H}" fill="#2c3134" opacity=".72"/>` : '';
  const cam = `translate(${f2(640 - cx * z)} ${f2(360 - cy * z)}) scale(${f2(z)})`;
  // particles get half the camera motion (parallax) so they read as floating in the air
  const pz = 1 + (z - 1) * .5, pcam = `translate(${f2(640 - (640 + (cx - 640) * .5) * pz)} ${f2(360 - (360 + (cy - 360) * .5) * pz)}) scale(${f2(pz)})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${dark}
    <g filter="${boilFilter(t)}">
      <g transform="${pcam}">${particles(t, sc.particles ?? 1)}</g>
      <g transform="${cam}">${sc.ground === false ? '' : groundSvg(t)}${items}</g>
    </g>
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
  const fi = Math.round(t * 30), sc = sceneAt(t);
  document.querySelectorAll('.grain').forEach((g, i) => g.style.display = i === Math.floor(fi / 2) % 6 ? 'block' : 'none');
  // projector flicker + a short flash on every cut (except the very first frame of the film)
  const cut = sc.from > 0 && sc.flash !== false ? Math.max(0, 1 - (t - sc.from) / .1) : 0;
  document.getElementById('flicker').style.opacity = (0.04 + 0.035 * Math.sin(fi * 2.7) * Math.sin(fi * 1.3) + cut * .35).toFixed(3);
  // fade from/to paper at the very start and end
  const fade = Math.max(prog(t, 0, .35) < 1 ? 1 - prog(t, 0, .35) : 0, prog(t, TL.duration - .6, TL.duration));
  document.getElementById('fade').style.opacity = fade.toFixed(3);
};
