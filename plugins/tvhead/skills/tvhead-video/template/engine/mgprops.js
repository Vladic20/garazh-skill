// ─── motion-graphics props: kinetic type + doodle infographics ───────────────────
// Ideas adapted from open motion skills (HyperFrames' waterfall entry, Charlie's counters/charts, shotcraft's grids),
// re-drawn in pencil style and driven only by t. Same contract as props.js: PROPS[type](p, t, lt) → svg at local origin.
const approxW = (s, fs) => [...String(s)].reduce((a, ch) => a + (/[il.,'!:;|]/.test(ch) ? .26 : /[mwMWЖШЩЮМ]/.test(ch) ? .78 : /[A-ZА-Я]/.test(ch) ? .58 : ch === ' ' ? .28 : .47), 0) * fs;
const fmtNum = (v, dec) => { const s = Math.abs(v).toFixed(dec), [a, b] = s.split('.'); return (v < 0 ? '-' : '') + a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : ''); };
const normEm = w => String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

Object.assign(PROPS, {
  // kinetic words: each word rises in (waterfall entry) exactly when it is spoken; emph words get the accent + a scribble underline.
  // p.words = [[word, t]] (filled by make.mjs from the narration), size, maxWidth, align, emph: ["word", …], lineGap
  words(p, t) {
    const fs = p.size || 76, maxW = p.maxWidth || Math.min(1040, W - 100), gap = fs * .28, lines = [[]];
    let lw = 0;
    const ws = (p.words || []).map(([w, wt]) => ({ w, wt, wd: approxW(w, fs) }));
    for (const o of ws) { if (lw && lw + gap + o.wd > maxW) { lines.push([]); lw = 0; } lines[lines.length - 1].push(o); lw += (lw ? gap : 0) + o.wd; }
    const emph = new Set((p.emph || []).map(normEm));
    const lh = fs * (p.lineGap || 1.12), y0 = -(lines.length - 1) * lh / 2;
    let out = '';
    lines.forEach((ln, li) => {
      const tot = ln.reduce((a, o) => a + o.wd, 0) + gap * (ln.length - 1);
      let x = p.align === 'start' ? 0 : p.align === 'end' ? -tot : -tot / 2;
      for (const o of ln) {
        const k = prog(t, o.wt - .16, o.wt + .2), e = e4out(k);   // land a hair before the word is heard
        if (k > 0) {
          const isE = emph.has(normEm(o.w)), y = y0 + li * lh + 30 * (1 - e);
          out += `<text x="${f2(x)}" y="${f2(y)}" font-family="${FONT}" font-size="${f2(fs * (isE ? 1.08 : 1))}" fill="${isE ? ACCENT : INK}" opacity="${f2(.35 + .65 * e)}">${esc(o.w)}</text>`;
          if (isE) {
            const u = clamp((t - o.wt - .15) / .35);
            if (u > 0) out += `<path d="M${f2(x)} ${f2(y0 + li * lh + fs * .2)} q${f2(o.wd * .5 * u)} ${f2(fs * .08)} ${f2(o.wd * u)} -2" fill="none" stroke="${ACCENT}" stroke-width="${f2(Math.max(3, fs / 16))}" stroke-linecap="round"/>`;
          }
        }
        x += o.wd + gap;
      }
    });
    return out;
  },
  // number that counts up: from, to, dur (1.4), prefix, suffix, decimals, size, label, accent
  counter(p, t, lt) {
    const k = easeOut(clamp(lt / (p.dur || 1.4))), v = lerp(p.from ?? 0, p.to ?? 100, k), fs = p.size || 120;
    const txt = `${p.prefix || ''}${fmtNum(v, p.decimals ?? 0)}${p.suffix || ''}`;
    return `<text y="${f2(fs * .35)}" text-anchor="middle" font-family="${FONT}" font-size="${fs}" fill="${p.accent ? ACCENT : INK}">${esc(txt)}</text>` +
      (p.label ? `<text y="${f2(fs * .85)}" text-anchor="middle" font-family="${FONT}" font-size="${f2(fs * .32)}" fill="${INK}" opacity="${f2(clamp((lt - .3) / .4))}">${esc(p.label)}</text>` : '');
  },
  // bar chart growing bar by bar: values [], labels [], hi (index to highlight), w (520), h (300), step (0.14 s), prefix, suffix
  bars(p, t, lt) {
    const vs = p.values || [3, 5, 8], n = vs.length, w = p.w || 520, h = p.h || 300, mx = p.max || Math.max(...vs), bw = w / n * .62;
    let s = `<path d="M${-w / 2 - 14} ${-h - 10} V0 H${w / 2 + 14}" fill="none" ${ST(4)}/>`;
    vs.forEach((v, i) => {
      const k = easeOutBack(clamp((lt - i * (p.step ?? .14)) / .5)), bh = h * v / mx * Math.max(0, k), x = -w / 2 + (i + .5) * w / n - bw / 2;
      const hi = p.hi === i;
      if (bh > 0) s += `<rect x="${f2(x)}" y="${f2(-bh)}" width="${f2(bw)}" height="${f2(bh)}" fill="${hi ? ACCENT : WHITE}" ${ST(3.5)}/>`;
      if (!hi && bh > 12) for (let yy = -8; yy > -bh + 12; yy -= 14) s += `<path d="M${f2(x + 4)} ${f2(yy)} l${f2(bw - 8)} -8" stroke="${INK}" stroke-width="1.2" opacity=".35"/>`;
      if (p.labels && p.labels[i] != null) s += `<text x="${f2(x + bw / 2)}" y="34" text-anchor="middle" font-family="${FONT}" font-size="26" fill="${INK}">${esc(p.labels[i])}</text>`;
      if (p.showValues !== false && k >= 1) s += `<text x="${f2(x + bw / 2)}" y="${f2(-bh - 12)}" text-anchor="middle" font-family="${FONT}" font-size="26" fill="${INK}">${esc((p.prefix || '') + v + (p.suffix || ''))}</text>`;
    });
    return s;
  },
  // pie that draws itself: value 0..1, r (110), label (default "NN%")
  pie(p, t, lt) {
    const r = p.r || 110, v = clamp(p.value ?? .5) * easeInOut(clamp(lt / (p.dur || 1.1))), a = v * Math.PI * 2;
    const x = Math.sin(a) * r, y = -Math.cos(a) * r, large = a > Math.PI ? 1 : 0, col = ACCENT;
    const wedge = v >= .999 ? `<circle r="${r}" fill="${col}"/>` : v > .001 ? `<path d="M0 0 L0 ${-r} A${r} ${r} 0 ${large} 1 ${f2(x)} ${f2(y)} Z" fill="${col}"/>` : '';
    return `<circle r="${r}" fill="${WHITE}" ${ST(4.5)}/>${wedge}<circle r="${r}" fill="none" ${ST(4.5)}/>
      <text y="${r + 56}" text-anchor="middle" font-family="${FONT}" font-size="46" fill="${INK}">${esc(p.label ?? Math.round(v * 100) + '%')}</text>`;
  },
  // progress bar: value 0..1, w (560), label, dur
  progress(p, t, lt) {
    const w = p.w || 560, v = clamp(p.value ?? .7) * easeInOut(clamp(lt / (p.dur || 1.2)));
    return `<rect x="${-w / 2}" y="-22" width="${w}" height="44" rx="22" fill="${WHITE}" ${ST(4.5)}/><rect x="${-w / 2 + 7}" y="-15" width="${f2(Math.max(0, (w - 14) * v))}" height="30" rx="15" fill="${ACCENT}"/>` +
      (p.label ? `<text y="-42" text-anchor="middle" font-family="${FONT}" font-size="36" fill="${INK}">${esc(p.label)}</text>` : '');
  },
  // timeline of dots with labels: items ["2007", …] or [{label, sub}], w (900), step (0.35 s), hi
  timeline(p, t, lt) {
    const it = (p.items || []).map(x => typeof x === 'object' ? x : { label: x }), n = it.length, w = Math.min(p.w || 900, W - (PORTRAIT ? 170 : 100)), step = p.step ?? .35;
    const k = easeInOut(clamp(lt / (p.dur || n * step + .2)));
    let s = `<path d="M${-w / 2} 0 H${f2(-w / 2 + w * k)}" ${ST(4.5)}/>`;
    it.forEach((o, i) => {
      const x = n > 1 ? -w / 2 + i * w / (n - 1) : 0, a = easeOutBack(clamp((lt - i * step) / .35));
      if (a <= 0) return;
      s += `<g transform="translate(${f2(x)} 0) scale(${f2(a)})"><circle r="13" fill="${i === p.hi ? ACCENT : WHITE}" ${ST(4)}/>
        <text y="${i % 2 ? 58 : -30}" text-anchor="middle" font-family="${FONT}" font-size="32" fill="${INK}">${esc(o.label)}</text>` +
        (o.sub ? `<text y="${i % 2 ? 90 : -62}" text-anchor="middle" font-family="${FONT}" font-size="22" fill="${INK}" opacity=".75">${esc(o.sub)}</text>` : '') + '</g>';
    });
    return s;
  },
  // checklist ticking item by item: items [], step (0.5 s), checked (how many get a tick; default all), size. Anchor = left edge of the boxes
  checklist(p, t, lt) {
    const it = p.items || [], fs = p.size || 40, step = p.step ?? .5, lh = fs * 1.5, done = p.checked ?? it.length;
    let s = '';
    it.forEach((txt, i) => {
      const a = clamp((lt - i * step) / .3); if (a <= 0) return;
      const y = i * lh - (it.length - 1) * lh / 2, tick = clamp((lt - i * step - .25) / .25);
      const tk = i < done && tick > 0 ? `<path d="M-12 ${f2(y - fs * .1)} l${f2(8 * Math.min(1, tick * 2))} ${f2(9 * Math.min(1, tick * 2))}${tick > .5 ? ` l${f2(16 * (tick - .5) * 2)} ${f2(-22 * (tick - .5) * 2)}` : ''}" fill="none" stroke="${ACCENT}" stroke-width="5" stroke-linecap="round"/>` : '';
      s += `<g opacity="${f2(a)}"><rect x="-20" y="${f2(y - fs * .5)}" width="${f2(fs * .8)}" height="${f2(fs * .8)}" rx="4" fill="${WHITE}" ${ST(3.5)}/>${tk}
        <text x="${f2(fs * .9)}" y="${f2(y + fs * .2)}" font-family="${FONT}" font-size="${fs}" fill="${INK}">${esc(txt)}</text></g>`;
    });
    return s;
  },
  // "they are all the same": rows×cols small TV heads popping in; odd = index of the one that breaks the pattern (circled at oddAt s)
  grid(p, t, lt) {
    const rows = p.rows || 3, cols = p.cols || 7, cw = p.cell || 120, face = p.face || 'blank', oddFace = p.oddFace || 'joy', oddAt = p.oddAt ?? 1.2;
    let s = '';
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const n = j * cols + i, a = easeOutBack(clamp((lt - n * (p.step ?? .03)) / .3)); if (a <= 0) continue;
      const odd = n === p.odd, x = (i - (cols - 1) / 2) * cw, y = (j - rows + 1) * cw * .95;
      s += `<g transform="translate(${f2(x)} ${f2(y - cw * .45)}) scale(${f2(a * cw / 150)})">${tvHeadSvg(odd && lt > oddAt ? oddFace : face, t, n * 13 + 1, (n % 7) / 7, null, false)}</g>`;
      if (odd && lt > oddAt) { const L = cw * 4; s += `<circle cx="${f2(x)}" cy="${f2(y - cw * .45)}" r="${f2(cw * .62)}" fill="none" stroke="${ACCENT}" stroke-width="5" stroke-dasharray="${f2(L)}" stroke-dashoffset="${f2(L * (1 - clamp((lt - oddAt) / .5)))}"/>`; }
    }
    return s;
  },
  // user image as a taped grayscale polaroid: src (episode-relative path), w (360), h (270), caption, color:true keeps colour
  photo(p) {
    const w = p.w || 360, h = p.h || 270, pad = 18;
    return `<rect x="${-w / 2 - pad}" y="${-h / 2 - pad}" width="${w + pad * 2}" height="${h + pad * 2 + (p.caption ? 50 : 22)}" fill="${WHITE}" ${ST(3.5)}/>
      <image href="${esc(p.src || '')}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" ${p.color ? '' : 'filter="url(#gray)"'}/>
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="none" ${ST(2.5)}/>
      <rect x="-48" y="${-h / 2 - pad - 16}" width="96" height="30" fill="${PAPER}" opacity=".75" transform="rotate(-4)"/>` +
      (p.caption ? `<text y="${h / 2 + pad + 30}" text-anchor="middle" font-family="${FONT}" font-size="30" fill="${INK}">${esc(p.caption)}</text>` : '');
  },
});
