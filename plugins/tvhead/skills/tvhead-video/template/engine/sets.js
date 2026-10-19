// ─── sets: environments behind (and sometimes in front of) the cast ─────────────────
// Scene "set": "city" | { "type": "city", "night": true, … }. Drawn in world space under the camera, sized from W / H / GROUND,
// so the same set works in 16:9 and 9:16. Each entry: (o, t) → { back, front?, noGround? }.
// "weather": "rain" | "snow" | "leaves" | "wind" (+ { amount }) is an overlay above the cast.
// Episodes can register more: window.SETS_LIB.myplace = (o, t) => ({ back: '<svg…>' }).
const S3 = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const soft = (svg, op = .9) => `<g opacity="${op}">${svg}</g>`;
const FAR = () => THEME.paperDark || '#9fa6aa';
function windowFrame(x, y, w, h, o = {}) {
  const sky = o.night ? '#3b4246' : (THEME.paperLight || '#dfe3e5');
  const outside = o.night ? `<circle cx="${x + w * .7}" cy="${y + h * .3}" r="${Math.min(w, h) * .12}" fill="${WHITE}" ${S3(2.5)}/>` : o.view === 'city'
    ? [0, 1, 2, 3].map(i => `<rect x="${x + 10 + i * w / 4}" y="${y + h * (.45 + (i % 2) * .15)}" width="${w / 5}" height="${h}" fill="${FAR()}" ${S3(2)}/>`).join('')
    : `<circle cx="${x + w * .72}" cy="${y + h * .32}" r="${Math.min(w, h) * .13}" fill="none" ${S3(2.5)}/>`;
  return `<clipPath id="wn${x | 0}${y | 0}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${sky}"/>
    <g clip-path="url(#wn${x | 0}${y | 0})">${outside}</g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${S3(4)}/><path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" ${S3(3)}/>`;
}
const curtains = (x, y, w, h) => `<path d="M${x - 24} ${y - 14} q12 ${h * .5} 0 ${h + 30} h34 q-16 ${-h * .5} 0 ${-h - 30} Z M${x + w + 24} ${y - 14} q-12 ${h * .5} 0 ${h + 30} h-34 q16 ${-h * .5} 0 ${-h - 30} Z" fill="${WHITE}" ${S3(3)}/><path d="M${x - 40} ${y - 16} H${x + w + 40}" ${S3(4)}/>`;
const frame = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${WHITE}" ${S3(3.5)}/><path d="M${x + 10} ${y + h - 12} l${w * .3} ${-h * .4} l${w * .2} ${h * .2} l${w * .25} ${-h * .3} l${w * .15} ${h * .5}" fill="none" ${S3(2.5)}/>`;
const clockWall = (x, y, t, r = 34) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${WHITE}" ${S3(3.5)}/><path d="M${x} ${y} L${x + Math.sin(t * .5) * r * .7} ${y - Math.cos(t * .5) * r * .7} M${x} ${y} L${x + Math.sin(t * .04 + 1) * r * .45} ${y - Math.cos(t * .04 + 1) * r * .45}" ${S3(3)}/>`;
const plant = (x, s = 1) => `<g transform="translate(${x} ${GROUND}) scale(${s})"><path d="M-22 0 L-26 -44 H26 L22 0 Z" fill="${WHITE}" ${S3(3)}/><path d="M0 -44 C-30 -80 -40 -120 -10 -150 M0 -44 C20 -90 50 -110 30 -150 M0 -44 C0 -90 4 -120 0 -170" fill="none" ${S3(3)}/>
  ${[[-24, -110], [30, -120], [-6, -150], [16, -84], [-30, -76]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="13" ry="7" transform="rotate(${a} ${a} ${b})" fill="${WHITE}" ${S3(2.5)}/>`).join('')}</g>`;
const pine = (x, h, fill) => `<g transform="translate(${f2(x)} ${GROUND})"><path d="M0 0 V-${h * .2}" ${S3(4)}/>${[0, 1, 2].map(i => `<path d="M${-h * (.32 - i * .07)} ${-h * (.18 + i * .26)} L0 ${-h * (.5 + i * .25)} L${h * (.32 - i * .07)} ${-h * (.18 + i * .26)} Z" fill="${fill}" ${S3(3)}/>`).join('')}</g>`;
const roundTree = (x, h, fill) => `<g transform="translate(${f2(x)} ${GROUND})"><path d="M0 0 V${-h * .5} M0 ${-h * .35} l${h * .12} ${-h * .1}" ${S3(5)}/><path d="M${-h * .32} ${-h * .62} C${-h * .45} ${-h * 1.05} ${h * .1} ${-h * 1.18} ${h * .22} ${-h * .95} C${h * .5} ${-h * .95} ${h * .45} ${-h * .5} ${h * .1} ${-h * .5} C${-h * .1} ${-h * .4} ${-h * .4} ${-h * .42} ${-h * .32} ${-h * .62} Z" fill="${fill}" ${S3(3)}/></g>`;
const building = (x, w, h, night, seed, fill) => {
  const r = rng(seed); let win = '';
  for (let yy = GROUND - h + 18; yy < GROUND - 30; yy += 30) for (let xx = x + 12; xx < x + w - 18; xx += 26) {
    const lit = night ? r() < .45 : r() < .15; win += `<rect x="${xx}" y="${yy}" width="12" height="16" fill="${lit ? (night ? '#f2d98a' : WHITE) : 'none'}" ${S3(1.8)}/>`;
  }
  return `<rect x="${x}" y="${GROUND - h}" width="${w}" height="${h}" fill="${fill}" ${S3(3)}/>${win}`;
};
const deskMonitor = (x, s = 1) => `<g transform="translate(${x} ${GROUND}) scale(${s})"><path d="M-70 -70 H70 M-60 -70 V0 M60 -70 V0" ${S3(4)}/><rect x="-34" y="-128" width="68" height="44" rx="4" fill="${SCREEN}" ${S3(3)}/><path d="M0 -84 V-72 M-12 -72 h24" ${S3(3)}/></g>`;

window.SETS_LIB = Object.assign(window.SETS_LIB || {}, {
  room: o => { const ww = Math.min(240, W * .3), wh = 200, wx = W * (PORTRAIT ? .55 : .68), wy = GROUND - 420;
    return { back: soft(`${windowFrame(wx, wy, ww, wh, o)}${o.curtains === false ? '' : curtains(wx, wy, ww, wh)}${o.frame === false ? '' : frame(W * (PORTRAIT ? .1 : .14), GROUND - 400, 120, 90)}
      ${o.lamp ? `<path d="M${W * .08} ${GROUND} V${GROUND - 240} M${W * .08 - 30} ${GROUND} h60" ${S3(4)}/><path d="M${W * .08 - 40} ${GROUND - 240} L${W * .08 - 26} ${GROUND - 300} H${W * .08 + 26} L${W * .08 + 40} ${GROUND - 240} Z" fill="${WHITE}" ${S3(3)}/>` : ''}
      <path d="M-200 ${GROUND - 30} H${W + 200}" ${S3(2)} opacity=".5"/>`) }; },
  bedroom: (o, t) => ({ back: SETS_LIB.room({ ...o, frame: false }, t).back + soft(`<g transform="translate(${W * (PORTRAIT ? .28 : .22)} ${GROUND})">${PROPS.bed({}, t)}</g>`) }),
  office: (o, t) => ({ back: soft(`${clockWall(W * (PORTRAIT ? .5 : .88), GROUND - (PORTRAIT ? 620 : 470), t)}
      <rect x="${W * (PORTRAIT ? .08 : .1)}" y="${GROUND - 460}" width="${PORTRAIT ? 180 : 260}" height="150" fill="${THEME.paperLight || '#dfe3e5'}" ${S3(3.5)}/>${Array.from({ length: 7 }, (_, i) => `<path d="M${W * (PORTRAIT ? .08 : .1)} ${GROUND - 450 + i * 20} h${PORTRAIT ? 180 : 260}" ${S3(1.5)}/>`).join('')}
      ${(PORTRAIT ? [.18, .82] : [.12, .34, .66, .88]).map(k => deskMonitor(W * k, .9)).join('')}${plant(W * (PORTRAIT ? .5 : .5), .8)}`, .85) }),
  classroom: (o, t) => { const bw = Math.min(W * .62, 640);
    return { back: soft(`<rect x="${CX - bw / 2}" y="${GROUND - 470}" width="${bw}" height="250" fill="#2f3b36" ${S3(5)}/><path d="M${CX - bw / 2 - 10} ${GROUND - 214} h${bw + 20}" ${S3(6)}/>
      ${o.text ? `<text x="${CX}" y="${GROUND - 330}" text-anchor="middle" font-family="${FONT}" font-size="${Math.min(70, bw / Math.max(6, String(o.text).length) * 1.6)}" fill="#eeeae0">${esc(o.text)}</text>` : `<path d="M${CX - bw * .35} ${GROUND - 380} q40 -30 80 0 t80 0 M${CX - bw * .3} ${GROUND - 310} h${bw * .4}" fill="none" stroke="#eeeae0" stroke-width="3"/>`}
      ${clockWall(CX + bw / 2 + 70, GROUND - 440, t, 28)}`, .9) }; },
  cafe: o => ({ back: soft(`<rect x="${W * .1}" y="${GROUND - 470}" width="${W * .8}" height="250" fill="${THEME.paperLight || '#dfe3e5'}" ${S3(4)}/><path d="M${CX} ${GROUND - 470} v250" ${S3(3)}/>
      ${Array.from({ length: Math.round(W * .8 / 60) }, (_, i) => `<path d="M${W * .1 + i * 60} ${GROUND - 470} l30 0 l0 30 q-15 14 -30 0 Z" fill="${i % 2 ? WHITE : ACCENT === INK ? '#8a9095' : ACCENT}" ${S3(2.5)}/>`).join('')}
      ${[.25, .75].map(k => `<path d="M${W * k} ${GROUND - 520} V${GROUND - 560} M${W * k - 26} ${GROUND - 500} Q${W * k} ${GROUND - 540} ${W * k + 26} ${GROUND - 500} Z" fill="${WHITE}" ${S3(3)}/>`).join('')}
      ${(PORTRAIT ? [.2] : [.15, .85]).map(k => `<g transform="translate(${W * k} ${GROUND})"><path d="M-46 -80 H46 M0 -80 V0 M-24 0 h48" ${S3(4)}/><path d="M-14 -96 h20 v16 h-20 Z M6 -92 q8 0 8 6 q0 6 -8 6" fill="${WHITE}" ${S3(2.5)}/></g>`).join('')}`, .88) }),
  kitchen: (o, t) => ({ back: soft(`<rect x="${W * .05}" y="${GROUND - 120}" width="${W * .9}" height="120" fill="${WHITE}" ${S3(3.5)}/><path d="M${W * .05} ${GROUND - 120} h${W * .9}" ${S3(5)}/>
      ${Array.from({ length: Math.round(W * .9 / 150) }, (_, i) => `<rect x="${W * .05 + 15 + i * 150}" y="${GROUND - 470}" width="120" height="120" fill="${WHITE}" ${S3(3)}/><circle cx="${W * .05 + 125 + i * 150}" cy="${GROUND - 410}" r="4" fill="${INK}"/><path d="M${W * .05 + 75 + i * 150} ${GROUND - 70} h20" ${S3(4)}/>`).join('')}
      ${clockWall(W * .5, GROUND - 290, t, 26)}`, .85) }),
  city: o => { const r = rng(o.seed || 7), fill = o.night ? '#555b60' : WHITE, farFill = FAR(); let back = '', far = '', x = -60;
    while (x < W + 60) { const w = 70 + r() * 90, h = 160 + r() * (PORTRAIT ? 480 : 300); far += `<rect x="${x - 20}" y="${GROUND - h - 60}" width="${w * .9}" height="${h + 60}" fill="${farFill}" stroke="${INK}" stroke-width="2" opacity=".55"/>`; back += building(x, w, h, o.night, (r() * 1e6) | 0, fill); x += w + 8 + r() * 24; }
    return { back: soft(far + back + (o.night ? `<circle cx="${W * .82}" cy="${GROUND - (PORTRAIT ? 900 : 560)}" r="40" fill="${WHITE}" ${S3(3)}/>` : ''), .92) }; },
  street: o => { const lamps = (PORTRAIT ? [.15, .85] : [.08, .5, .92]).map(k => `<g transform="translate(${W * k} ${GROUND})"><path d="M0 0 V-300 q0 -20 24 -20 h22" fill="none" ${S3(5)}/><path d="M40 -326 h24 l-6 16 h-12 Z" fill="${o.night ? '#f2d98a' : WHITE}" ${S3(3)}/>${o.night ? '<circle cx="52" cy="-300" r="60" fill="url(#glow)" opacity=".6"/>' : ''}</g>`).join('');
    const city = SETS_LIB.city({ ...o, seed: 11 });
    return { back: `<g transform="translate(${CX} ${GROUND}) scale(.7) translate(${-CX} ${-GROUND})">${city.back}</g>` + soft(lamps + `<path d="M-200 ${GROUND + 26} H${W + 200}" ${S3(3)}/>`) }; },
  forest: o => { const r = rng(o.seed || 3); let far = '', near = '';
    for (let x = -40; x < W + 60; x += 70 + r() * 40) far += pine(x, 220 + r() * 160, FAR());
    for (let x = -20; x < W + 40; x += 160 + r() * 120) near += pine(x, 340 + r() * 160, WHITE);
    return { back: soft(`<g opacity=".6">${far}</g>${near}`) }; },
  park: o => { const r = rng(o.seed || 5); let trees = '';
    for (let x = 40; x < W; x += 260 + r() * 120) trees += roundTree(x, 260 + r() * 120, WHITE);
    const bench = `<g transform="translate(${W * (PORTRAIT ? .7 : .78)} ${GROUND})"><path d="M-70 -46 H70 M-70 -70 H70 M-60 -46 V0 M60 -46 V0 M-64 -70 V-46 M64 -70 V-46" ${S3(5)}/></g>`;
    return { back: soft(trees + bench + `<path d="M-200 ${GROUND - 2} q60 -18 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" fill="none" ${S3(2.5)}/>`) }; },
  sea: (o, t) => { const hz = GROUND - (PORTRAIT ? 260 : 170); let waves = '';
    for (let y = hz + 26, i = 0; y < GROUND - 10; y += 26, i++) { let d = ''; for (let x = -100; x < W + 100; x += 60) d += `${x === -100 ? 'M' : 'L'}${x + ((t * 30 + i * 37) % 60)} ${f2(y + Math.sin(x * .05 + t * 2 + i) * 4)} `; waves += `<path d="${d}" fill="none" ${S3(2)} opacity="${.4 + i * .1}"/>`; }
    const sun = o.night ? `<circle cx="${W * .75}" cy="${hz - 120}" r="34" fill="${WHITE}" ${S3(3)}/>` : `<path d="M${W * .72 - 70} ${hz} A70 70 0 0 1 ${W * .72 + 70} ${hz}" fill="${WHITE}" ${S3(3.5)}/>`;
    const boat = o.boat ? `<g transform="translate(${W * .25 + Math.sin(t * .4) * 20} ${hz + 6})"><path d="M-40 0 h80 l-14 16 h-52 Z" fill="${WHITE}" ${S3(3)}/><path d="M0 0 V-60 L30 -8 Z" fill="${WHITE}" ${S3(3)}/></g>` : '';
    return { back: soft(`${sun}<path d="M-200 ${hz} H${W + 200}" ${S3(3)}/>${waves}${boat}<path d="M${W * .3} ${hz - 160} q10 -10 20 0 q10 -10 20 0 M${W * .4} ${hz - 200} q8 -8 16 0 q8 -8 16 0" fill="none" ${S3(2.5)}/>`) }; },
  mountains: o => { const r = rng(o.seed || 9); let far = '', near = ''; const base = GROUND;
    for (let x = -100; x < W + 100; x += 220 + r() * 140) { const h = 220 + r() * (PORTRAIT ? 420 : 240), w = 200 + r() * 160; far += `<path d="M${x - w / 2} ${base} L${x} ${base - h} L${x + w / 2} ${base} Z" fill="${FAR()}" ${S3(3)} opacity=".6"/>`; }
    for (let x = 0; x < W + 100; x += 320 + r() * 160) { const h = 260 + r() * (PORTRAIT ? 380 : 200), w = 320 + r() * 160;
      near += `<path d="M${x - w / 2} ${base} L${x} ${base - h} L${x + w / 2} ${base} Z" fill="${WHITE}" ${S3(3.5)}/><path d="M${x - w * .12} ${base - h * .76} L${x} ${base - h} L${x + w * .12} ${base - h * .76} l-${w * .05} 14 l-${w * .07} -10 l-${w * .07} 12 Z" fill="${THEME.paperLight || '#e6e9eb'}" ${S3(2.5)}/>`; }
    return { back: soft(far + near) }; },
  desert: o => ({ back: soft(`<circle cx="${W * .78}" cy="${GROUND - (PORTRAIT ? 760 : 420)}" r="56" fill="${WHITE}" ${S3(3.5)}/>
      <path d="M-200 ${GROUND - 60} Q${W * .2} ${GROUND - 160} ${W * .45} ${GROUND - 70} T${W + 200} ${GROUND - 90} V${GROUND} H-200 Z" fill="${THEME.paperLight || '#e3d9c0'}" ${S3(3)} opacity=".8"/>
      ${(PORTRAIT ? [.2] : [.15, .86]).map((k, i) => `<g transform="translate(${W * k} ${GROUND}) scale(${1 - i * .25})"><path d="M0 0 V-170 a18 18 0 0 1 36 0 V0 Z" transform="translate(-18 0)" fill="${WHITE}" ${S3(3.5)}/><path d="M-18 -80 h-24 v-50 a12 12 0 0 1 24 0 M18 -100 h24 v-40 a12 12 0 0 0 -24 0" fill="${WHITE}" ${S3(3.5)}/></g>`).join('')}`) }),
  space: (o, t) => { const r = rng(o.seed || 21); let stars = '';
    for (let i = 0; i < (PORTRAIT ? 90 : 110); i++) { const x = r() * W, y = r() * H, tw = .4 + .6 * Math.abs(Math.sin(t * (1 + r() * 2) + i)); stars += r() < .2 ? `<path d="M${f2(x)} ${f2(y - 6)} v12 M${f2(x - 6)} ${f2(y)} h12" ${S3(2)} opacity="${f2(tw)}"/>` : `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(1 + r() * 1.6)}" fill="${INK}" opacity="${f2(tw)}"/>`; }
    const px = W * .78, py = H * .26;
    return { noGround: o.ground !== true, back: `${stars}<g opacity=".95"><ellipse cx="${px}" cy="${py}" rx="120" ry="26" fill="none" ${S3(4)} transform="rotate(-14 ${px} ${py})"/><circle cx="${px}" cy="${py}" r="62" fill="${WHITE}" ${S3(4)}/>
      <circle cx="${W * .16}" cy="${H * .7}" r="34" fill="${WHITE}" ${S3(3)}/><circle cx="${W * .16 - 10}" cy="${H * .7 - 8}" r="7" fill="none" ${S3(2)}/><circle cx="${W * .16 + 12}" cy="${H * .7 + 10}" r="5" fill="none" ${S3(2)}/></g>` }; },
  stage: o => ({ back: soft(`<path d="M-40 -40 H${W + 40} V60 Q${W * .75} 110 ${CX} 60 Q${W * .25} 110 -40 60 Z" fill="${ACCENT === INK ? '#7a2525' : ACCENT}" ${S3(3.5)}/>
      <path d="M-40 -40 V${GROUND} Q${W * .12} ${GROUND * .5} ${W * .1} -40 Z M${W + 40} -40 V${GROUND} Q${W * .88} ${GROUND * .5} ${W * .9} -40 Z" fill="${ACCENT === INK ? '#7a2525' : ACCENT}" ${S3(3.5)}/>
      ${Array.from({ length: 6 }, (_, i) => `<path d="M${W * .02 + i * 8} -40 Q${W * .06 + i * 6} ${GROUND * .5} ${W * .04 + i * 6} ${GROUND}" fill="none" ${S3(1.5)}/>`).join('')}`), front: Array.from({ length: Math.round(W / 120) }, (_, i) => `<path d="M${60 + i * 120 - 14} ${GROUND + 24} h28 l-6 -14 h-16 Z" fill="${WHITE}" ${S3(2.5)}/>`).join('') }),
  subway: (o, t) => { const by = GROUND - 460, bh = 200; let city = '';
    for (let x = -((t * 260) % 160); x < W + 160; x += 160) city += `<rect x="${x}" y="${by + 60 + ((x / 160 | 0) % 3) * 20}" width="110" height="200" fill="${FAR()}" ${S3(2)}/>`;
    return { back: soft(`<clipPath id="subwin"><rect x="0" y="${by}" width="${W}" height="${bh}"/></clipPath><rect x="0" y="${by}" width="${W}" height="${bh}" fill="${THEME.paperLight || '#dfe3e5'}"/><g clip-path="url(#subwin)">${city}</g>
      ${Array.from({ length: Math.round(W / 300) + 1 }, (_, i) => `<path d="M${i * 300} ${by} v${bh}" ${S3(8)}/>`).join('')}<rect x="0" y="${by}" width="${W}" height="${bh}" fill="none" ${S3(4)}/>
      ${(PORTRAIT ? [.3, .7] : [.2, .5, .8]).map(k => `<path d="M${W * k} -20 V${GROUND}" stroke="#b9bfc3" stroke-width="10"/><path d="M${W * k} -20 V${GROUND}" fill="none" ${S3(2)}/>`).join('')}
      <path d="M-20 ${GROUND - 90} H${W + 20} V${GROUND - 70} H-20 Z" fill="${WHITE}" ${S3(3)}/>`, .9) }; },
  void: () => ({ back: '' }),
});

// ─── weather overlays ──────────────────────────────────────────────────────────
window.WEATHER = Object.assign(window.WEATHER || {}, {
  rain: (o, t) => { const r = rng(17), n = Math.round(90 * (o.amount ?? 1)); let s = '';
    for (let i = 0; i < n; i++) { const x = r() * (W + 200) - 100, sp = 700 + r() * 300, y = ((r() * H + t * sp) % (H + 60)) - 30; s += `<path d="M${f2(x - y * .12)} ${f2(y)} l-6 22" ${S3(2)} opacity=".6"/>`; }
    return s; },
  snow: (o, t) => { const r = rng(19), n = Math.round(70 * (o.amount ?? 1)); let s = '';
    for (let i = 0; i < n; i++) { const x = (r() * W + Math.sin(t * .8 + i) * 20 + W) % W, y = ((r() * H + t * (40 + r() * 50)) % (H + 20)) - 10; s += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(2 + r() * 3)}" fill="${WHITE}" ${S3(1.5)}/>`; }
    return s; },
  leaves: (o, t) => { const r = rng(23), n = Math.round(22 * (o.amount ?? 1)); let s = '';
    for (let i = 0; i < n; i++) { const x = ((r() * W + t * (60 + r() * 60)) % (W + 80)) - 40, y = ((r() * H + t * (50 + r() * 40)) % (H + 40)) - 20, a = t * 120 * (r() - .5) + r() * 360;
      s += `<path transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(a)})" d="M0 -9 Q8 0 0 9 Q-8 0 0 -9 Z M0 -9 V9" fill="${WHITE}" ${S3(1.5)}/>`; }
    return s; },
  wind: (o, t) => { const r = rng(29), n = Math.round(8 * (o.amount ?? 1)); let s = '';
    for (let i = 0; i < n; i++) { const y = r() * H * .8, x = ((r() * W + t * 420) % (W + 400)) - 200; s += `<path d="M${f2(x)} ${f2(y)} q40 -14 80 0 t80 0 q20 0 22 -14 q-2 -12 -14 -8" fill="none" ${S3(2)} opacity=".55"/>`; }
    return s; },
});

function setLayers(sc, t) {
  const o = sc.set, draw = o && window.SETS_LIB[o.type];
  if (o && !draw) throw new Error(`unknown set "${o.type}" (have: ${Object.keys(window.SETS_LIB).join(', ')})`);
  const r = draw ? draw(o, t) : { back: '' };
  const w = sc.weather, wd = w && window.WEATHER[w.type];
  if (w && !wd) throw new Error(`unknown weather "${w.type}" (have: ${Object.keys(window.WEATHER).join(', ')})`);
  return { back: r.back || '', front: r.front || '', noGround: !!r.noGround, weather: wd ? wd(w, t) : '' };
}
