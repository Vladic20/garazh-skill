// ─── look "pixel": 8-bit retro game (whole frame pixelated, scanlines, RPG dialog-box captions, chiptune) ──────────
// Any figures and sets work (they are pixelated by a filter); made for: pixelworld (sky, hills, brick ground, ? blocks,
// pipes) and dungeon (stone bricks, torches). "pixel": 8 (world px per pixel) at story level changes the block size.
if (isLook('pixel')) {
  addCss(`
    .look-pixel .grain { display: none !important; }
    .look-pixel #vignette { background: radial-gradient(ellipse 85% 80% at 50% 50%, transparent 62%, rgba(0,0,0,.45) 100%); }
    #scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,.18) 0 2px, transparent 2px 4px); mix-blend-mode: multiply; }
    .look-pixel #fade { background: #000; }
    .look-pixel .cap { bottom: 36px; left: 50%; width: 82%; max-width: 1040px; white-space: normal; text-align: left; color: #fff; font: 400 22px/1.7 'Press Start 2P', monospace;
      background: #000; border: 4px solid #fff; box-shadow: 0 0 0 4px #000; border-radius: 4px; padding: 16px 22px; }
    .look-pixel .cap .hl { color: #fcd800; }
    .look-pixel.portrait .cap { bottom: 230px; width: 88%; font-size: 20px; }
  `);
  addLayer('scan', 'vignette');
  boilFilter = () => 'none';
  filmDamage = () => '';
  particles = () => '';
  groundSvg = () => `<rect x="-300" y="${GROUND}" width="${W + 600}" height="${H - GROUND + 400}" fill="#c84c0c"/>`;
  const PX = (TL.pixel || 8);
  const _frame = frameSvg;
  frameSvg = t => _frame(t).replace(/^(\s*<svg[^>]*>)/, '$1<g filter="url(#pixelate)">').replace(/<\/svg>\s*$/, '</g></svg>');
  const _inst = installStatic;
  installStatic = function () {
    _inst();
    const host = document.createElement('div');
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs>
      <filter id="pixelate" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feFlood x="${PX / 2 - 1}" y="${PX / 2 - 1}" width="2" height="2"/><feComposite width="${PX}" height="${PX}"/><feTile result="a"/>
        <feComposite in="SourceGraphic" in2="a" operator="in"/><feMorphology operator="dilate" radius="${PX / 2}"/></filter></defs></svg>`;
    document.getElementById('defs').appendChild(host.firstChild);
  };
}

(function () {
  const block = (x, y, s, col, line) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${col}"/><path d="M${x} ${y + s / 2} h${s} M${x + s / 2} ${y} v${s / 2} M${x + s / 4} ${y + s / 2} v${s / 2}" stroke="${line}" stroke-width="4"/>`;
  Object.assign(window.SETS_LIB, {
    // 8-bit outdoors: sky, round hills, clouds, brick ground, floating ? blocks, a pipe
    pixelworld: (o, t) => {
      const G = GROUND, s = 64; let ground = '';
      for (let x = -320; x < W + 320; x += s) for (let y = G; y < H + 200; y += s) ground += block(x, y, s, '#c84c0c', '#7c2c00');
      const q = (x, y, i) => { const b = Math.max(0, Math.sin(t * 4 + i)) * 6; return `<rect x="${x}" y="${y - b}" width="${s}" height="${s}" fill="#fca044" stroke="#000" stroke-width="4"/><text x="${x + s / 2}" y="${y + s * .72 - b}" text-anchor="middle" font-family="'Press Start 2P'" font-size="32" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">?</text>`; };
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="#5c94fc"/>
        ${[[.12, .14], [.5, .08], [.82, .18]].map(([a, b], i) => { const x = ((W * a + t * 12) % (W + 300)) - 150, y = H * b + 40; return `<g transform="translate(${f2(x)} ${y})"><rect x="-70" y="-16" width="140" height="32" fill="#fcfcfc"/><rect x="-40" y="-40" width="80" height="30" fill="#fcfcfc"/><rect x="-70" y="12" width="140" height="8" fill="#a4e4fc"/></g>`; }).join('')}
        <path d="M${W * .05} ${G} a160 140 0 0 1 320 0 Z" fill="#00a800" stroke="#000" stroke-width="5"/><path d="M${W * .6} ${G} a110 100 0 0 1 220 0 Z" fill="#00a800" stroke="#000" stroke-width="5"/>
        ${[[CX - s * 2.5, G - 260], [CX - s * .5, G - 260], [CX + s * 1.5, G - 260]].map(([x, y], i) => q(x, y, i)).join('')}
        <g transform="translate(${PORTRAIT ? W - 150 : W * .84} ${G})"><rect x="0" y="-150" width="110" height="150" fill="#00a800" stroke="#000" stroke-width="5"/><rect x="-12" y="-190" width="134" height="50" fill="#00c800" stroke="#000" stroke-width="5"/><rect x="14" y="-186" width="16" height="182" fill="#80f080"/></g>
        ${ground}`;
      return { back, noGround: true };
    },
    // 8-bit dungeon: stone bricks, torches, dark
    dungeon: (o, t) => {
      const G = GROUND, fl = i => 1 + Math.sin(t * 14 + i) * .12;
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="#1c1c2c"/>${brickWall(-300, -400, W + 300, G, ['#3c3c58', '#34344e', '#44445e'], 21)}
        <rect x="-300" y="${G}" width="${W + 600}" height="${H - G + 400}" fill="#2a2a3a"/>
        ${(PORTRAIT ? [80, W - 80] : [W * .2, W * .8]).map((x, i) => `<rect x="${x - 8}" y="${G - 330}" width="16" height="60" fill="#7c4c1c"/><circle cx="${x}" cy="${G - 350}" r="${f2(70 * fl(i))}" fill="url(#emberGlow)"/><rect x="${x - 14}" y="${f2(G - 380 - 10 * fl(i))}" width="28" height="${f2(36 * fl(i))}" fill="#fc9838"/><rect x="${x - 7}" y="${G - 368}" width="14" height="20" fill="#fce4a0"/>`).join('')}`;
      return { back, noGround: true };
    },
  });
})();
