// ─── look "noir": illustrated neon-noir explainer (motel neon, banks by day, night storefronts) + clean cards ──────
// Figures: outlined, white round heads (use "head": "round", "hat": "cap", "body": "hoodie", "back": "backpack").
// Sets: motel, bank, strip (night storefronts), card ({ tone: "light" | "dark" }) for text / infographic beats.
// Props that fit: headline, hud, billgrid, stamp, marker, counter. Captions: bold white words appearing as spoken.
if (isLook('noir')) {
  addCss(`
    .look-noir .grain { opacity: .14; }
    .look-noir #vignette { background: radial-gradient(ellipse 80% 72% at 50% 48%, transparent 52%, rgba(10,6,8,.55) 100%); }
    .look-noir #fade { background: #0c0809; }
    .look-noir .cap { bottom: 150px; background: none; padding: 0; border-radius: 0; color: #fff; font: 800 46px/1.1 Inter, Rubik, sans-serif; letter-spacing: -.5px; white-space: normal; max-width: 900px; text-align: center;
      text-shadow: 0 2px 10px rgba(0,0,0,.75), 0 0 2px rgba(0,0,0,.9); }
    .look-noir .cap span { opacity: .55; } .look-noir .cap span.hl { opacity: 1; }
    .look-noir.portrait .cap { bottom: 330px; max-width: 620px; font-size: 46px; background: none; padding: 0; }
  `);
  boilFilter = () => 'none';
  groundSvg = () => '';
  filmDamage = function (t) { const r = rng(Math.round(t * 30) * 31 + 7); return r() < .2 ? `<circle cx="${f2(r() * W)}" cy="${f2(r() * H)}" r="1.2" fill="#fff" opacity=".3"/>` : ''; };
  // captions: all words of the phrase, the spoken ones bright (karaoke without a plate)
  captionHtml = function (t) {
    if (!TL.captions) return '';
    const ph = (TL.subs || []).find(p => t >= p.from && t < p.to); if (!ph) return '';
    const vis = ph.words.filter(([, wt]) => t >= wt - .03); if (!vis.length) return '';
    return `<div class="cap">${vis.map(([w]) => `<span class="hl">${esc(w)}</span>`).join(' ')}</div>`;
  };
}

// ── sets (registered for every look) ──
(function () {
  const tex = (op = 1) => `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" filter="url(#paint)" opacity="${op}"/>`;
  const floral = (x, y, w, h, seed) => { const r = rng(seed); let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#a07a52"/>`;
    for (let i = 0; i < w * h / 900; i++) { const fx = x + 10 + r() * (w - 20), fy = y + 10 + r() * (h - 20), c = ['#c45a6a', '#d9a06a', '#6a8a5a', '#e8c9a0'][Math.floor(r() * 4)];
      s += `<circle cx="${f2(fx)}" cy="${f2(fy)}" r="${f2(4 + r() * 6)}" fill="${c}" opacity=".75"/>`; }
    return s + `<path d="M${x + 20} ${y + h * .4} q${w * .3} ${h * .25} ${w * .6} -${h * .1} M${x + 40} ${y + h * .75} q${w * .25} -${h * .2} ${w * .7} ${h * .05}" fill="none" stroke="#6a4a2a" stroke-width="5" opacity=".5"/>`; };
  const duffel = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-80 0 C-90 -50 -60 -70 0 -70 C60 -70 90 -50 80 0 Z" fill="#2c2f26" stroke="#111" stroke-width="4"/>
    <path d="M-40 -70 C-40 -100 40 -100 40 -70" fill="none" stroke="#111" stroke-width="7"/>${[-36, -10, 16].map((dx, i) => `<rect x="${dx}" y="${-82 + i * 4}" width="34" height="18" rx="2" fill="#7fae6a" stroke="#2f4a25" stroke-width="2" transform="rotate(${-10 + i * 8} ${dx} -80)"/>`).join('')}
    <path d="M-70 -30 H70" stroke="#4a4f3e" stroke-width="3"/></g>`;
  Object.assign(window.SETS_LIB, {
    // dark motel room, pink neon through the blinds, cash bags on a floral bed. { neon: "#ff2d95", lamp: false }
    motel: (o, t) => {
      const G = GROUND, neon = o.neon || '#ff2d95', fl = .85 + .15 * Math.sin(t * 13) * Math.sin(t * 7.3);
      const wx = PORTRAIT ? W * .5 : W * .6, wy = PORTRAIT ? G - 700 : G - 470, ww = PORTRAIT ? 300 : 340, wh = PORTRAIT ? 230 : 200;
      const bx = PORTRAIT ? W * .5 : W * .48, by = G - 30;
      let slats = ''; for (let i = 0; i < 11; i++) slats += `<rect x="${wx - ww / 2}" y="${wy + i * wh / 11}" width="${ww}" height="${wh / 22}" fill="#5a0f3a" opacity=".55"/>`;
      let stripes = ''; for (let i = 0; i < 6; i++) stripes += `<path d="M${wx - ww * .4 + i * 34} ${G - 10} l${-300 + i * 10} 260 h40 l${300 - i * 10} -260 Z" fill="${neon}" opacity="${f2(.09 * fl)}"/>`;
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="#3a2226"/>
        ${Array.from({ length: 24 }, (_, i) => `<rect x="${-300 + i * 80}" y="-400" width="40" height="${G + 400}" fill="#000" opacity=".07"/>`).join('')}
        <rect x="-300" y="${G - 60}" width="${W + 600}" height="18" fill="#2a1418"/>
        <circle cx="${wx}" cy="${wy + wh / 2}" r="${ww * 1.4}" fill="url(#neonGlow)" opacity="${f2(.75 * fl)}"/>
        <rect x="${wx - ww / 2 - 12}" y="${wy - 12}" width="${ww + 24}" height="${wh + 24}" fill="#24141a" stroke="#120a0c" stroke-width="5"/>
        <rect x="${wx - ww / 2}" y="${wy}" width="${ww}" height="${wh}" fill="${neon}" opacity="${f2(fl)}"/>${slats}
        <rect x="${wx - 80}" y="${wy + wh + 30}" width="160" height="70" rx="6" fill="#bdb6a8" stroke="#3a3330" stroke-width="4"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${wx - 66} ${wy + wh + 44 + i * 11} h132" stroke="#7a7268" stroke-width="3"/>`).join('')}
        ${PORTRAIT ? '' : `<rect x="${W * .06}" y="${G - 360}" width="120" height="300" fill="#4a2c22" stroke="#1a0e0c" stroke-width="5"/><circle cx="${W * .06 + 100}" cy="${G - 200}" r="6" fill="#c9a46a"/>`}
        <rect x="${PORTRAIT ? 20 : W * .17}" y="${G - 180}" width="${PORTRAIT ? 130 : 170}" height="130" fill="#5a3a26" stroke="#1a0e0c" stroke-width="5"/>
        <rect x="${PORTRAIT ? 34 : W * .17 + 22}" y="${G - 262}" width="110" height="84" rx="10" fill="#2a2a2a" stroke="#111" stroke-width="5"/><rect x="${PORTRAIT ? 44 : W * .17 + 32}" y="${G - 252}" width="78" height="62" rx="6" fill="#3a4a4a"/>
        <rect x="-300" y="${G - 42}" width="${W + 600}" height="${H - G + 450}" fill="#3e2a22"/>
        <rect x="-300" y="${G - 42}" width="${W + 600}" height="${H - G + 450}" fill="url(#wallShade)" opacity=".6"/>
        <g>${`<rect x="${bx - 230}" y="${by - 230}" width="460" height="110" rx="10" fill="#4a2a1c" stroke="#1a0e0c" stroke-width="5"/>`}
          ${floral(bx - 250, by - 140, 500, 150, 7)}<rect x="${bx - 230}" y="${by - 168}" width="120" height="44" rx="18" fill="#e8dcc8" stroke="#6a5a4a" stroke-width="3"/>
          ${duffel(bx - 60, by - 110, .95)}${duffel(bx + 110, by - 100, .8)}</g>
        ${o.lamp === false ? '' : `<circle cx="${bx + 330}" cy="${by - 170}" r="190" fill="url(#warmGlow)"/><rect x="${bx + 280}" y="${by - 90}" width="100" height="90" fill="#5a3a26" stroke="#1a0e0c" stroke-width="4"/>
          <path d="M${bx + 300} ${by - 190} h60 l14 50 h-88 Z" fill="#f2deb0" stroke="#6a5a3a" stroke-width="3"/><path d="M${bx + 330} ${by - 140} v50" stroke="#2a1a10" stroke-width="5"/>`}
        ${stripes}${tex(.8)}`;
      return { back, noGround: true };
    },
    // bank by day: stone columns, steps, a flag, glass doors, people far away
    bank: (o, t) => {
      const G = GROUND, cx = PORTRAIT ? W * .5 : W * .55, fw = PORTRAIT ? 700 : 860, top = G - (PORTRAIT ? 760 : 520);
      let cols = ''; const n = PORTRAIT ? 4 : 6;
      for (let i = 0; i < n; i++) { const x = cx - fw / 2 + 60 + i * (fw - 120) / (n - 1);
        cols += `<rect x="${x - 26}" y="${top + 90}" width="52" height="${G - top - 190}" fill="#e6dcc6"/><rect x="${x - 26}" y="${top + 90}" width="16" height="${G - top - 190}" fill="#fff" opacity=".35"/><rect x="${x + 12}" y="${top + 90}" width="14" height="${G - top - 190}" fill="#000" opacity=".12"/>
          <rect x="${x - 34}" y="${top + 76}" width="68" height="16" fill="#d8ccb2"/><rect x="${x - 34}" y="${G - 104}" width="68" height="16" fill="#cfc2a6"/>`; }
      let people = ''; const r = rng(13); for (let i = 0; i < 5; i++) { const x = r() * W, y = G + 20 + r() * 30; people += `<g transform="translate(${f2(x)} ${f2(y)}) scale(.35)"><circle cy="-150" r="20" fill="#3a3a3a"/><path d="M-16 -128 h32 v80 h-32 Z" fill="#555"/><path d="M-10 -48 v48 M10 -48 v48" stroke="#333" stroke-width="8"/></g>`; }
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="url(#skyDay)"/>
        ${[[.15, .12], [.7, .08], [.45, .2]].map(([a, b], i) => `<ellipse cx="${W * a + Math.sin(t * .1 + i) * 10}" cy="${H * b}" rx="120" ry="34" fill="#fff" opacity=".75"/>`).join('')}
        <rect x="${cx - fw / 2 - 30}" y="${top}" width="${fw + 60}" height="${G - top}" fill="#d9cdb4"/><path d="M${cx - fw / 2 - 50} ${top + 6} L${cx} ${top - 70} L${cx + fw / 2 + 50} ${top + 6} Z" fill="#e2d7c0" stroke="#bfb196" stroke-width="4"/>
        <rect x="${cx - fw / 2 - 40}" y="${top + 4}" width="${fw + 80}" height="40" fill="#cfc2a6"/>
        <rect x="${cx - 90}" y="${G - 300}" width="180" height="200" fill="#2a3a52"/><rect x="${cx - 90}" y="${G - 300}" width="180" height="200" fill="url(#glare)"/><path d="M${cx} ${G - 300} v200" stroke="#9aa6b2" stroke-width="5"/>
        ${cols}${[0, 1, 2, 3].map(i => `<rect x="${cx - fw / 2 - 40 - i * 20}" y="${G - 90 + i * 22}" width="${fw + 80 + i * 40}" height="22" fill="${['#cfc2a6', '#c6b99c', '#bdb092', '#b4a788'][i]}"/>`).join('')}
        <path d="M${cx - fw / 2 + 10} ${top - 10} V${top - 170}" stroke="#555" stroke-width="5"/><path d="M${cx - fw / 2 + 12} ${top - 168} q30 ${8 + Math.sin(t * 3) * 6} 60 0 t60 0 v50 q-30 ${-8 - Math.sin(t * 3) * 6} -60 0 t-60 0 Z" fill="#b8322a"/>
        <rect x="-300" y="${G}" width="${W + 600}" height="${H - G + 400}" fill="#a8a294"/>${people}${tex(.6)}`;
      return { back, noGround: true };
    },
    // night strip of storefronts: laundromat glow, ATM, wet parking lot with reflections
    strip: (o, t) => {
      const G = GROUND, sh = PORTRAIT ? 420 : 330, sy = G - sh;
      const shops = PORTRAIT ? [[0, 360, 'LAUNDRY'], [360, 360, 'ATM']] : [[40, 380, 'LAUNDRY'], [440, 400, 'ATM'], [860, 380, 'PIZZA']];
      const back = `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="url(#skyNight)"/>
        <rect x="-300" y="${sy - 60}" width="${W + 600}" height="${sh + 60}" fill="#4a3a34"/>
        ${shops.map(([x, w, name], i) => `<rect x="${x + 16}" y="${sy + 40}" width="${w - 32}" height="${sh - 70}" fill="${name === 'ATM' ? '#203040' : '#ffd890'}" opacity="${name === 'ATM' ? 1 : .85}"/>
          ${name === 'LAUNDRY' ? [0, 1, 2].map(j => `<circle cx="${x + 70 + j * (w - 100) / 2.5}" cy="${sy + sh - 90}" r="34" fill="#e8e8e8" stroke="#888" stroke-width="5"/><circle cx="${x + 70 + j * (w - 100) / 2.5}" cy="${sy + sh - 90}" r="20" fill="#7ab0d0" opacity=".7"/>`).join('') : ''}
          ${name === 'ATM' ? `<rect x="${x + w / 2 - 50}" y="${sy + 90}" width="100" height="150" rx="8" fill="#5a6a7a"/><rect x="${x + w / 2 - 36}" y="${sy + 106}" width="72" height="50" fill="#9ff0ff"/><circle cx="${x + w / 2}" cy="${sy + 130}" r="110" fill="#9ff0ff" opacity=".08"/>` : ''}
          <rect x="${x + 30}" y="${sy - 40}" width="${w - 60}" height="44" rx="6" fill="#1a1414"/><text x="${x + w / 2}" y="${sy - 8}" text-anchor="middle" font-family="Inter, Rubik" font-weight="800" font-size="26" fill="${['#ff5fb8', '#62e0ff', '#ffd34d'][i % 3]}" filter="url(#glow4)">${name}</text>
          <path d="M${x + 16} ${G + 20} l-30 ${H - G} h${w} l30 -${H - G} Z" fill="${name === 'ATM' ? '#62e0ff' : '#ffd890'}" opacity=".08"/>`).join('')}
        <rect x="-300" y="${G}" width="${W + 600}" height="${H - G + 400}" fill="#2a2a34"/>
        ${[0, 1, 2, 3, 4].map(i => `<path d="M${-100 + i * (W + 200) / 4} ${G + 40} l${-60 + i * 30} ${H - G}" stroke="#d9c14a" stroke-width="6" opacity=".55"/>`).join('')}
        ${shops.map(([x, w, name]) => `<rect x="${x + 30}" y="${G + 10}" width="${w - 60}" height="${(H - G) * .6}" fill="${name === 'ATM' ? '#62e0ff' : '#ffd890'}" opacity=".07"/>`).join('')}${tex(.7)}`;
      return { back, noGround: true };
    },
    // plain card for text / infographic beats. { tone: "light" (cream) | "dark" }
    card: (o) => ({ back: `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="${o.tone === 'dark' ? '#1b1715' : '#efe9dc'}"/>${tex(.35)}`, noGround: true }),
  });
  const _inst = installStatic;
  installStatic = function () {
    _inst();
    const host = document.createElement('div');
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs>
      <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fbde0"/><stop offset="1" stop-color="#e8eef0"/></linearGradient>
      <linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140c22"/><stop offset="1" stop-color="#3a2440"/></linearGradient></defs></svg>`;
    document.getElementById('defs').appendChild(host.firstChild);
  };
})();
