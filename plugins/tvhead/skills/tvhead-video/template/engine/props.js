// ─── props: line-art objects. Each draws at its local origin; scene.js applies x/y/scale/rot and enter/exit. ──
// Anchor: standing things (tv, tvpile, feed, door, stairs, house, crowd) = bottom centre; floating icons = centre.
// Signature: PROPS[type](p, t, lt) → svg string; p = resolved props, t = absolute time, lt = time since it appeared.
const ST = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

function heartPath(s = 1) { return `M0 ${9 * s} C${-14 * s} ${-1 * s} ${-9 * s} ${-13 * s} 0 ${-6 * s} C${9 * s} ${-13 * s} ${14 * s} ${-1 * s} 0 ${9 * s}Z`; }

function tvBox(w, h, screen, seed, t, rot = 0) {   // generic TV set, centred
  const bw = Math.max(6, w * .12);
  return `<g transform="rotate(${f2(rot)})"><rect x="${f2(-w / 2)}" y="${f2(-h / 2)}" width="${f2(w)}" height="${f2(h)}" rx="${f2(w * .1)}" fill="${BEZEL}" stroke="${INK}" stroke-width="${f2(Math.max(2.5, w * .035))}"/>
    <rect x="${f2(-w / 2 + bw)}" y="${f2(-h / 2 + bw)}" width="${f2(w - 2 * bw)}" height="${f2(h - 2 * bw)}" rx="${f2(w * .07)}" fill="${screen}" stroke="${INK}" stroke-width="${f2(Math.max(2, w * .025))}"/></g>`;
}

const PROPS = {
  // a single TV set; face: any character face, 'static' or 'off'
  tv(p, t) {
    const face = p.face || 'static', s = 1;
    if (face === 'static' || face === 'off') return tvBox(150, 120, face === 'off' ? '#2a2a2a' : staticFill(p.seed, t), p.seed, t);
    return `<g transform="scale(1.2)">${tvHeadSvg(face, t, p.seed, .3, null, false).replace(/<path d="M-14 -55[^>]*>/, p.antenna === false ? '' : '$&')}</g>`;
  },
  // mound of broken TVs with static (reference frame 2). width ≈ 620 by default; anchor = bottom centre
  tvpile(p, t) {
    const r = rng(p.seed + 11), w = p.width || 620, h = p.height || 300, items = [];
    const n = Math.round(w * h / 4200);
    for (let i = 0; i < n; i++) {
      const u = r(), v = Math.pow(r(), .8), x = (u - .5) * w * (1 - v * .72), y = -v * h * (1 - Math.abs(u - .5) * .9);
      items.push({ x, y, sz: 60 + r() * 50, rot: (r() - .5) * 70, s: Math.floor(r() * 4) });
    }
    items.sort((a, b) => a.y - b.y);   // top of the mound first, bottom (front) last so front sets overlap
    return items.map(it => `<g transform="translate(${f2(it.x)} ${f2(it.y)})">${tvBox(it.sz, it.sz * .82, staticFill(it.s, t + it.s), it.s, t, it.rot)}</g>`).join('');
  },
  // endless vertical social feed: cards with an image and a heart, scrolling up. anchor = bottom centre
  feed(p, t, lt) {
    const hgt = p.height || 760, cw = p.width || 64, gap = 10, ch = cw * 1.05, speed = p.speed ?? 60;
    const off = (lt * speed) % (ch + gap);
    let s = `<rect x="${-cw / 2 - 6}" y="${-hgt}" width="${cw + 12}" height="${hgt}" fill="${WHITE}" stroke="${INK}" stroke-width="4"/>`;
    s += `<clipPath id="fc${p.seed}"><rect x="${-cw / 2 - 6}" y="${-hgt}" width="${cw + 12}" height="${hgt}"/></clipPath><g clip-path="url(#fc${p.seed})">`;
    for (let y = -off + 8; y > -hgt - ch; y -= ch + gap) {
      s += `<rect x="${-cw / 2}" y="${f2(y - ch)}" width="${cw}" height="${f2(ch * .78)}" fill="${staticFill(p.seed + Math.round(y), t)}" stroke="${INK}" stroke-width="3"/>
        <path transform="translate(${cw / 2 - 4} ${f2(y - ch * .14)}) scale(.62)" d="${heartPath()}" fill="${WHITE}" stroke="${INK}" stroke-width="3"/>`;
    }
    return s + '</g>';
  },
  // phone, big; screen: 'feed' | 'static' | 'heart' | 'off' | text:<words>
  phone(p, t, lt) {
    const sc = p.screen || 'feed';
    let inner = '';
    if (sc === 'static') inner = `<rect x="-52" y="-96" width="104" height="180" fill="${staticFill(p.seed, t)}"/>`;
    else if (sc === 'off') inner = `<rect x="-52" y="-96" width="104" height="180" fill="#2a2a2a"/>`;
    else if (sc === 'heart') inner = `<path transform="translate(0 -8) scale(2.6)" d="${heartPath()}" fill="${INK}"/>`;
    else if (sc.startsWith('text:')) inner = `<text y="0" text-anchor="middle" font-family="Patrick Hand" font-size="26" fill="${INK}">${esc(sc.slice(5))}</text>`;
    else { const off = (lt * 40) % 60; inner = `<clipPath id="pc${p.seed}"><rect x="-52" y="-96" width="104" height="180"/></clipPath><g clip-path="url(#pc${p.seed})">`;
      for (let y = -96 - off; y < 90; y += 60) inner += `<rect x="-42" y="${f2(y + 6)}" width="64" height="44" fill="#b9bfc2" stroke="${INK}" stroke-width="2"/><path transform="translate(34 ${f2(y + 40)}) scale(.5)" d="${heartPath()}" fill="${INK}"/>`;
      inner += '</g>'; }
    return `<circle r="150" fill="url(#glow)" opacity="${p.glow === false ? 0 : .8}"/>
      <rect x="-62" y="-118" width="124" height="230" rx="18" fill="${INK}"/><rect x="-52" y="-96" width="104" height="180" rx="4" fill="#f3f5f5"/>${inner}
      <rect x="-52" y="-96" width="104" height="180" rx="4" fill="none" stroke="${INK}" stroke-width="2"/><circle cx="0" cy="98" r="6" fill="#555"/>`;
  },
  heart(p, t, lt) { const b = 1 + .08 * Math.max(0, Math.sin(lt * 7)) * (p.beat === false ? 0 : 1);
    return `<path transform="scale(${f2(3.2 * b)})" d="${heartPath()}" fill="${p.fill === 'black' ? INK : WHITE}" stroke="${INK}" stroke-width="1.4"/>${p.broken ? `<path d="M2 -22 l-8 14 l9 8 l-7 14 l5 12" fill="none" ${ST(3)}/>` : ''}`; },
  // notification bubble: heart + count
  like(p) { const txt = esc(p.count ?? '99+'); const w = 70 + String(txt).length * 16;
    return `<rect x="${-w / 2}" y="-34" width="${w}" height="56" rx="28" fill="${WHITE}" ${ST(4)}/><path d="M-10 22 l10 16 l10 -16" fill="${WHITE}" ${ST(4)}/><rect x="-14" y="16" width="28" height="8" fill="${WHITE}"/>
      <path transform="translate(${-w / 2 + 34} -6) scale(1.3)" d="${heartPath()}" fill="${INK}"/><text x="${-w / 2 + 58}" y="6" font-family="Patrick Hand" font-size="38" fill="${INK}">${txt}</text>`; },
  bell(p, t, lt) { const sw = Math.sin(lt * 18) * 14 * Math.max(0, 1 - lt / 1.6);
    return `<g transform="rotate(${f2(sw)} 0 -50)"><path d="M-36 20 Q-34 -40 0 -46 Q34 -40 36 20 L44 30 L-44 30 Z" fill="${WHITE}" ${ST(4.5)}/><circle cy="40" r="9" fill="${INK}"/><path d="M0 -46 v-10" ${ST(4)}/></g>
      ${p.count != null ? `<circle cx="34" cy="-36" r="20" fill="${INK}"/><text x="34" y="-27" text-anchor="middle" font-family="Patrick Hand" font-size="28" fill="${WHITE}">${esc(p.count)}</text>` : ''}`; },
  // speech / thought bubble; anchor = tail tip
  bubble(p) {
    const txt = esc(p.text || '...'), fs = p.size || 34, w = Math.max(90, txt.length * fs * .5 + 40), h = fs + 34, dir = p.dir === 'right' ? 1 : -1;
    const bx = dir * 30 - w / 2 + dir * w * .3, by = -h - 40;
    if (p.kind === 'thought') return `<circle cx="${dir * 8}" cy="-10" r="6" fill="${WHITE}" ${ST(3)}/><circle cx="${dir * 20}" cy="-28" r="10" fill="${WHITE}" ${ST(3)}/>
      <ellipse cx="${f2(bx + w / 2)}" cy="${f2(by + h / 2)}" rx="${f2(w / 2 + 12)}" ry="${f2(h / 2 + 10)}" fill="${WHITE}" ${ST(4)}/>
      <text x="${f2(bx + w / 2)}" y="${f2(by + h / 2 + fs * .34)}" text-anchor="middle" font-family="Patrick Hand" font-size="${fs}" fill="${INK}">${txt}</text>`;
    return `<rect x="${f2(bx)}" y="${f2(by)}" width="${f2(w)}" height="${h}" rx="18" fill="${WHITE}" ${ST(4)}/><path d="M${dir * 14} ${by + h - 2} L0 0 L${dir * 40} ${by + h - 2}" fill="${WHITE}" ${ST(4)}/><path d="M${dir * 16} ${by + h - 2} L${dir * 38} ${by + h - 2}" stroke="${WHITE}" stroke-width="5"/>
      <text x="${f2(bx + w / 2)}" y="${f2(by + h / 2 + fs * .34)}" text-anchor="middle" font-family="Patrick Hand" font-size="${fs}" fill="${INK}">${txt}</text>`;
  },
  // handwritten text; enter 'write' reveals letters one by one. anchor = baseline centre (align: middle|start|end)
  text(p, t, lt) {
    const fs = p.size || 64, txt = String(p.text || '');
    const shown = p.enter === 'write' ? txt.slice(0, Math.ceil(clamp(lt / (p.writeDur || Math.min(1.2, .06 * txt.length + .2))) * txt.length)) : txt;
    const lines = shown.split('\n'), anchor = p.align || 'middle';
    const under = p.underline ? `<path d="M${-txt.length * fs * .24} ${fs * .22} q${txt.length * fs * .24} ${fs * .1} ${txt.length * fs * .48} -2" fill="none" ${ST(Math.max(3, fs / 14))}/>` : '';
    return lines.map((l, i) => `<text y="${f2(i * fs * 1.08)}" text-anchor="${anchor}" font-family="Patrick Hand" font-size="${fs}" fill="${p.color === 'white' ? WHITE : INK}"
      ${p.outline ? `stroke="${PAPER}" stroke-width="${f2(fs / 9)}" paint-order="stroke"` : ''}>${esc(l)}</text>`).join('') + under;
  },
  // hand-drawn arrow; from/to in WORLD coords (x/y ignored); draws on over 0.4 s
  arrow(p, t, lt) {
    const [x1, y1] = p.from || [0, 0], [x2, y2] = p.to || [100, 0], k = easeOut(clamp(lt / .4));
    const cx = (x1 + x2) / 2 + (p.curve ?? .2) * (y2 - y1), cy = (y1 + y2) / 2 - (p.curve ?? .2) * (x2 - x1);
    const ex = lerp(x1, x2, k), ey = lerp(y1, y2, k), qx = lerp(x1, cx, k), qy = lerp(y1, cy, k);
    const a = Math.atan2(ey - qy, ex - qx), hd = 18;
    return `<path d="M${x1} ${y1} Q${f2(qx)} ${f2(qy)} ${f2(ex)} ${f2(ey)}" fill="none" ${ST(4.5)}/>
      ${k > .8 ? `<path d="M${f2(ex - Math.cos(a - .5) * hd)} ${f2(ey - Math.sin(a - .5) * hd)} L${f2(ex)} ${f2(ey)} L${f2(ex - Math.cos(a + .5) * hd)} ${f2(ey - Math.sin(a + .5) * hd)}" fill="none" ${ST(4.5)}/>` : ''}`;
  },
  // line chart that draws itself; trend up | down | crash | zigzag | flat. anchor = centre
  chart(p, t, lt) {
    const w = p.w || 360, h = p.h || 220, k = easeInOut(clamp(lt / (p.drawDur || 1.4)));
    const shapes = { up: [.9, .8, .82, .6, .55, .35, .3, .08], down: [.1, .2, .18, .4, .45, .65, .7, .92], crash: [.5, .4, .3, .25, .15, .1, .85, .95], zigzag: [.6, .3, .7, .2, .8, .3, .6, .4], flat: [.5, .52, .48, .5, .51, .49, .5, .5] };
    const ys = shapes[p.trend] || shapes.up, n = ys.length;
    const pts = ys.map((v, i) => [-w / 2 + i * w / (n - 1), -h / 2 + v * h]);
    const upto = k * (n - 1), i0 = Math.floor(upto), fr = upto - i0;
    const shown = pts.slice(0, i0 + 1); if (i0 < n - 1) shown.push([lerp(pts[i0][0], pts[i0 + 1][0], fr), lerp(pts[i0][1], pts[i0 + 1][1], fr)]);
    return `<path d="M${-w / 2} ${-h / 2 - 10} V${h / 2} H${w / 2 + 10}" fill="none" ${ST(4)}/><path d="M${shown.map(q => q.map(f2).join(' ')).join(' L')}" fill="none" ${ST(5)}/>`;
  },
  clock(p, t, lt) { const sp = p.speed ?? 1; const m = lt * 6 * sp, hh = lt * .5 * sp;
    return `<circle r="58" fill="${WHITE}" ${ST(5)}/>${[0, 90, 180, 270].map(a => `<path transform="rotate(${a})" d="M0 -48 v8" ${ST(3)}/>`).join('')}
      <path transform="rotate(${f2(hh * 30 + 40)})" d="M0 0 v-28" ${ST(5)}/><path transform="rotate(${f2(m * 30)})" d="M0 0 v-42" ${ST(3.5)}/><circle r="5" fill="${INK}"/>`; },
  hourglass(p, t, lt) { const k = clamp(lt / (p.dur || 4));
    return `<path d="M-34 -60 h68 M-34 60 h68" ${ST(5)}/><path d="M-26 -60 C-26 -20 -4 -10 -4 0 C-4 10 -26 20 -26 60 M26 -60 C26 -20 4 -10 4 0 C4 10 26 20 26 60" fill="${WHITE}" ${ST(4)}/>
      <path d="M${f2(-20 * (1 - k))} ${f2(-48 + 40 * k)} Q0 ${f2(-48 + 48 * k)} ${f2(20 * (1 - k))} ${f2(-48 + 40 * k)} L0 -4Z" fill="${INK}"/><path d="M${f2(-22 * k)} 56 Q0 ${f2(56 - 34 * k)} ${f2(22 * k)} 56Z" fill="${INK}"/><path d="M0 0 v52" stroke="${INK}" stroke-width="1.5" opacity="${k < 1 ? 1 : 0}"/>`; },
  coin(p, t, lt) { const sq = Math.cos(lt * (p.spin === false ? 0 : 5));
    return `<g transform="scale(${f2(Math.max(.15, Math.abs(sq)))} 1)"><circle r="40" fill="${WHITE}" ${ST(4.5)}/><circle r="30" fill="none" ${ST(2)}/><text y="15" text-anchor="middle" font-family="Patrick Hand" font-size="44" fill="${INK}">$</text></g>`; },
  money(p) { const n = p.count || 5; let s = '';
    for (let i = 0; i < n; i++) s += `<g transform="translate(${(i % 2) * 6 - 3} ${-i * 14})"><rect x="-60" y="-12" width="120" height="24" rx="3" fill="${WHITE}" ${ST(3.5)}/><circle r="7" fill="none" ${ST(2)}/></g>`;
    return s; },
  bulb(p, t, lt) { const on = p.lit !== false;
    return `${on ? `<circle cy="-20" r="90" fill="url(#glow)"/>${[0, 45, 90, 135, 180, -45, -90, -135].map(a => `<path transform="rotate(${a} 0 -20)" d="M0 -82 v-16" ${ST(4)}/>`).join('')}` : ''}
      <path d="M-22 22 C-22 2 -44 -6 -44 -30 A44 44 0 0 1 44 -30 C44 -6 22 2 22 22 Z" fill="${on ? WHITE : '#9aa0a3'}" ${ST(4.5)}/><path d="M-20 30 h40 M-17 40 h34" ${ST(4)}/><path d="M-10 4 l10 -24 l10 24" fill="none" ${ST(2.5)}/>`; },
  question(p) { return `<text y="40" text-anchor="middle" font-family="Patrick Hand" font-size="${p.size || 150}" fill="${INK}">?</text>`; },
  exclaim(p) { return `<text y="40" text-anchor="middle" font-family="Patrick Hand" font-size="${p.size || 150}" fill="${INK}">!</text>`; },
  brain(p) { return `<path d="M-6 -46 C-30 -58 -56 -40 -50 -16 C-68 -6 -62 24 -40 28 C-36 46 -12 50 -4 38 L-4 -44 M4 -46 C30 -58 56 -40 50 -16 C68 -6 62 24 40 28 C36 46 12 50 4 38 L4 -44" fill="${WHITE}" ${ST(4.5)}/>
      <path d="M-40 -10 q14 4 18 18 M-30 -34 q4 12 16 14 M40 -10 q-14 4 -18 18 M30 -34 q-4 12 -16 14 M-34 14 q10 -2 16 8 M34 14 q-10 -2 -16 8" fill="none" ${ST(3)}/>`; },
  eye(p, t, lt) { const bl = ((lt + 1.3) % 3.6) < .12, look = Math.sin(lt * .9) * 14;
    return `<path d="M-90 0 Q0 -70 90 0 Q0 70 -90 0Z" fill="${WHITE}" ${ST(5)}/>${bl ? `<path d="M-90 0 Q0 30 90 0" fill="none" ${ST(5)}/>` : `<circle cx="${f2(look)}" r="30" fill="${INK}"/><circle cx="${f2(look + 10)}" cy="-10" r="7" fill="${WHITE}"/>`}`; },
  cloud(p, t, lt) { let rain = '';
    if (p.rain !== false) { const r = rng(p.seed); for (let i = 0; i < 14; i++) { const x = -70 + r() * 140, y = 30 + ((lt * 260 + r() * 200) % 200); rain += `<path d="M${f2(x)} ${f2(y)} l-4 14" ${ST(2.6)}/>`; } }
    return rain + `<path d="M-80 30 C-110 30 -110 -10 -78 -12 C-80 -50 -30 -60 -14 -34 C0 -66 60 -60 58 -20 C96 -24 102 30 66 30 Z" fill="${p.dark ? '#7b8185' : WHITE}" ${ST(4.5)}/>`; },
  sun(p, t, lt) { return `${Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30 + lt * 10})" d="M0 -58 v-22" ${ST(4)}/>`).join('')}<circle r="44" fill="${WHITE}" ${ST(5)}/>`; },
  moon() { return `<path d="M10 -60 A60 60 0 1 0 60 10 A46 46 0 0 1 10 -60Z" fill="${WHITE}" ${ST(4.5)}/>`; },
  battery(p, t, lt) { const lv = p.drain ? clamp((p.level ?? 1) - lt / (p.drain || 3)) : (p.level ?? .2); const bw = 120 * lv;
    return `<rect x="-70" y="-34" width="140" height="68" rx="8" fill="${WHITE}" ${ST(5)}/><rect x="70" y="-14" width="12" height="28" rx="3" fill="${INK}"/>
      <rect x="-60" y="-24" width="${f2(Math.max(0, bw))}" height="48" fill="${INK}"/>`; },
  check() { return `<circle r="56" fill="${WHITE}" ${ST(5)}/><path d="M-26 2 L-6 22 L30 -20" fill="none" ${ST(8)}/>`; },
  cross() { return `<circle r="56" fill="${WHITE}" ${ST(5)}/><path d="M-22 -22 L22 22 M22 -22 L-22 22" fill="none" ${ST(8)}/>`; },
  chain(p) { const n = p.links || 6; let s = '';
    for (let i = 0; i < n; i++) s += `<ellipse cx="${i * 36}" cy="0" rx="24" ry="13" fill="none" ${ST(5)} transform="rotate(${i % 2 ? 0 : 0} ${i * 36} 0)"/>`;
    return `<g transform="translate(${-(n - 1) * 18} 0)">${s}</g>${p.ball ? `<circle cx="${(n - 1) * 18 + 40}" cy="16" r="34" fill="${INK}"/>` : ''}`; },
  lock(p) { return `<path d="M-30 -10 V-40 A30 30 0 0 1 30 -40 V-10" fill="none" ${ST(7)}/><rect x="-46" y="-12" width="92" height="76" rx="8" fill="${WHITE}" ${ST(5)}/><circle cy="18" r="9" fill="${INK}"/><path d="M0 22 v18" ${ST(5)}/>`; },
  door(p) { const k = p.open ? .6 : 0;
    return `<rect x="-60" y="-220" width="120" height="220" fill="${p.light ? WHITE : '#33373a'}" ${ST(5)}/><path d="M-60 -220 L${f2(-60 + 120 * (1 - k))} ${f2(-220 + 18 * k)} L${f2(-60 + 120 * (1 - k))} ${f2(-18 * k)} L-60 0 Z" fill="${WHITE}" ${ST(4.5)}/>
      <circle cx="${f2(-60 + 105 * (1 - k))}" cy="-110" r="5" fill="${INK}"/>`; },
  stairs(p) { const n = p.steps || 6, sw = p.stepW || 70, sh = p.stepH || 40; let d = `M${-n * sw / 2} 0`;
    for (let i = 0; i < n; i++) d += ` v${-sh} h${sw}`;
    return `<path d="${d} V0 Z" fill="${WHITE}" ${ST(4.5)}/>`; },
  house(p) { return `<path d="M-90 0 V-110 L0 -190 L90 -110 V0 Z" fill="${WHITE}" ${ST(5)}/><rect x="-22" y="-70" width="44" height="70" fill="${INK}"/><rect x="34" y="-100" width="34" height="30" fill="${p.lit ? WHITE : '#888'}" ${ST(3.5)}/>`; },
  crown() { return `<path d="M-60 20 L-66 -40 L-30 -8 L0 -52 L30 -8 L66 -40 L60 20 Z" fill="${WHITE}" ${ST(5)}/><path d="M-60 20 h120" ${ST(5)}/>`; },
  bed(p) { return `<path d="M-130 0 V-110 M-130 -50 H130 V0 M130 -50 V-80" fill="none" ${ST(6)}/><rect x="-124" y="-80" width="250" height="30" rx="10" fill="${WHITE}" ${ST(4)}/><ellipse cx="-90" cy="-90" rx="30" ry="14" fill="${WHITE}" ${ST(4)}/>`; },
  laptop(p, t) { return `<path d="M-90 0 h180 l-16 -14 h-148 Z" fill="${WHITE}" ${ST(4)}/><rect x="-70" y="-110" width="140" height="94" rx="6" fill="${INK}"/><rect x="-60" y="-100" width="120" height="74" fill="${p.screen === 'static' ? staticFill(p.seed, t) : '#eef0f0'}"/>`; },
  // chaotic pencil scribble (anxiety, noise, overthinking); radius r
  scribble(p, t) { const r = rng(p.seed + Math.floor(t * 8)), R = p.r || 70; let d = `M0 0`;
    for (let i = 0; i < 26; i++) d += ` Q${f2((r() - .5) * 2.2 * R)} ${f2((r() - .5) * 2.2 * R)} ${f2((r() - .5) * 2 * R)} ${f2((r() - .5) * 2 * R)}`;
    return `<path d="${d}" fill="none" ${ST(2.6)}/>`; },
  target(p) { return `<circle r="70" fill="${WHITE}" ${ST(5)}/><circle r="46" fill="none" ${ST(5)}/><circle r="20" fill="${INK}"/>`; },
  // background crowd of small TV heads (no bodies) — "everyone"; anchor = bottom centre
  crowd(p, t) { const rows = p.rows || 3, cols = p.cols || 9, w = p.width || 1100, r = rng(p.seed + 3); let s = '';
    for (let j = rows - 1; j >= 0; j--) for (let i = 0; i < cols; i++) {
      const x = -w / 2 + (i + .5 + (j % 2) * .5) * w / cols + (r() - .5) * 16, y = -j * 52 - 30, sc = .38 + (rows - j) * .03, face = p.face || (r() < .5 ? 'blank' : 'static');
      s += `<g transform="translate(${f2(x)} ${f2(y + Math.sin(t * 2 + i + j) * 2)}) scale(${f2(sc)})"><rect x="-40" y="0" width="80" height="140" rx="10" fill="${INK}"/>${tvHeadSvg(face, t, i + j * 7, (i * 13 + j) % 7 / 7, null, false)}</g>`;
    }
    return s; },
  // cone of light from the top of the frame onto x (scene option dark:true makes it read best)
  spotlight(p) { const w = p.w || 180; return `<path d="M-40 ${-p.y} L40 ${-p.y} L${w} 0 L${-w} 0 Z" fill="#fff" opacity=".28"/><ellipse cx="0" cy="0" rx="${w}" ry="22" fill="#fff" opacity=".35"/>`; },
  // simple rectangle "screen"/frame with optional text, e.g. a title card on a wall
  sign(p) { const txt = esc(p.text || ''), fs = p.size || 40, w = p.w || Math.max(140, txt.length * fs * .5 + 50), h = p.h || fs + 40;
    return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6" fill="${WHITE}" ${ST(4.5)}/><text y="${f2(fs * .34)}" text-anchor="middle" font-family="Patrick Hand" font-size="${fs}" fill="${INK}">${txt}</text>`; },
};
