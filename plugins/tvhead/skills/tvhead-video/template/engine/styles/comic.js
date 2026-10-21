// ─── look "comic": comic-book page (heavy ink, halftone dots, panel border, caption boxes, POW bursts) ─────────────
// Sets: burst (radial rays behind an action beat, { colors: [a, b] }), skyline (flat-colour city under a dotted sky);
// any other set works recoloured. Props: pow ("POW!" starburst), speedlines. Captions: yellow narration boxes.
if (isLook('comic')) {
  addCss(`
    #halftone { background-image: radial-gradient(circle, rgba(0,0,0,.55) 1.2px, transparent 1.7px); background-size: 7px 7px; mix-blend-mode: multiply; opacity: .16; }
    #panel { box-shadow: inset 0 0 0 9px #fdf6e3, inset 0 0 0 15px #111; }
    .look-comic .grain { opacity: .06; }
    .look-comic #vignette { display: none; }
    .look-comic #fade { background: #fdf6e3; }
    .look-comic .cap { bottom: 40px; transform: translateX(-50%) rotate(-1deg); color: #111; font: 400 38px/1.1 Bangers, 'Russo One', sans-serif; letter-spacing: 1.5px; text-transform: uppercase;
      background: #ffe94a; border: 4px solid #111; box-shadow: 6px 6px 0 #111; padding: 8px 20px 6px; }
    .look-comic .cap .hl { color: #e8202a; }
    .look-comic.portrait .cap { bottom: 240px; max-width: 600px; white-space: normal; text-align: center; font-size: 36px; }
  `);
  addLayer('halftone', 'grains'); addLayer('panel', 'ui');
  boilFilter = () => 'none';
  filmDamage = () => '';
  groundSvg = () => `<rect x="-300" y="${GROUND}" width="${W + 600}" height="${H - GROUND + 400}" fill="#f2c94c"/><path d="M-300 ${GROUND} H${W + 300}" stroke="#111" stroke-width="7"/>`;
}

(function () {
  Object.assign(window.SETS_LIB, {
    // radial action rays (slowly turning). { colors: ["#ffe94a", "#ff8a1a"] }
    burst: (o, t) => {
      const [a, b] = o.colors || ['#ffe94a', '#ff8a1a'], n = 24, R = Math.hypot(W, H); let rays = '';
      for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2 + t * .1, a1 = a0 + Math.PI / n;
        rays += `<path d="M${CX} ${CY} L${f2(CX + Math.cos(a0) * R)} ${f2(CY + Math.sin(a0) * R)} L${f2(CX + Math.cos(a1) * R)} ${f2(CY + Math.sin(a1) * R)} Z" fill="${b}"/>`; }
      return { back: `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="${a}"/>${rays}`, noGround: true };
    },
    // flat-colour skyline under a dotted sky, a sun
    skyline: (o, t) => {
      const G = GROUND, r = rng(o.seed || 4); let b = '', x = -80;
      while (x < W + 80) { const w = 70 + r() * 90, h = 160 + r() * 300, c = ['#2f6fd6', '#e8202a', '#7a4ad6', '#1aa36f'][Math.floor(r() * 4)];
        b += `<rect x="${f2(x)}" y="${f2(G - h)}" width="${f2(w)}" height="${f2(h)}" fill="${c}" stroke="#111" stroke-width="6"/>`;
        for (let wy = G - h + 20; wy < G - 30; wy += 36) for (let wx = x + 14; wx < x + w - 20; wx += 26) b += `<rect x="${f2(wx)}" y="${f2(wy)}" width="12" height="18" fill="${r() < .5 ? '#ffe94a' : '#111'}"/>`;
        x += w + 6; }
      return { back: `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="#8fd3ff"/><rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="url(#bendots)"/>
        <circle cx="${W * .78}" cy="${H * .2}" r="70" fill="#ffe94a" stroke="#111" stroke-width="6"/>${b}<rect x="-300" y="${G}" width="${W + 600}" height="${H - G + 400}" fill="#555"/><path d="M-300 ${G} H${W + 300}" stroke="#111" stroke-width="7"/>`, noGround: true };
    },
  });
  const _inst = installStatic;
  installStatic = function () {
    _inst();
    const host = document.createElement('div');
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs>
      <pattern id="bendots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="3.4" fill="#2f6fd6" opacity=".35"/></pattern></defs></svg>`;
    document.getElementById('defs').appendChild(host.firstChild);
  };
})();
