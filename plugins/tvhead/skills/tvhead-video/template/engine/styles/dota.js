// ─── look "dota": dark-fantasy MOBA (Radiant green vs Dire red, gold-trimmed stone UI, embers) ──────────────────
// Figures: outlined heroes; fantasy parts helm / horns / hood2 hats, armor body, sword / staff / shield held.
// Sets: lane (forest lane, river, team towers), ancient ({ team: "radiant"|"dire" } glowing core), arena (rune circle, torches).
// Props: unitbar, abilities, gold, banner ("FIRST BLOOD"), minimap. Captions: gold serif on a dark plate.
if (isLook('dota')) {
  addCss(`
    .look-dota #vignette { background: radial-gradient(ellipse 78% 70% at 50% 48%, transparent 46%, rgba(4,4,8,.6) 82%, rgba(0,0,0,.88) 100%); }
    .look-dota .grain { opacity: .1; }
    .look-dota #fade { background: #000; }
    #grade { background: rgba(255,170,90,.12); mix-blend-mode: soft-light; }
    .look-dota .cap { bottom: 56px; color: #f3dfae; font: 700 34px/1.15 Cinzel, 'Cormorant SC', serif; letter-spacing: 1px; background: linear-gradient(#16130fe6, #0b0a08e6);
      border: 2px solid #8a7240; box-shadow: 0 0 0 4px #0b0a08, 0 6px 20px rgba(0,0,0,.6); border-radius: 4px; padding: 8px 22px 10px; text-shadow: 0 0 10px rgba(255,190,90,.35); }
    .look-dota .cap .hl { color: #ffe9a8; text-shadow: 0 0 14px rgba(255,200,90,.8); }
    .look-dota.portrait .cap { bottom: 250px; max-width: 620px; white-space: normal; text-align: center; font-size: 32px; }
  `);
  addLayer('grade', 'grains');
  boilFilter = () => 'none';
  groundSvg = () => `<rect x="-300" y="${GROUND}" width="${W + 600}" height="${H - GROUND + 400}" fill="#1f2a17"/>`;
  filmDamage = () => '';
  // embers rising
  particles = function (t, density = 1) {
    if (!(density > 0)) return '';
    return PARTICLES.slice(0, Math.round(clamp(density, 0, 2) * 30)).map(p => {
      const x = ((p.x + Math.sin(t * .8 + p.ph) * 30) % (W + 200) + W + 200) % (W + 200) - 100;
      const y = (((p.y - t * (30 + p.s * 30)) % (H + 120)) + H + 120) % (H + 120) - 60;
      const op = .35 + .5 * (.5 + .5 * Math.sin(t * 6 + p.ph * 5));
      return `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(5 + p.s * 4)}" fill="url(#emberGlow)" opacity="${f2(op)}"/><circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(1.2 + p.s)}" fill="#ffe2a0" opacity="${f2(op)}"/>`;
    }).join('');
  };
}

(function () {
  const tex = (op = 1) => `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" filter="url(#paint)" opacity="${op}"/>`;
  const tree = (x, y, s, seed) => { const r = rng(seed); let c = `<path d="M${x - 6 * s} ${y} v${-50 * s} h${12 * s} v${50 * s} Z" fill="#2a1c12"/>`;
    for (let i = 0; i < 4; i++) { const dx = (r() - .5) * 60 * s, dy = -50 * s - r() * 70 * s, rr = (34 + r() * 26) * s;
      c += `<circle cx="${f2(x + dx)}" cy="${f2(y + dy)}" r="${f2(rr)}" fill="#1a3317"/><circle cx="${f2(x + dx - rr * .2)}" cy="${f2(y + dy - rr * .25)}" r="${f2(rr * .7)}" fill="#2c5224"/><circle cx="${f2(x + dx - rr * .35)}" cy="${f2(y + dy - rr * .4)}" r="${f2(rr * .3)}" fill="#4a7a34" opacity=".8"/>`; }
    return c; };
  const tower = (x, y, team, t, s = 1) => { const col = team === 'dire' ? '#c23c2a' : '#56d33a', glow = team === 'dire' ? 'direGlow' : 'radGlow', pulse = 1 + Math.sin(t * 3) * .08;
    return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="6" rx="70" ry="16" fill="#000" opacity=".4"/><path d="M-50 0 L-36 -170 H36 L50 0 Z" fill="#5a5650" stroke="#1a1814" stroke-width="5"/>
      ${[0, 1, 2, 3].map(i => `<path d="M${-48 + i * 2} ${-40 - i * 40} H${48 - i * 2}" stroke="#3a3632" stroke-width="4"/>`).join('')}<path d="M-46 -170 H46 L40 -190 H-40 Z" fill="#8a7a5a" stroke="#1a1814" stroke-width="4"/>
      <circle cy="-236" r="${f2(70 * pulse)}" fill="url(#${glow})"/><path d="M0 -290 L22 -236 L0 -196 L-22 -236 Z" fill="${col}" stroke="#111" stroke-width="3"/><path d="M0 -290 L8 -236 L0 -206 Z" fill="#fff" opacity=".45"/></g>`; };
  Object.assign(window.SETS_LIB, {
    // forest lane at dusk: dirt path, river, trees, team towers. { team: "radiant" | "dire" | "both" }
    lane: (o, t) => {
      const G = GROUND, r = rng(o.seed || 5);
      let trees = ''; for (let i = 0; i < (PORTRAIT ? 6 : 9); i++) { const x = (i / (PORTRAIT ? 5 : 8)) * (W + 160) - 80; trees += tree(x + (r() - .5) * 60, G - 120 - r() * 60, .9 + r() * .5, i + 3); }
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="url(#skyDusk)"/>
        <path d="M-300 ${G - 230} L${W * .15} ${G - 330} L${W * .35} ${G - 260} L${W * .6} ${G - 380} L${W * .85} ${G - 280} L${W + 300} ${G - 340} V${G} H-300 Z" fill="#20202e" opacity=".9"/>
        ${trees}<rect x="-300" y="${G - 140}" width="${W + 600}" height="${H - G + 540}" fill="#24361f"/>
        <path d="M-300 ${G + 60} C${W * .2} ${G + 10} ${W * .5} ${G + 120} ${W + 300} ${G + 40} L${W + 300} ${G + 120} C${W * .5} ${G + 200} ${W * .2} ${G + 90} -300 ${G + 140} Z" fill="#2c5a8a" opacity=".85"/>
        <path d="M-300 ${G + 80} C${W * .2} ${G + 30} ${W * .5} ${G + 140} ${W + 300} ${G + 60}" fill="none" stroke="#9fd8ff" stroke-width="3" opacity="${f2(.3 + .2 * Math.sin(t * 2))}"/>
        <path d="M${W * .05} ${H + 200} C${W * .3} ${G + 100} ${W * .5} ${G - 40} ${W * .7} ${G - 140} L${W * .82} ${G - 140} C${W * .62} ${G - 30} ${W * .48} ${G + 120} ${W * .32} ${H + 200} Z" fill="#6a5434" opacity=".9"/>
        ${o.team === 'dire' ? '' : tower(PORTRAIT ? 70 : W * .1, G - 30, 'radiant', t, PORTRAIT ? .8 : 1)}${o.team === 'radiant' ? '' : tower(PORTRAIT ? W - 70 : W * .9, G - 60, 'dire', t, PORTRAIT ? .7 : .85)}
        ${tex(.8)}`;
      return { back, noGround: true };
    },
    // a team's ancient: stepped stone base, glowing crystal core, rune ring. { team }
    ancient: (o, t) => {
      const G = GROUND, x = o.x ?? CX, dire = o.team === 'dire', col = dire ? '#ff5a3a' : '#7cf04a', glow = dire ? 'direGlow' : 'radGlow', p = 1 + Math.sin(t * 2.4) * .06;
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="${dire ? '#1c0e0e' : '#0e1a14'}"/><rect x="-300" y="${G - 60}" width="${W + 600}" height="${H - G + 460}" fill="#1e1c1a"/>
        <circle cx="${x}" cy="${G - 300}" r="${f2(420 * p)}" fill="url(#${glow})" opacity=".8"/>
        <ellipse cx="${x}" cy="${G + 30}" rx="${f2(300 * p)}" ry="60" fill="none" stroke="${col}" stroke-width="4" opacity=".6" stroke-dasharray="18 10" transform="rotate(${f2(t * 6)} ${x} ${G + 30})"/>
        ${[0, 1, 2].map(i => `<path d="M${x - 240 + i * 50} ${G - i * 40} H${x + 240 - i * 50} L${x + 220 - i * 50} ${G - 40 - i * 40} H${x - 220 + i * 50} Z" fill="${['#4a4640', '#5a5650', '#6a6660'][i]}" stroke="#141210" stroke-width="4"/>`).join('')}
        <path d="M${x} ${G - 520} L${x + 70} ${G - 300} L${x} ${G - 130} L${x - 70} ${G - 300} Z" fill="${col}" stroke="#111" stroke-width="5"/><path d="M${x} ${G - 520} L${x + 22} ${G - 300} L${x} ${G - 170} Z" fill="#fff" opacity=".4"/>
        ${[-1, 1].map(s => `<path d="M${x + s * 60} ${G - 120} L${x + s * 130} ${G - 330} L${x + s * 90} ${G - 120} Z" fill="${darken(col, .3)}" stroke="#111" stroke-width="4"/>`).join('')}${tex(.7)}`;
      return { back, noGround: true };
    },
    // dark stone arena with a glowing rune circle and torches on pillars
    arena: (o, t) => {
      const G = GROUND, flick = i => 1 + Math.sin(t * 17 + i) * .1 + Math.sin(t * 29 + i * 2) * .06;
      const pil = [PORTRAIT ? 60 : W * .12, PORTRAIT ? W - 60 : W * .88];
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="#121014"/>${brickWall(-300, -400, W + 300, G, ['#1e1b1e', '#232023', '#1a181a'], 9)}
        <rect x="-300" y="${G - 20}" width="${W + 600}" height="${H - G + 420}" fill="#2a2622"/>
        <ellipse cx="${CX}" cy="${G + 60}" rx="${PORTRAIT ? 300 : 420}" ry="${PORTRAIT ? 70 : 90}" fill="none" stroke="#e8b84a" stroke-width="4" opacity="${f2(.55 + .2 * Math.sin(t * 2))}" filter="url(#glow4)"/>
        <ellipse cx="${CX}" cy="${G + 60}" rx="${PORTRAIT ? 250 : 350}" ry="${PORTRAIT ? 56 : 72}" fill="none" stroke="#e8b84a" stroke-width="2" opacity=".5" stroke-dasharray="6 14"/>
        ${pil.map((x, i) => `<rect x="${x - 34}" y="${G - 420}" width="68" height="420" fill="#3a3632" stroke="#111" stroke-width="5"/><circle cx="${x}" cy="${G - 440}" r="${f2(90 * flick(i))}" fill="url(#emberGlow)"/>
          <path transform="translate(${x} ${G - 426}) scale(${f2(flick(i))})" d="M0 0 C-22 -14 -12 -44 0 -62 C12 -44 22 -14 0 0 Z" fill="#ffb347"/><path transform="translate(${x} ${G - 428}) scale(${f2(flick(i) * .6)})" d="M0 0 C-22 -14 -12 -44 0 -62 C12 -44 22 -14 0 0 Z" fill="#fff0b0"/>`).join('')}${tex(.6)}`;
      return { back, noGround: true };
    },
  });
  const _inst = installStatic;
  installStatic = function () {
    _inst();
    const host = document.createElement('div');
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs>
      <linearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141826"/><stop offset=".6" stop-color="#3a2a3e"/><stop offset="1" stop-color="#7a4a3a"/></linearGradient></defs></svg>`;
    document.getElementById('defs').appendChild(host.firstChild);
  };
})();
