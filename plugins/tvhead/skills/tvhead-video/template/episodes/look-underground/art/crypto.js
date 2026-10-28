// props for "Криптоферма под гаражом" (uses ../_underground/kit.js)
(function () {
  const { K, S, age, since, F, MONO_F } = UG;
  Object.assign(PROPS, {
    // rack of miners. { n (4), power: false, hot: true }, anchor = bottom centre of the rack
    asics(p, t, lt) {
      const n = p.n || 4, cols = 2, rows = Math.ceil(n / cols), bw = 82, bh = 48, gx = 10, gy = 30, w = cols * bw + (cols + 1) * gx, h = rows * (bh + gy) + 12;
      const on = p.power !== false, pk = on ? clamp(since(p, 'power', t) / .5) : 0, hot = !!p.hot;
      let s = `<rect x="${-w / 2}" y="${-h}" width="8" height="${h}" fill="#5b5f68" ${S(2.5)}/><rect x="${w / 2 - 8}" y="${-h}" width="8" height="${h}" fill="#5b5f68" ${S(2.5)}/>`;
      for (let r = 0; r < rows; r++) s += `<rect x="${-w / 2}" y="${-h + r * (bh + gy) + bh + 8}" width="${w}" height="8" fill="#6c707a" ${S(2.5)}/>`;
      let idx = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols && idx < n; c++, idx++) {
        const x = -w / 2 + gx + c * (bw + gx), y = -h + r * (bh + gy) + 8, spin = on ? t * (900 + idx * 37) : 0;
        s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="5" fill="${hot ? mixHex('#c9ced4', '#ff8a70', .35 + .15 * Math.sin(t * 6 + idx)) : '#c9ced4'}" ${S(2.5)}/>`;
        for (const fx of [x + 22, x + 58]) {
          s += `<circle cx="${fx}" cy="${y + bh / 2}" r="15" fill="#33313a" ${S(2)}/>`;
          s += `<g transform="translate(${fx} ${y + bh / 2}) rotate(${f2(spin % 360)})">${[0, 72, 144, 216, 288].map(a => `<path d="M0 0 L${f2(12 * Math.cos(a * Math.PI / 180))} ${f2(12 * Math.sin(a * Math.PI / 180))}" stroke="#8d93a0" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>`;
        }
        const led = on && (Math.sin(t * 9 + idx * 1.7) > -.3) ? (hot ? K.red : K.green) : '#3a3a40';
        s += `<circle cx="${x + bw - 8}" cy="${y + 8}" r="3.5" fill="${led}" opacity="${f2(on ? pk : 1)}"/>`;
      }
      return s;
    },
    // water-bearing layer (cut through the earth). { w (300) }
    aquifer(p, t, lt) {
      const w = p.w || 320, k = easeOut(clamp(age(p, lt) / .6)); let d = `M${-w / 2} 0`;
      for (let x = -w / 2; x <= w / 2; x += 20) d += ` L${x} ${f2(Math.sin(x * .05 + t * 2) * 4)}`;
      d += ` L${w / 2} 40 L${-w / 2} 40 Z`;
      return `<g transform="scale(${f2(k)} 1)"><path d="${d}" fill="${K.water}" ${S(3)}/>${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${f2(-w / 2 + 30 + ((i * 53 + t * 30) % (w - 60)))}" cy="${20 + (i % 2) * 8}" r="4" fill="#9fe0ff" opacity=".7"/>`).join('')}</g>`;
    },
    // depth break on the borehole: two slashes and a depth label. { text }
    depth(p, t, lt) {
      const k = clamp(age(p, lt) / .3);
      return `<g opacity="${f2(k)}"><path d="M-30 -6 L30 -16 M-30 8 L30 -2" stroke="#f3f1ec" stroke-width="5"/><text x="40" y="0" font-family="${MONO_F}" font-weight="700" font-size="17" fill="${K.yellow}">${esc(p.text || '−30 М')}</text></g>`;
    },
    // foam / sandwich panels over the back wall: tiles pop in. { x0, x1, y0, y1 } world → anchor ignored
    foam(p, t, lt) {
      const x0 = p.x0 ?? 62, x1 = p.x1 ?? 658, y0 = p.y0 ?? 556, y1 = p.y1 ?? 883, cell = 44, a = age(p, lt);
      let s = ''; let i = 0;
      for (let y = y0; y < y1 - 2; y += cell) for (let x = x0; x < x1 - 2; x += cell, i++) {
        const k = easeOutBack(clamp((a - i * .006) / .25)); if (k <= 0) continue;
        const cw = Math.min(cell, x1 - x), ch = Math.min(cell, y1 - y), cx = x + cw / 2, cy = y + ch / 2;
        s += `<g transform="translate(${cx} ${cy}) scale(${f2(k)})"><rect x="${-cw / 2}" y="${-ch / 2}" width="${cw}" height="${ch}" fill="${p.color || '#3d3a48'}" stroke="#24222b" stroke-width="1.5"/>
          <path d="M${-cw / 2 + 6} ${-ch / 2 + 8} H${cw / 2 - 6} M${-cw / 2 + 6} 0 H${cw / 2 - 6} M${-cw / 2 + 6} ${ch / 2 - 8} H${cw / 2 - 6}" stroke="#000" stroke-width="2" opacity=".14"/></g>`;
      }
      return `<g transform="translate(${-p.x} ${-p.y})">${s}</g>`;
    },
    // wall air conditioner that gives up: a red cross slams over it. { fail: true }
    acunit(p, t, lt) {
      const k = easeOutBack(clamp(age(p, lt) / .3)), fk = p.fail ? easeOutBack(clamp(since(p, 'fail', t) / .25)) : 0;
      let s = `<g transform="scale(${f2(k)})"><rect x="-62" y="-24" width="124" height="48" rx="10" fill="#eef0f2" ${S(3)}/>
        ${[0, 1, 2].map(i => `<path d="M-50 ${6 + i * 6} H50" stroke="#9aa0a8" stroke-width="2"/>`).join('')}<circle cx="46" cy="-10" r="3.5" fill="${p.fail ? K.red : K.green}"/>
        <text x="-48" y="-6" font-family="${MONO_F}" font-size="10" font-weight="700" fill="#7c838c">AC</text></g>`;
      if (fk > 0) s += `<g transform="scale(${f2(fk)})"><path d="M-40 -34 L40 34 M40 -34 L-40 34" stroke="#fff" stroke-width="16" stroke-linecap="round"/><path d="M-40 -34 L40 34 M40 -34 L-40 34" stroke="${K.red}" stroke-width="10" stroke-linecap="round"/></g>`;
      return s;
    },
    // electricity meter with a spinning disc. { fast: true }
    emeter(p, t, lt) {
      const sp = p.fast ? 1400 : 120, a = (t * sp) % 360;
      return `<rect x="-26" y="-36" width="52" height="66" rx="5" fill="#eceae4" ${S(2.5)}/><rect x="-18" y="-28" width="36" height="14" fill="#2b2a30"/>
        <text y="-17" text-anchor="middle" font-family="${MONO_F}" font-size="10" font-weight="700" fill="${p.fast ? K.red : K.green}">${p.fast ? '13.2kW' : '0.4kW'}</text>
        <ellipse cx="0" cy="8" rx="17" ry="5" fill="#9aa0a8" ${S(2)}/><rect x="${f2(-2 + 15 * Math.cos(a * Math.PI / 180))}" y="5" width="4" height="6" fill="${K.red}" opacity="${f2(Math.sin(a * Math.PI / 180) > 0 ? 1 : .2)}"/>`;
    },
    // solar panels on the right slope of the garage roof. Anchor = the middle of the slope.
    solar(p, t, lt) {
      const a = age(p, lt); let s = '';
      for (let i = 0; i < 2; i++) {
        const k = clamp((a - i * .18) / .45), dy = -260 * Math.pow(1 - k, 2), x = -90 + i * 92;
        if (k <= 0) continue;
        const sq = k >= 1 && a - i * .18 < .65 ? Math.sin((a - i * .18 - .45) / .2 * Math.PI) * .08 : 0;
        s += `<g transform="translate(${x} ${f2(dy)}) scale(${f2(1 + sq)} ${f2(1 - sq)})"><rect x="0" y="-22" width="86" height="22" fill="#24438a" ${S(2.5)}/>
          <path d="M21 -22 v22 M43 -22 v22 M64 -22 v22 M0 -11 h86" stroke="#6d8fd8" stroke-width="2"/>
          <path d="M6 -19 l14 0" stroke="#bcd0ff" stroke-width="3" opacity="${f2(.4 + .4 * Math.sin(t * 3 + i))}"/></g>`;
      }
      return `<g transform="rotate(17)">${s}</g>`;
    },
    // battery block, level fills. { level (0..1 target), fill (s) }
    battery2(p, t, lt) {
      const lv = clamp((p.level ?? .9) * clamp(age(p, lt) / (p.fill || 2.4)) + .1);
      let s = `<rect x="-46" y="-118" width="92" height="118" rx="7" fill="#d8dbe0" ${S(3)}/><rect x="-14" y="-126" width="28" height="9" fill="#7c838c" ${S(2)}/>`;
      for (let i = 0; i < 5; i++) { const on = lv > i / 5; s += `<rect x="-34" y="${-22 - i * 19}" width="68" height="14" rx="3" fill="${on ? K.green : '#4a4852'}" opacity="${on && i === Math.floor(lv * 5) - 1 ? f2(.6 + .4 * Math.sin(t * 6)) : 1}"/>`; }
      return s + `<text y="18" text-anchor="middle" font-family="${MONO_F}" font-weight="700" font-size="13" fill="${K.yellow}">LiFePO4</text>`;
    },
    // greenhouse with cucumbers growing. anchor = bottom centre (on the surface). { grow (s) }
    greenhouse(p, t, lt) {
      const a = age(p, lt), w = 150, h = 92, k = easeOutBack(clamp(a / .45));
      let s = `<g transform="scale(${f2(k)})"><path d="M${-w / 2} 0 V${-h * .55} Q0 ${-h * 1.25} ${w / 2} ${-h * .55} V0 Z" fill="#bfe8ef" fill-opacity=".55" ${S(3)}/>
        <path d="M${-w / 4} 0 V${-h * .9} M0 0 V${-h * 1.02} M${w / 4} 0 V${-h * .9} M${-w / 2} ${-h * .55} H${w / 2}" stroke="${K.ink}" stroke-width="2" opacity=".6"/>`;
      const g = clamp((a - .5) / (p.grow || 2));
      for (let i = 0; i < 4; i++) { const x = -w / 2 + 22 + i * 36, vh = 60 * g;
        s += `<path d="M${x} 0 q-8 ${f2(-vh * .5)} 0 ${f2(-vh)}" fill="none" stroke="#2f8a3a" stroke-width="4"/>`;
        if (g > .5) s += `<ellipse cx="${x + 7}" cy="${f2(-vh * .55)}" rx="5" ry="12" fill="#3fae4a" ${S(2)} transform="rotate(10 ${x + 7} ${f2(-vh * .55)})"/>`;
        if (g > .8) s += `<circle cx="${x - 6}" cy="${f2(-vh * .85)}" r="5" fill="${K.yellow}"/>`; }
      return s + '</g>';
    },
    // a snow cap that falls onto our garage roof. anchor = roof apex
    snowcap(p, t, lt) {
      const k = clamp(age(p, lt) / .8);
      return `<g opacity="${f2(k)}" transform="translate(0 ${f2(-20 * (1 - k))})"><path d="M-198 62 L0 0 L198 62 L186 68 Q60 30 0 16 Q-70 30 -184 69 Z" fill="#f4f7fb" ${S(2.5)}/></g>`;
    },
    // falling snow over the whole frame (world). { n (60) }
    flakes(p, t, lt) {
      const r = rng(19), n = p.n || 60, k = clamp(age(p, lt) / 1); let s = '';
      for (let i = 0; i < n; i++) { const x = ((r() * W + Math.sin(t * .8 + i) * 18) % W + W) % W, y = ((r() * 480 + t * (40 + r() * 50)) % 500) - 20;
        s += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(2 + r() * 2.5)}" fill="#fff" opacity="${f2(.85 * k)}"/>`; }
      return `<g transform="translate(${-p.x} ${-p.y})">${s}</g>`;
    },
  });
})();
