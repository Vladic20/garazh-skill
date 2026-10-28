// ─── look "underground": подпольный инженерный симулятор (vertical shorts) ───────────────────────────────────────
// One persistent cutaway diorama (sky → building → hidden room → earth layers) that gets upgraded scene by scene: write the
// whole film as one keep-chain with cam { to, ease: "glide" } and add machines on cue words. A screen-fixed HUD with a counter,
// an upgrade list and two-tone uppercase karaoke captions come from the prop "ui" (drawn in the HTML layer).
// Set: cutaway { top: garage | house | none, room: under | attic, sky: dusk | day | night | winter, skyFrom, label, neighbor,
//   ladder (x), row (co-op garages), snow, roofBare, lampsOff, alarm }. Shared props: ui, stamp2, tag, pipe, steam, waves, heat,
//   sparks, thermo, coins, plus, beacon, mark, measure, card, huh, wire. Episode-specific machines go into episode scripts
//   (see episodes/look-underground/art). The sets and props are registered for every look; the overrides below only for this one.
// Never name a state field "on" (it is the cue key): use lit / run / off / power.
(function () {
  const K = {
    ink: '#1b1820', red: '#ff3b4e', green: '#36e08a', yellow: '#ffd23f', cyan: '#3ac8ff', orange: '#ff8a3d', white: '#f3f1ec',
    wall: '#8a8f98', wallDark: '#5d626b', room: '#26242f', roomLine: '#2f2c3a', earth: '#4b3326', earth2: '#3e2a1f', earth3: '#33231a',
    grass: '#5f9a3e', grassDark: '#3e6e2a', metal: '#b9bfc6', metalDark: '#7c838c', lamp: '#ffe7a6', water: '#2f9fe0',
  };
  window.UGK = K;
  const S = (w = 3, c = K.ink) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const F = 'Rubik, sans-serif', MONO_F = `'JetBrains Mono', Consolas, monospace`;
  window.UGS = S;

  // ── helpers shared with episode art ──
  // age of a prop: kept items (keep:true) come back with enter "none" → their entry animation is long finished
  const age = (p, lt) => p.enter === 'none' ? 99 : lt;
  // seconds since field `key` last changed (via then/change); 99 if it was never changed in this scene
  const since = (p, key, t) => { let ts = null; for (const c of p.then || []) if (c.t <= t && key in c) ts = c.t; return ts == null ? 99 : t - ts; };
  const sceneLt = t => { const i = sceneIndex(t); return [TL.scenes[i], t - TL.scenes[i].from, i]; };
  window.UG = { K, S, age, since, sceneLt, F, MONO_F };

  // ── look: clean flat picture (noir base without the dirt) ──
  if (isLook('underground')) {
    addCss(`
      .look-underground .grain { opacity: .05; }
      .look-underground #vignette { background: radial-gradient(ellipse 85% 75% at 50% 45%, transparent 58%, rgba(8,6,12,.45) 100%); }
      .look-underground #fade { background: #0d0b12; }
      .ug-hud { position: absolute; left: 50%; top: 30px; transform: translateX(-50%); white-space: nowrap; padding: 9px 18px 9px 16px; border-radius: 9px;
        background: rgba(12,14,18,.92); border: 2px solid #1d3b2c; font: 700 17px/1 'JetBrains Mono', monospace; letter-spacing: 1.5px; color: #36e08a;
        box-shadow: 0 4px 0 rgba(0,0,0,.35); }
      .ug-hud.alert { color: #ff4b5c; border-color: #4a1d24; }
      .ug-hud .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: currentColor; margin-right: 10px; vertical-align: 1px; }
      .ug-upg { position: absolute; left: 20px; top: 92px; }
      .ug-chip { display: block; width: max-content; margin-bottom: 6px; padding: 6px 11px 6px 10px; border-radius: 6px; background: #eef0f2; color: #1b1820;
        font: 800 15px/1 Rubik, sans-serif; letter-spacing: .3px; box-shadow: 0 3px 0 rgba(0,0,0,.28); }
      .ug-chip .sub { display: block; margin-top: 5px; font: 700 11px/1 'JetBrains Mono', monospace; letter-spacing: 1px; color: #1f9e5c; }
      .ug-chip.new { background: #36e08a; }
      .ug-chip.new .sub { color: #0f3d26; }
      .ug-cap { position: absolute; left: 50%; bottom: 205px; transform: translateX(-50%); width: 660px; text-align: center;
        font: 900 54px/1.04 Rubik, sans-serif; letter-spacing: -.5px; text-transform: uppercase; color: #ece9e4;
        text-shadow: 0 4px 0 rgba(0,0,0,.55), 0 0 18px rgba(0,0,0,.55); }
      .ug-cap span { display: inline-block; margin: 0 .12em; }
      .ug-cap .g { color: #36e08a; } .ug-cap .y { color: #ffd23f; } .ug-cap .r { color: #ff4b5c; } .ug-cap .c { color: #5fd2ff; }
    `);
    filmDamage = () => '';
    boilFilter = () => 'none';
    groundSvg = () => '';
  }

  // ── the world: cutaway diorama ─────────────────────────────────────────────────────────────────────────
  // set { type: "cutaway", top: "garage" | "house" | "dacha", sky: "dusk" | "day" | "night" | "winter", skyFrom, label,
  //       neighbor: true, snow: true, roofBare: true, room: "under" | "attic", lampsOff, alarm }
  const SKY = {
    dusk:   ['#2c2945', '#8d5a7c', '#f2a273'],
    day:    ['#5fa8e0', '#9fd0ef', '#e6f2f2'],
    night:  ['#0e1024', '#1d2246', '#3a3f6a'],
    winter: ['#5d6f8c', '#a8b6c8', '#e3e8ee'],
  };
  const mixC = (a, b, k) => mixHex(a, b, clamp(k));
  const SURF = 470;   // under: the surface line; attic: the ground is y 900
  window.UG.SURF = SURF;

  function garage(o, t, x0, x1, roofSnow) {
    const top = 268, h = SURF - top, w = x1 - x0, cx = (x0 + x1) / 2;
    let s = `<rect x="${x0}" y="${top}" width="${w}" height="${h}" fill="#9aa0a8" ${S(3)}/>`;
    s += `<path d="M${x0 - 16} ${top + 2} L${cx} ${top - 58} L${x1 + 16} ${top + 2} Z" fill="#6c727b" ${S(3)}/>`;
    if (roofSnow) s += `<path d="M${x0 - 18} ${top + 2} L${cx} ${top - 60} L${x1 + 18} ${top + 2} L${x1 + 6} ${top + 8} Q${cx + 60} ${top - 30} ${cx} ${top - 44} Q${cx - 70} ${top - 30} ${x0 - 4} ${top + 9} Z" fill="#f4f7fb" ${S(2.5)}/>`;
    // door
    const dx0 = x0 + 36, dw = w * .56, dy = top + 52;
    s += `<rect x="${dx0}" y="${dy}" width="${dw}" height="${SURF - dy}" fill="#c3c8cd" ${S(3)}/>`;
    for (let y = dy + 12; y < SURF - 6; y += 13) s += `<path d="M${dx0 + 6} ${y} H${dx0 + dw - 6}" stroke="#a3a9b0" stroke-width="3"/>`;
    s += `<text x="${cx}" y="${top + 34}" text-anchor="middle" font-family="${F}" font-weight="800" font-size="18" fill="#3b3f46">${esc(o.label || 'ГАРАЖ №12')}</text>`;
    // small window + vent
    s += `<rect x="${x1 - 70}" y="${top + 66}" width="40" height="34" fill="#3b4652" ${S(3)}/><path d="M${x1 - 50} ${top + 66} v34 M${x1 - 70} ${top + 83} h40" stroke="${K.ink}" stroke-width="2"/>`;
    return s;
  }
  function house(o, t, x0, x1, roofSnow) {
    const top = 250, cx = (x0 + x1) / 2, lit = o.night || o.sky === 'night' || o.sky === 'winter';
    let s = `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${SURF - top}" fill="#c98f62" ${S(3)}/>`;
    for (let y = top + 18; y < SURF; y += 22) s += `<path d="M${x0 + 3} ${y} H${x1 - 3}" stroke="#b37b52" stroke-width="2"/>`;
    s += `<path d="M${x0 - 20} ${top + 4} L${cx} ${top - 92} L${x1 + 20} ${top + 4} Z" fill="#8a4b3a" ${S(3)}/>`;
    if (roofSnow) s += `<path d="M${x0 - 22} ${top + 4} L${cx} ${top - 94} L${x1 + 22} ${top + 4} L${x1 + 8} ${top + 9} Q${cx + 70} ${top - 50} ${cx} ${top - 76} Q${cx - 70} ${top - 50} ${x0 - 8} ${top + 10} Z" fill="#f4f7fb" ${S(2.5)}/>`;
    for (const wx of [x0 + 40, x1 - 100]) s += `<rect x="${wx}" y="${top + 50}" width="60" height="62" fill="${lit ? '#ffd88a' : '#3b4652'}" ${S(3)}/><path d="M${wx + 30} ${top + 50} v62 M${wx} ${top + 81} h60" stroke="${K.ink}" stroke-width="2.5"/>`;
    s += `<rect x="${cx - 26}" y="${SURF - 92}" width="52" height="92" fill="#6b4a33" ${S(3)}/><circle cx="${cx + 14}" cy="${SURF - 46}" r="4" fill="${K.yellow}"/>`;
    return s;
  }
  // neighbour's little house on the right edge (+ fence)
  function neighbor(o, t, roofSnow) {
    const x0 = 612, top = 330, lit = o.sky === 'night' || o.sky === 'winter';
    let s = `<path d="M${x0 - 40} ${SURF} v-46 M${x0 - 26} ${SURF} v-46 M${x0 - 12} ${SURF} v-46 M${x0 - 46} ${SURF - 30} h44" stroke="#7a5a3a" stroke-width="5" stroke-linecap="round"/>`;
    s += `<rect x="${x0}" y="${top}" width="150" height="${SURF - top}" fill="#e2c46a" ${S(3)}/><path d="M${x0 - 14} ${top + 2} L${x0 + 75} ${top - 64} L${x0 + 164} ${top + 2} Z" fill="#b5523f" ${S(3)}/>`;
    if (roofSnow) s += `<path d="M${x0 - 16} ${top + 2} L${x0 + 75} ${top - 66} L${x0 + 166} ${top + 2} Q${x0 + 75} ${top - 40} ${x0 - 16} ${top + 2} Z" fill="#f4f7fb" ${S(2.5)}/>`;
    s += `<rect x="${x0 + 26}" y="${top + 34}" width="46" height="46" fill="${lit ? '#ffd88a' : '#3b4652'}" ${S(3)}/>`;
    return s;
  }
  function earth(t, y0) {
    const r = rng(41); let s = `<rect x="-60" y="${y0}" width="${W + 120}" height="${H - y0 + 60}" fill="${K.earth}"/>`;
    s += `<path d="M-60 ${y0 + 360} Q 200 ${y0 + 330} 400 ${y0 + 362} T ${W + 60} ${y0 + 350} V ${H + 60} H -60 Z" fill="${K.earth2}"/>`;
    s += `<path d="M-60 ${y0 + 600} Q 220 ${y0 + 580} 420 ${y0 + 606} T ${W + 60} ${y0 + 596} V ${H + 60} H -60 Z" fill="${K.earth3}"/>`;
    for (let i = 0; i < 46; i++) { const x = r() * W, y = y0 + 20 + r() * (H - y0), rx = 6 + r() * 14;
      s += `<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(rx)}" ry="${f2(rx * .55)}" fill="#5d4232" opacity="${f2(.55 + r() * .4)}"/>`; }
    return s;
  }
  function grass(y, t) {
    let s = `<rect x="-60" y="${y - 8}" width="${W + 120}" height="18" fill="${K.grass}"/><rect x="-60" y="${y + 8}" width="${W + 120}" height="5" fill="${K.grassDark}"/>`;
    const r = rng(7);
    for (let i = 0; i < 26; i++) { const x = r() * W, h = 14 + r() * 18, sw = Math.sin(t * 1.6 + i) * 3;
      s += `<path d="M${f2(x)} ${y - 6} q${f2(2 + sw)} ${f2(-h * .6)} ${f2(sw * 1.5)} ${f2(-h)}" fill="none" stroke="${K.grass}" stroke-width="4" stroke-linecap="round"/>`; }
    return s;
  }
  // underground room shell: back wall, lamps, ladder shaft; o.lampsOff, o.alarm (red pulse)
  function roomUnder(o, t) {
    const x0 = 46, x1 = 674, y0 = 540, y1 = 905, wt = 16;
    let s = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${K.wall}" ${S(3)}/>`;
    s += `<rect x="${x0 + wt}" y="${y0 + wt}" width="${x1 - x0 - 2 * wt}" height="${y1 - y0 - 2 * wt}" fill="${K.room}"/>`;
    for (let x = x0 + wt + 40; x < x1 - wt; x += 64) s += `<path d="M${x} ${y0 + wt} V${y1 - wt}" stroke="${K.roomLine}" stroke-width="3"/>`;
    // floor slab
    s += `<rect x="${x0 + wt}" y="${y1 - wt - 6}" width="${x1 - x0 - 2 * wt}" height="6" fill="#3a3744"/>`;
    // lamps + cones
    const lx = o.lamps || [180, 360, 540];
    lx.forEach((x, i) => {
      const on = !o.lampsOff, fl = on ? .85 + .15 * Math.sin(t * 40 + i * 2) * (rng(Math.floor(t * 6) + i)() < .08 ? 1 : 0) : 0;
      if (on) s += `<path d="M${x - 16} ${y0 + wt + 6} L${x - 110} ${y1 - wt} H${x + 110} L${x + 16} ${y0 + wt + 6} Z" fill="${K.lamp}" opacity="${f2(.07 * fl)}"/>`;
      s += `<rect x="${x - 18}" y="${y0 + wt}" width="36" height="9" rx="3" fill="${on ? K.lamp : '#55525e'}"/>`;
    });
    if (o.alarm) { const a = (Math.sin(t * 7) + 1) / 2; s += `<rect x="${x0 + wt}" y="${y0 + wt}" width="${x1 - x0 - 2 * wt}" height="${y1 - y0 - 2 * wt}" fill="${K.red}" opacity="${f2(.05 + a * .09)}"/>`; }
    return s;
  }
  // ladder shaft from the room ceiling up into the building above (x = o.ladder)
  function ladder(x, yTop, yBot) {
    let s = `<rect x="${x - 22}" y="${yTop}" width="44" height="${yBot - yTop}" fill="#1c1a22"/>`;
    s += `<path d="M${x - 14} ${yTop} V${yBot} M${x + 14} ${yTop} V${yBot}" stroke="#c9ced4" stroke-width="5"/>`;
    for (let y = yTop + 16; y < yBot; y += 22) s += `<path d="M${x - 14} ${y} H${x + 14}" stroke="#c9ced4" stroke-width="4"/>`;
    return s;
  }
  // attic cutaway (dacha): ground floor + attic under a gable roof, chimney at o.chimney (x)
  function dacha(o, t, roofSnow) {
    const g = 900, x0 = o.x0 ?? 80, x1 = o.x1 ?? 640, fl = 640, apex = 330, cx = (x0 + x1) / 2, chx = o.chimney || 486;
    let s = '';
    // ground floor (cut open)
    s += `<rect x="${x0}" y="${fl}" width="${x1 - x0}" height="${g - fl}" fill="#b98a5e" ${S(3)}/><rect x="${x0 + 14}" y="${fl + 14}" width="${x1 - x0 - 28}" height="${g - fl - 26}" fill="#e9d6b4"/>`;
    for (let x = x0 + 40; x < x1 - 20; x += 48) s += `<path d="M${x} ${fl + 14} V${g - 12}" stroke="#ddc6a0" stroke-width="3"/>`;
    // window with a view
    const wx = o.window ?? x0 + 40;
    s += `<rect x="${wx}" y="${fl + 50}" width="90" height="80" fill="${o.sky === 'night' ? '#1d2246' : '#9fd0ef'}" ${S(3)}/><path d="M${wx + 45} ${fl + 50} v80 M${wx} ${fl + 90} h90" stroke="${K.ink}" stroke-width="2.5"/>`;
    // stove (печь) under the chimney
    s += `<rect x="${chx - 50}" y="${g - 150}" width="100" height="138" fill="#f2efe8" ${S(3)}/><rect x="${chx - 28}" y="${g - 70}" width="56" height="40" fill="#2a2420" ${S(2.5)}/>`;
    s += `<rect x="${chx - 18}" y="${fl}" width="36" height="${g - 150 - fl}" fill="#a24f3c" ${S(3)}/>`;
    // attic floor + roof
    s += `<rect x="${x0 - 8}" y="${fl - 12}" width="${x1 - x0 + 16}" height="14" fill="#7a5638" ${S(3)}/>`;
    s += `<path d="M${x0 - 34} ${fl - 10} L${cx} ${apex - 26} L${x1 + 34} ${fl - 10} Z" fill="#6f3e33" ${S(3)}/>`;
    s += `<path d="M${x0 + 2} ${fl - 12} L${cx} ${apex + 2} L${x1 - 2} ${fl - 12} Z" fill="${o.lampsOff ? '#1f1c26' : '#3a2f3a'}"/>`;
    for (let i = 1; i < 6; i++) { const x = x0 + (x1 - x0) * i / 6; const yy = apex + 2 + Math.abs(x - cx) / ((x1 - x0) / 2) * (fl - 12 - apex - 2); s += `<path d="M${x} ${fl - 12} V${f2(yy)}" stroke="#463844" stroke-width="5"/>`; }
    if (roofSnow) s += `<path d="M${x0 - 36} ${fl - 10} L${cx} ${apex - 28} L${x1 + 36} ${fl - 10} L${x1 + 20} ${fl - 4} Q${cx + 90} ${apex + 10} ${cx} ${apex - 8} Q${cx - 90} ${apex + 10} ${x0 - 20} ${fl - 3} Z" fill="#f4f7fb" ${S(2.5)}/>`;
    // chimney through the attic and the roof
    s += `<rect x="${chx - 18}" y="${apex - 36}" width="36" height="${fl - 12 - apex + 36}" fill="#a24f3c" ${S(3)}/>`;
    for (let y = apex - 24; y < fl - 12; y += 18) s += `<path d="M${chx - 18} ${y} h36" stroke="#8a3f30" stroke-width="2"/>`;
    s += `<rect x="${chx - 24}" y="${apex - 46}" width="48" height="14" fill="#8a3f30" ${S(3)}/>`;
    // attic lamp
    if (!o.lampsOff) s += `<path d="M${cx - 60} ${apex + 80} L${cx - 190} ${fl - 12} H${cx + 70} L${cx - 40} ${apex + 80} Z" fill="${K.lamp}" opacity=".07"/>`;
    s += `<path d="M${cx - 50} ${apex + 30} v40" stroke="${K.ink}" stroke-width="2"/><circle cx="${cx - 50}" cy="${apex + 78}" r="9" fill="${o.lampsOff ? '#55525e' : K.lamp}"/>`;
    if (o.alarm) { const a = (Math.sin(t * 7) + 1) / 2; s += `<path d="M${x0 + 2} ${fl - 12} L${cx} ${apex + 2} L${x1 - 2} ${fl - 12} Z" fill="${K.red}" opacity="${f2(.05 + a * .1)}"/>`; }
    return s;
  }

  SETS_LIB.cutaway = function (o, t) {
    const [sc, lt] = sceneLt(t);
    const k = o.skyFrom ? easeInOut(prog(lt, 0, 1.4)) : 1;
    const A = SKY[o.skyFrom || o.sky || 'dusk'], B = SKY[o.sky || 'dusk'];
    const c = [0, 1, 2].map(i => mixC(A[i], B[i], k));
    const attic = o.room === 'attic', groundY = attic ? 900 : SURF;
    let back = `<defs><linearGradient id="ugsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs>
      <rect x="-60" y="-60" width="${W + 120}" height="${groundY + 70}" fill="url(#ugsky)"/>`;
    const night = (o.sky === 'night' || o.sky === 'winter');
    if (night) { const r = rng(3); for (let i = 0; i < 40; i++) back += `<circle cx="${f2(r() * W)}" cy="${f2(r() * groundY * .6)}" r="${f2(.8 + r() * 1.6)}" fill="#fff" opacity="${f2(k * (.35 + .5 * Math.abs(Math.sin(t * 1.3 + i))))}"/>`;
      back += `<circle cx="596" cy="138" r="30" fill="#f6eecf" opacity="${f2(k)}"/>`; }
    else if (o.sky !== 'day') back += `<circle cx="590" cy="176" r="34" fill="#ffe2a8" opacity=".9"/>`;
    else back += `<circle cx="600" cy="120" r="36" fill="#fff3b0"/>`;
    if (o.snow) { back += `<rect x="-60" y="${groundY - 10}" width="${W + 120}" height="14" fill="#f4f7fb" opacity="${f2(k)}"/>`; }
    back += earth(t, groundY + 12) + grass(groundY + 4, t);
    if (o.snow) back += `<rect x="-60" y="${groundY - 6}" width="${W + 120}" height="12" rx="6" fill="#f4f7fb" opacity="${f2(k)}"/>`;
    if (o.neighbor) back += neighbor(o, t, o.snow && k > .5);
    if (attic) back += dacha(o, t, o.snow && !o.roofBare && k > .5);
    else {
      if (o.top === 'house') back += house(o, t, 170, 560, o.snow && !o.roofBare && k > .5);
      else if (o.top !== 'none') {
        if (o.row) { back += garage({ label: o.rowLabels?.[0] || 'БОКС 46' }, t, -170, 190, false) + garage({ label: o.rowLabels?.[1] || 'БОКС 48' }, t, 598, 958, false); }
        back += garage(o, t, 214, 574, o.snow && !o.roofBare && k > .5);
      }
      back += roomUnder(o, t);
      if (o.ladder) back += ladder(o.ladder, SURF - 4, 890);
    }
    if (o.alarm && !attic) back += '';
    return { back, noGround: true };
  };

  // ── HUD + upgrades + captions (HTML layer, fixed to the screen) ──────────────────────────────────────
  // prop { type: "ui", id: "ui", hud: "ГАРАЖ №12 · −5 М · {n} TH/S", n: 0, alert: false, upg: [["1. ВОДА", "90° → 35°"]], colors: { g: [...], y: [...], r: [...] } }
  const pnum = v => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  PROPS.ui = () => '';
  function uiItem(t) { const sc = TL.scenes[sceneIndex(t)]; return sc.items.find(x => x.type === 'ui'); }
  function uiN(it, t) {
    let v = it.n || 0;
    for (const c of it.then || []) if ('n' in c && t >= c.t) v = lerp(v, c.n, easeOut(prog(t, c.t, c.t + (c.ndur || 1.3))));
    return v;
  }
  let COLORS = null;
  const stem = w => w.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9°%]/g, '');
  function wordClass(w) {
    if (!COLORS) { COLORS = {}; for (const sc of TL.scenes) for (const it of sc.items) if (it.type === 'ui' && it.colors) { COLORS = it.colors; break; } }
    const s = stem(w); if (!s) return '';
    for (const cls of ['r', 'g', 'y', 'c']) for (const key of COLORS[cls] || []) { const k2 = stem(key); if (k2 && (s === k2 || (k2.length >= 4 && s.startsWith(k2)))) return cls; }
    return '';
  }
  if (isLook('underground')) captionHtml = function (t) {
    let html = '';
    const it0 = uiItem(t);
    if (it0 && t >= it0.t0) {
      const it = itemState(it0, t), hk = clamp((t - it0.t0) / .35);
      if (it.hud && it.hidehud !== true) {
        const txt = String(it.hud).replace('{n}', pnum(uiN(it0, t)));
        const blink = (Math.sin(t * 6) > -.2) ? 1 : .25;
        html += `<div class="ug-hud${it.alert ? ' alert' : ''}" style="opacity:${f2(it0.enter === 'none' ? 1 : hk)}"><span class="dot" style="opacity:${blink}"></span>${esc(txt)}</div>`;
      }
      const upg = it.upg || [];
      if (upg.length && !it.hideupg) {
        const ch = since(it0, 'upg', t), last = upg.length - 1;
        // only the last 4 fit; older ones scroll away
        const first = Math.max(0, upg.length - 4);
        html += `<div class="ug-upg">${upg.slice(first).map((u, j) => {
          const idx = first + j, fresh = idx === last && ch < 1.8, k = idx === last ? easeOutBack(clamp(ch / .4)) : 1;
          const [title, sub] = Array.isArray(u) ? u : [u, ''];
          return `<span class="ug-chip${fresh ? ' new' : ''}" style="transform:translateX(${f2(-260 * (1 - Math.min(1, k)))}px) scale(${f2(idx === last && ch < .4 ? .9 + .1 * k : 1)});transform-origin:0 50%">${esc(title)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>`;
        }).join('')}</div>`;
      }
    }
    // captions: the phrase builds word by word, every new word lands with a small pop
    const ph = (TL.subs || []).find(p => t >= p.from && t < p.to);
    if (ph && !(it0 && itemState(it0, t).nocap)) {
      const vis = ph.words.filter(([, wt]) => t >= wt - .04);
      if (vis.length) html += `<div class="ug-cap">${vis.map(([w, wt]) => {
        const k = clamp((t - wt + .04) / .14), sc = 1.22 - .22 * easeOut(k);
        return `<span class="${wordClass(w)}" style="transform:scale(${f2(sc)});opacity:${f2(.4 + .6 * k)}">${esc(w.replace(/[«»"]/g, ''))}</span>`;
      }).join('')}</div>`;
    }
    return html;
  };

  // ── shared props ────────────────────────────────────────────────────────────────────────────────────
  Object.assign(PROPS, {
    // slammed label. { text, color (red), size (30), tilt (-6) }
    stamp2(p, t, lt) {
      const a = age(p, lt), fs = p.size || 30, txt = String(p.text || ''), w = txt.length * fs * .64 + 34;
      const k = clamp(a / .18), sc = a > 5 ? 1 : lerp(1.7, 1, easeOut(k)) + (a > .18 && a < .45 ? Math.sin((a - .18) * 40) * .03 : 0);
      const col = p.color === 'green' ? K.green : p.color === 'yellow' ? K.yellow : (p.color || K.red);
      const tc = p.color === 'green' || p.color === 'yellow' ? K.ink : '#fff';
      return `<g transform="rotate(${p.tilt ?? -6}) scale(${f2(sc)})" opacity="${f2(clamp(k * 1.6))}"><rect x="${f2(-w / 2)}" y="${-fs * .78}" width="${f2(w)}" height="${f2(fs * 1.5)}" rx="5" fill="${col}" stroke="#fff" stroke-width="4"/>
        <text y="${f2(fs * .34)}" text-anchor="middle" font-family="${F}" font-weight="900" font-size="${fs}" fill="${tc}" letter-spacing=".5">${esc(txt.toUpperCase())}</text></g>`;
    },
    // small mono tag (machine label). { text, color (yellow), size (15), box: true }
    tag(p, t, lt) {
      const fs = p.size || 15, txt = String(p.text || '').toUpperCase(), n = Math.min(txt.length, Math.floor(age(p, lt) * 40) + 1), w = txt.length * fs * .62 + 16;
      return `${p.box !== false ? `<rect x="${f2(-w / 2)}" y="${-fs - 2}" width="${f2(w)}" height="${fs + 12}" rx="4" fill="rgba(10,10,14,.75)"/>` : ''}
        <text y="2" text-anchor="middle" font-family="${MONO_F}" font-weight="700" font-size="${fs}" letter-spacing="1" fill="${p.color || K.yellow}">${esc(txt.slice(0, n))}</text>`;
    },
    // pipe drawn along pts (world coords, the prop's x/y ignored). { pts: [[x,y],…], w (14), color, flow: true, flowColor, draw (s) }
    pipe(p, t, lt) {
      const pts = p.pts || [], a = age(p, lt);
      let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const k = easeInOut(clamp(a / (p.draw || .9))), d = 'M' + pts.map(q => q.join(' ')).join(' L'), w = p.w || 14;
      const col = p.color || K.metal;
      let s = `<path d="${d}" fill="none" stroke="${K.ink}" stroke-width="${w + 6}" stroke-linejoin="round" stroke-dasharray="${f2(len)}" stroke-dashoffset="${f2(len * (1 - k))}"/>
        <path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-dasharray="${f2(len)}" stroke-dashoffset="${f2(len * (1 - k))}"/>`;
      const fl = p.flow === true ? 1 : 0;
      if (fl && k >= 1) {
        const off = -((t * (p.speed || 70)) % 40);
        s += `<path d="${d}" fill="none" stroke="${p.flowColor || K.cyan}" stroke-width="${f2(w * .42)}" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="12 28" stroke-dashoffset="${f2(off)}" opacity="${f2(clamp(since(p, 'flow', t) / .4))}"/>`;
      }
      // joints
      for (let i = 1; i < pts.length - 1; i++) if (k * len > 0) s += `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="${f2(w * .62)}" fill="${col}" ${S(2.5)} opacity="${f2(clamp(k * 3 - i / pts.length * 2))}"/>`;
      return `<g transform="translate(${-p.x} ${-p.y})">${s}</g>`;
    },
    // rising puffs. { n (7), w (60) spread, rise (220), dir (deg, 0 = up), color, speed (1) }
    steam(p, t, lt) {
      const n = p.n || 7, w = p.w || 60, rise = p.rise || 220, a = age(p, lt), sp = p.speed || 1; let s = '';
      const on = p.off ? 0 : 1, fade = p.off ? clamp(1 - since(p, 'off', t) / .8) : 1;
      if (!on && fade <= 0) return '';
      for (let i = 0; i < n; i++) { const ph = ((t * .42 * sp + i / n) % 1), r = rng(i * 13 + (p.seed || 1)), x = (r() - .5) * w + Math.sin(t * 2 + i) * 8 * ph, y = -ph * rise;
        const rr = 18 * (p.size || 1) + ph * 46 * (p.size || 1), op = Math.sin(ph * Math.PI) * .55 * (p.alpha ?? 1) * clamp(a / .6) * fade;
        s += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(rr)}" fill="${p.color || '#f2f2f2'}" opacity="${f2(op)}"/>`; }
      return `<g transform="rotate(${p.dir || 0})">${s}</g>`;
    },
    // expanding sound arcs. { n (3), r (120), color, both: true (left+right), off }
    waves(p, t, lt) {
      const n = p.n || 3, R = p.r || 120, a = age(p, lt); let s = '';
      const fade = p.off ? clamp(1 - since(p, 'off', t) / .5) : clamp(a / .3);
      if (fade <= 0) return '';
      for (let i = 0; i < n; i++) { const ph = (t * 1.2 + i / n) % 1, r = 20 + ph * R, op = (1 - ph) * fade;
        for (const sx of p.both === false ? [1] : [-1, 1]) s += `<path d="M${f2(sx * r * .7)} ${f2(-r * .7)} A${f2(r)} ${f2(r)} 0 0 ${sx > 0 ? 1 : 0} ${f2(sx * r * .7)} ${f2(r * .7)}" fill="none" stroke="${p.color || K.yellow}" stroke-width="6" stroke-linecap="round" opacity="${f2(op)}"/>`; }
      return s;
    },
    // heat shimmer + red glow. { w (180), h (160), off }
    heat(p, t, lt) {
      const w = p.w || 180, h = p.h || 160, a = age(p, lt), fade = p.off ? clamp(1 - since(p, 'off', t) / .8) : clamp(a / .5);
      if (fade <= 0) return '';
      let s = `<ellipse cx="0" cy="${-h / 2}" rx="${w * .7}" ry="${h * .6}" fill="${K.red}" opacity="${f2(.16 * fade * (.8 + .2 * Math.sin(t * 5)))}"/>`;
      for (let i = 0; i < 5; i++) { const x = -w / 2 + i * w / 4, ph = (t * .9 + i * .23) % 1, y = -ph * h;
        s += `<path d="M${f2(x)} ${f2(y)} q8 -12 0 -24 t0 -24" fill="none" stroke="${K.orange}" stroke-width="4" stroke-linecap="round" opacity="${f2(Math.sin(ph * Math.PI) * .8 * fade)}"/>`; }
      return s;
    },
    // electric sparks around a point. { r (30), n (8), color }
    sparks(p, t, lt) {
      if (p.off) return '';
      const r = rng(Math.floor(t * 14) + (p.seed || 3)), n = p.n || 8; let s = '';
      for (let i = 0; i < n; i++) { if (r() < .45) continue; const a = r() * 6.28, d = 6 + r() * (p.r || 30), l = 6 + r() * 12;
        s += `<path d="M${f2(Math.cos(a) * d)} ${f2(Math.sin(a) * d)} l${f2(Math.cos(a) * l)} ${f2(Math.sin(a) * l)}" stroke="${p.color || K.yellow}" stroke-width="3" stroke-linecap="round"/>`; }
      return s + `<circle r="${f2(6 + r() * 4)}" fill="#fff6c0" opacity=".8"/>`;
    },
    // thermometer chip with a counting value. { from, to, dur (1.4), unit "°C", hot (threshold for red) }
    thermo(p, t, lt) {
      let v = p.from ?? 20; const T = p.then || [];
      v = p.enter === 'none' && p.val != null ? p.val : lerp(v, p.to ?? v, easeOut(clamp(age(p, lt) / (p.dur || 1.4))));
      for (const c of T) if ('val' in c && t >= c.t) v = lerp(v, c.val, easeOut(prog(t, c.t, c.t + (c.vdur || 1.4))));
      const hot = v >= (p.hot ?? 60), col = hot ? K.red : K.green, lvl = clamp((v - 10) / 90);
      return `<rect x="-58" y="-34" width="116" height="68" rx="10" fill="rgba(12,12,16,.88)" stroke="${col}" stroke-width="3"/>
        <rect x="-46" y="-22" width="12" height="44" rx="6" fill="#33313a"/><rect x="-46" y="${f2(22 - 44 * lvl)}" width="12" height="${f2(44 * lvl)}" rx="6" fill="${col}"/>
        <text x="10" y="11" text-anchor="middle" font-family="${F}" font-weight="900" font-size="30" fill="${col}">${Math.round(v)}${esc(p.unit ?? '°')}</text>`;
    },
    // coins / tokens popping up and floating. { glyph ("₿"), rate (2.2 per s), spread (120), color, rise (160) }
    coins(p, t, lt) {
      if (p.off) return '';
      const rate = p.rate || 2.2, life = 1.4, a = age(p, lt), n = Math.ceil(rate * life) + 1; let s = '';
      const start = Math.floor((t - life) * rate);
      for (let j = start; j <= start + n; j++) { const t0 = j / rate, ph = (t - t0) / life; if (ph < 0 || ph > 1 || t0 < t - a) continue;
        const r = rng(j * 7 + 5), x = (r() - .5) * (p.spread || 120), y = -ph * (p.rise || 160), op = ph < .15 ? ph / .15 : 1 - Math.max(0, (ph - .6) / .4);
        s += `<g transform="translate(${f2(x)} ${f2(y)})" opacity="${f2(op)}"><circle r="16" fill="${p.color || K.yellow}" ${S(3)}/><text y="7" text-anchor="middle" font-family="${F}" font-weight="900" font-size="19" fill="${K.ink}">${esc(p.glyph || '₿')}</text></g>`; }
      return s;
    },
    // floating "+N" text bursts. { text ("+1"), rate (1.5), color }
    plus(p, t, lt) {
      if (p.off) return '';
      const rate = p.rate || 1.5, life = 1.1, a = age(p, lt); let s = '';
      const start = Math.floor((t - life) * rate);
      for (let j = start; j <= start + 3; j++) { const t0 = j / rate, ph = (t - t0) / life; if (ph < 0 || ph > 1 || t0 < t - a) continue;
        const r = rng(j * 3 + 1), x = (r() - .5) * (p.spread || 80);
        s += `<text x="${f2(x)}" y="${f2(-ph * 90)}" text-anchor="middle" font-family="${F}" font-weight="900" font-size="${p.size || 26}" fill="${p.color || K.green}" stroke="${K.ink}" stroke-width="5" paint-order="stroke" opacity="${f2(1 - ph * ph)}">${esc(p.text || '+1')}</text>`; }
      return s;
    },
    // rotating red beacon. { off }
    beacon(p, t, lt) {
      const a = (t * 360 * 1.4) % 360, on = !p.off;
      return `<rect x="-14" y="-6" width="28" height="8" fill="#55525e" ${S(2)}/><path d="M-11 -6 Q-11 -26 0 -26 Q11 -26 11 -6 Z" fill="${on ? K.red : '#7a3a40'}" ${S(2.5)}/>
        ${on ? `<g transform="rotate(${f2(a)} 0 -16)"><path d="M0 -16 L120 -46 L120 14 Z" fill="${K.red}" opacity=".18"/></g>` : ''}`;
    },
    // big check / cross burst. { kind: "check" | "cross", r (34) }
    mark(p, t, lt) {
      const r = p.r || 34, k = easeOutBack(clamp(age(p, lt) / .3)), ok = p.kind !== 'cross';
      return `<g transform="scale(${f2(k)})"><circle r="${r}" fill="${ok ? K.green : K.red}" stroke="#fff" stroke-width="4"/>
        ${ok ? `<path d="M${-r * .45} 0 L${-r * .1} ${r * .35} L${r * .5} ${-r * .35}" fill="none" stroke="${K.ink}" stroke-width="${r * .2}" stroke-linecap="round" stroke-linejoin="round"/>`
             : `<path d="M${-r * .38} ${-r * .38} L${r * .38} ${r * .38} M${r * .38} ${-r * .38} L${-r * .38} ${r * .38}" stroke="#fff" stroke-width="${r * .2}" stroke-linecap="round"/>`}</g>`;
    },
    // measure line with a label. { from: [x,y], to: [x,y], text }
    measure(p, t, lt) {
      const [a, b] = [p.from, p.to], k = easeInOut(clamp(age(p, lt) / .6)), bx = lerp(a[0], b[0], k), by = lerp(a[1], b[1], k);
      return `<g transform="translate(${-p.x} ${-p.y})"><path d="M${a[0]} ${a[1]} L${f2(bx)} ${f2(by)}" stroke="${K.yellow}" stroke-width="3" stroke-dasharray="8 6"/>
        <path d="M${a[0] - 8} ${a[1]} h16 M${f2(bx - 8)} ${f2(by)} h16" stroke="${K.yellow}" stroke-width="3"/>
        <text x="${(a[0] + b[0]) / 2 + 12}" y="${(a[1] + b[1]) / 2 + 6}" font-family="${MONO_F}" font-weight="700" font-size="18" fill="${K.yellow}" opacity="${f2(k)}">${esc(p.text || '')}</text></g>`;
    },
    // final summary card: { title, items: [[label, note], …], step (0.45 s between ticks), w (440) }
    card(p, t, lt) {
      const a = age(p, lt), items = p.items || [], w = p.w || 470, rh = 46, h = 70 + items.length * rh + 18, k = easeOutBack(clamp(a / .45));
      let s = `<g transform="rotate(-3) scale(${f2(k)})"><rect x="${-w / 2 + 6}" y="${-h / 2 + 8}" width="${w}" height="${h}" rx="10" fill="#000" opacity=".3"/>
        <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="10" fill="#f6f3ea" ${S(3)}/>
        <text x="${-w / 2 + 24}" y="${-h / 2 + 40}" font-family="${MONO_F}" font-weight="700" font-size="17" letter-spacing="1.5" fill="${K.ink}">${esc(String(p.title || 'ИТОГ').toUpperCase())}</text>
        <path d="M${-w / 2 + 22} ${-h / 2 + 54} H${w / 2 - 22}" stroke="${K.ink}" stroke-width="2" opacity=".3"/>`;
      items.forEach(([lab, note], i) => {
        const y = -h / 2 + 88 + i * rh, tk = clamp((a - .5 - i * (p.step || .45)) / .2);
        s += `<rect x="${-w / 2 + 24}" y="${y - 16}" width="22" height="22" rx="4" fill="#fff" ${S(2.5)}/>
          ${tk > 0 ? `<path d="M${-w / 2 + 28} ${y - 5} l6 7 l12 -14" fill="none" stroke="${K.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="30" stroke-dashoffset="${f2(30 * (1 - tk))}"/>` : ''}
          <text x="${-w / 2 + 60}" y="${y + 2}" font-family="${F}" font-weight="800" font-size="22" fill="${K.ink}">${esc(lab)}</text>
          <text x="${w / 2 - 22}" y="${y + 1}" text-anchor="end" font-family="${MONO_F}" font-weight="700" font-size="14" fill="#1f9e5c" opacity="${f2(tk)}">${esc(String(note || '').toUpperCase())}</text>`;
      });
      return s + '</g>';
    },
    // a little worried "?!" pair over someone's head. { text ("??") }
    huh(p, t, lt) {
      const a = age(p, lt), k = easeOutBack(clamp(a / .3)), txt = p.text || '??';
      return `<g transform="scale(${f2(k)}) translate(0 ${f2(Math.sin(t * 4) * 3)})">${[...txt].map((ch, i) => `<g transform="translate(${(i - (txt.length - 1) / 2) * 34} ${i % 2 ? -8 : 0})"><circle r="15" fill="#fff" ${S(2.5)}/><text y="7" text-anchor="middle" font-family="${F}" font-weight="900" font-size="20" fill="${K.ink}">${esc(ch)}</text></g>`).join('')}</g>`;
    },
    // glowing electrical wire along pts; { pts, hot: true → red + flicker }
    wire(p, t, lt) {
      const d = 'M' + (p.pts || []).map(q => q.join(' ')).join(' L'), hot = !!p.hot, k = hot ? .75 + .25 * Math.sin(t * 23) : 0;
      return `<g transform="translate(${-p.x} ${-p.y})"><path d="${d}" fill="none" stroke="${K.ink}" stroke-width="9" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="${hot ? mixHex('#ff8a3d', '#ffe0a0', k * .5) : '#2d2b33'}" stroke-width="5" stroke-linejoin="round"/>
        ${hot ? `<path d="${d}" fill="none" stroke="${K.red}" stroke-width="18" stroke-linejoin="round" opacity="${f2(.25 * k)}"/>` : ''}</g>`;
    },
  });
  if (isLook('underground')) window.sfxEvents = function () {
    const ev = [], seen = new Set();
    for (const sc of TL.scenes) for (const it of sc.items) {
      if (it.enter === 'none') continue;
      const key = it.id + ':' + it.t0; if (seen.has(key)) continue; seen.add(key);
      if (it.type === 'stamp2') ev.push({ t: it.t0, kind: 'stamp' });
      if (['mark', 'huh', 'solar', 'greenhouse'].includes(it.type)) ev.push({ t: it.t0, kind: 'pop' });
      if (it.type === 'card') (it.items || []).forEach((_, i) => ev.push({ t: it.t0 + .5 + i * (it.step || .45), kind: 'tick' }));
      for (const c of it.then || []) if (it.type === 'ui' && c.upg) ev.push({ t: c.t, kind: 'pop', gain: 1.3 });
    }
    return ev;
  };
})();
