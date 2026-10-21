// ─── look "desk3d": a dark UI slab lying on a wooden desk, filmed by a moving 3D camera ──────────────────────
// The whole world (W×H) is the screen surface. A CSS 3D camera tilts it (per scene "cam3d" or a preset per scene index,
// gliding between scenes), the desk sits behind, a backdrop blur gives tilt-shift depth of field, and characters
// (best: "kind": "cube", the clay mascot) stand UPRIGHT on the slab: they are projected through the same matrix
// and drawn in a screen-space layer, so they don't lie flat. Put UI on the slab with "screen" props (frame "none"):
// show = tweet | timeline | daw | prompt | chat | app | code.
if (isLook('desk3d')) {
  addCss(`
    #slab { position: absolute; inset: 0; transform-origin: 50% 50%; will-change: transform; }
    #slabBg { position: absolute; inset: -3px; border-radius: 16px; background: linear-gradient(160deg, #191b20, #0f1013 60%);
      box-shadow: 0 0 0 2px #30343c, 0 0 0 6px #08090b, 0 50px 90px rgba(0,0,0,.7), 0 0 80px rgba(70,130,255,.14); }
    #upright { position: absolute; inset: 0; }
    #upright svg { display: block; }
    #dof { position: absolute; inset: 0; backdrop-filter: blur(6px); -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 32%, transparent 70%, #000 100%); }
    .look-desk3d #vignette { background: radial-gradient(ellipse 80% 72% at 50% 50%, transparent 48%, rgba(12,6,2,.6) 100%); }
    .look-desk3d .grain { opacity: .08; }
    .look-desk3d #fade { background: #120a05; }
    .look-desk3d .cap { background: none; bottom: 46px; color: #fff; font: 800 38px/1.12 Inter, Rubik, sans-serif; letter-spacing: -.3px; text-shadow: 0 2px 14px rgba(0,0,0,.85); }
    .look-desk3d .cap .hl { color: #ffd34d; }
    .look-desk3d.portrait .cap { background: none; padding: 0; bottom: 240px; max-width: 620px; white-space: normal; text-align: center; font-size: 36px; }
  `);
  const stage = document.getElementById('stage'), art = document.getElementById('art');
  const slab = document.createElement('div'); slab.id = 'slab';
  const bg = document.createElement('div'); bg.id = 'slabBg';
  stage.insertBefore(slab, art); slab.appendChild(bg); slab.appendChild(art);
  const up = addLayer('upright', 'grains'); addLayer('dof', 'grains');
  const dofEl = document.getElementById('dof'); stage.insertBefore(dofEl, up.nextSibling);

  // desk: warm wood with grain, a little bokeh
  const _inst = installStatic;
  installStatic = function () {
    _inst();
    const r = rng(41); let bokeh = '';
    for (let i = 0; i < 9; i++) bokeh += `<circle cx="${f2(r() * W)}" cy="${f2(r() * H * .35)}" r="${f2(30 + r() * 60)}" fill="#ffd9a0" opacity="${f2(.04 + r() * .06)}"/>`;
    document.getElementById('paper').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
      <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a10"/><stop offset=".5" stop-color="#5a3a24"/><stop offset="1" stop-color="#3a2416"/></linearGradient>
      <filter id="grainW" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.003 0.09" numOctaves="3" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 .1  0 0 0 0 .05  0 0 0 0 .02  0 0 0 .55 0"/></filter></defs>
      <rect width="${W}" height="${H}" fill="url(#wood)"/><rect width="${W}" height="${H}" filter="url(#grainW)"/>${bokeh}</svg>`;
  };

  // camera presets [rotateX, rotateZ, scale, x, y]; a scene's "cam3d" may be a preset name or { rx, rz, s, x, y }
  const CAM3D = { tilt: [40, -16, 1.18, 30, 40], left: [32, 14, 1.12, -30, 20], close: [48, -6, 1.55, 0, 90], wide: [26, -20, 1.0, 10, 0],
    right: [36, 20, 1.3, -50, 50], top: [10, 0, 1.0, 0, 0], low: [58, -10, 1.7, 0, 140] };
  const ORDER = ['tilt', 'left', 'close', 'wide', 'right', 'low'];
  const camOf = i => { const sc = TL.scenes[i], c = sc && sc.cam3d;
    const base = typeof c === 'string' ? CAM3D[c] || CAM3D.tilt : c ? [c.rx ?? 36, c.rz ?? -12, c.s ?? 1.2, c.x ?? 0, c.y ?? 30] : CAM3D[ORDER[i % ORDER.length]];
    if (PORTRAIT) return [base[0] * .85, base[1] * .7, base[2] * 1.05, base[3] * .4, base[4] * 1.3];
    return base; };
  const drift = (a, k) => [a[0] - 4 * k, a[1] + 5 * k, a[2] * (1 + .07 * k), a[3], a[4]];
  function cam3dAt(t) {
    const i = sceneIndex(t), sc = TL.scenes[i], k = prog(t, sc.from, sc.to), cur = drift(camOf(i), k);
    if (i === 0) return cur;
    const prev = TL.scenes[i - 1], pe = drift(camOf(i - 1), 1), b = easeInOut(prog(t, sc.from - .25, sc.from + .85));
    return cur.map((v, j) => lerp(pe[j], v, b));
  }
  const tf3d = c => `perspective(${PORTRAIT ? 1900 : 1500}px) translate(${f2(c[3])}px, ${f2(c[4])}px) rotateX(${f2(c[0])}deg) rotateZ(${f2(c[1])}deg) scale(${f2(c[2])})`;

  // characters leave the slab and are drawn upright in #upright
  let UPRIGHT = false;
  const _item = itemSvg;
  itemSvg = function (it, t) { return it.el === 'char' && !UPRIGHT ? '' : _item(it, t); };

  const _render = window.render;
  window.render = function (t) {
    _render(t);
    const c3 = cam3dAt(t), tf = tf3d(c3);
    slab.style.transform = tf;
    document.getElementById('paper').style.transform = `rotate(${f2(c3[1] * .35)}deg) scale(${f2(1.25 + (c3[2] - 1) * .3)}) translate(${f2(-c3[3] * .3)}px, ${f2(-c3[4] * .2)}px)`;
    // project the scene's characters
    const sc = TL.scenes[sceneIndex(t)], [cx, cy, z] = camAt(sc, t);
    const M = new DOMMatrix().translate(CX, CY).multiply(new DOMMatrix(tf)).translate(-CX, -CY);
    const chars = sc.items.filter(it => it.el === 'char').map(it => {
      const s = itemState(it, t), px = CX + (s.x - cx) * z, py = CY + (s.y - cy) * z, q = M.transformPoint(new DOMPoint(px, py, 0, 1));
      return { it, s, X: q.x / q.w, Y: q.y / q.w, k: z * c3[2] / q.w };
    }).sort((a, b) => a.Y - b.Y);
    UPRIGHT = true;
    const svg = chars.map(({ it, s, X, Y, k }) => {
      const pr = presence({ ...s, x: X, y: Y }, t); if (!pr) return '';
      const st = { ...s, x: X, y: Y, scale: (s.scale ?? 1) * k };
      st.talking = (TL.talk || []).some(([a, b, id]) => id === s.id && t >= a && t < b);
      return `<g transform="${pr.tf}" opacity="${f2(pr.op)}">${characterSvg(st, t)}</g>`;
    }).join('');
    UPRIGHT = false;
    up.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
  };
  boilFilter = () => 'none';
  groundSvg = () => '';
  filmDamage = () => '';
}
