// ─── look "blocks": brick-built game world (blocky figures, studded baseplate, obby, game HUD) ─────────────────
// Figures: "kind": "blocky" (skin = head + arms, color = torso, legs; hat cap / crown / headphones).
// Sets: baseplate (studded green plate, blocky trees, clouds), obby (floating bricks over lava, checkpoint).
// Props: leaderboard, chatbox, pickup ("+1" coin), hotbar. Captions: chunky white type with a black outline.
if (isLook('blocks')) {
  addCss(`
    .look-blocks #vignette { background: radial-gradient(ellipse 85% 80% at 50% 50%, transparent 60%, rgba(0,20,40,.25) 100%); }
    .look-blocks .grain { display: none !important; }
    .look-blocks #flicker { display: none; }
    .look-blocks #fade { background: #fff; }
    .look-blocks .cap { background: none; bottom: 120px; color: #fff; font: 400 40px/1.15 'Russo One', Rubik, sans-serif; -webkit-text-stroke: 7px #111; paint-order: stroke fill; text-shadow: 0 4px 0 rgba(0,0,0,.35); }
    .look-blocks .cap .hl { color: #ffd800; }
    .look-blocks.portrait .cap { background: none; padding: 0; bottom: 260px; max-width: 620px; white-space: normal; text-align: center; font-size: 38px; }
  `);
  boilFilter = () => 'none';
  filmDamage = () => '';
  groundSvg = () => `<rect x="-300" y="${GROUND}" width="${W + 600}" height="${H - GROUND + 400}" fill="#4caf50"/><rect x="-300" y="${GROUND}" width="${W + 600}" height="${H - GROUND + 400}" fill="url(#studs)"/>`;
}

(function () {
  const brick = (x, y, w, h, col, studs = true) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" stroke="${darken(col, .45)}" stroke-width="3"/>
    <rect x="${x}" y="${y}" width="${w}" height="${Math.min(10, h * .25)}" fill="#fff" opacity=".22"/><rect x="${x + w - 12}" y="${y}" width="12" height="${h}" fill="#000" opacity=".12"/>
    ${studs ? Array.from({ length: Math.floor(w / 40) }, (_, i) => `<rect x="${x + 8 + i * 40}" y="${y - 9}" width="24" height="10" rx="3" fill="${lighten(col, .1)}" stroke="${darken(col, .45)}" stroke-width="2"/>`).join('') : ''}`;
  const cloud = (x, y, s) => `<g transform="translate(${f2(x)} ${y}) scale(${s})" opacity=".95"><rect x="-80" y="-20" width="160" height="40" fill="#fff"/><rect x="-40" y="-50" width="90" height="40" fill="#fff"/><rect x="-80" y="10" width="160" height="10" fill="#dfeffa"/></g>`;
  const btree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${brick(-14, -110, 28, 110, '#7a4a24', false)}${brick(-70, -230, 140, 120, '#2e9e3e', false)}${brick(-48, -280, 96, 52, '#37b24a', false)}</g>`;
  Object.assign(window.SETS_LIB, {
    // studded green baseplate under a bright sky: blocky clouds and trees, a spawn pad. { trees: false }
    baseplate: (o, t) => {
      const G = GROUND;
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="url(#skyBlocks)"/>
        ${[[.15, .1, 1], [.55, .06, .8], [.85, .16, 1.1]].map(([a, b, s], i) => cloud(((W * a + t * (8 + i * 4)) % (W + 300)) - 150, H * b + 40, s)).join('')}
        <path d="M-300 ${G - 120} L${W * .2} ${G - 200} L${W * .45} ${G - 140} L${W * .7} ${G - 230} L${W + 300} ${G - 150} V${G} H-300 Z" fill="#8fd18a" opacity=".6"/>
        <rect x="-300" y="${G}" width="${W + 600}" height="${H - G + 400}" fill="#4caf50"/><rect x="-300" y="${G}" width="${W + 600}" height="${H - G + 400}" fill="url(#studs)"/>
        <rect x="-300" y="${G}" width="${W + 600}" height="8" fill="#fff" opacity=".25"/>
        ${o.trees === false ? '' : (PORTRAIT ? [60, W - 70] : [W * .08, W * .9, W * .74]).map((x, i) => btree(x, G + 6, PORTRAIT ? .8 : 1 - i * .15)).join('')}
        <rect x="${CX - 110}" y="${G + 20}" width="220" height="26" fill="#9aa0a6" stroke="#55595e" stroke-width="3"/><rect x="${CX - 90}" y="${G + 26}" width="180" height="14" fill="#c8ccd0"/>`;
      return { back, noGround: true };
    },
    // obstacle course: floating coloured bricks over glowing lava, a checkpoint flag
    obby: (o, t) => {
      const G = GROUND, lava = 1 + Math.sin(t * 3) * .05;
      const plats = PORTRAIT ? [[40, G, 260, '#e74c3c'], [380, G - 160, 200, '#3498db'], [140, G - 360, 180, '#f1c40f'], [430, G - 520, 200, '#2ecc71']]
        : [[60, G, 300, '#e74c3c'], [440, G - 90, 200, '#3498db'], [720, G - 200, 180, '#f1c40f'], [980, G - 300, 240, '#2ecc71']];
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="url(#skyBlocks)"/>
        ${[[.2, .1, .9], [.7, .14, 1.1]].map(([a, b, s], i) => cloud(((W * a + t * (6 + i * 5)) % (W + 300)) - 150, H * b + 40, s)).join('')}
        <rect x="-300" y="${G + 110}" width="${W + 600}" height="${H}" fill="#ff5a1a"/><rect x="-300" y="${G + 110}" width="${W + 600}" height="${H}" fill="url(#lavaG)" opacity="${f2(lava)}"/>
        ${Array.from({ length: 8 }, (_, i) => `<circle cx="${f2((i * 197 + t * 40) % (W + 100))}" cy="${f2(G + 130 + Math.sin(t * 4 + i) * 10)}" r="${8 + (i % 3) * 4}" fill="#ffd34d" opacity=".7"/>`).join('')}
        ${plats.map(([x, y, w, c]) => brick(x, y, w, 46, c)).join('')}
        <g transform="translate(${plats[plats.length - 1][0] + plats[plats.length - 1][2] - 40} ${plats[plats.length - 1][1]})"><rect x="-4" y="-150" width="8" height="150" fill="#ddd" stroke="#555" stroke-width="2"/>
          <path d="M4 -150 h70 q-8 20 0 40 h-70 Z" fill="#2ecc71" stroke="#1d7a44" stroke-width="3" transform="skewY(${f2(Math.sin(t * 4) * 4)})"/></g>`;
      return { back, noGround: true };
    },
  });
  const _inst = installStatic;
  installStatic = function () {
    _inst();
    const host = document.createElement('div');
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs>
      <linearGradient id="skyBlocks" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4aa8ff"/><stop offset="1" stop-color="#cdeeff"/></linearGradient>
      <linearGradient id="lavaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd34d"/><stop offset=".3" stop-color="#ff7a1a" stop-opacity=".5"/><stop offset="1" stop-color="#a01a00" stop-opacity="0"/></linearGradient></defs></svg>`;
    document.getElementById('defs').appendChild(host.firstChild);
  };
})();
