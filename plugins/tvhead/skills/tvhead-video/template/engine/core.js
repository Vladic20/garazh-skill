// ─── core: constants, math, deterministic randomness, shared textures ──────────
// World is 1280×720. Every frame is a pure function of t (seconds): never use Math.random or Date in drawing code.
const W = 1280, H = 720, GROUND = 615;
const INK = '#141414', BEZEL = '#585858', SCREEN = '#e9ebeb', PAPER = '#c6ccd0', WHITE = '#f1f2f1';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a));
const easeInOut = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeOutBack = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const f2 = x => (Math.round(x * 100) / 100).toString();
function rng(seed) { seed = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
function hashStr(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 1000003; return h; }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// hand-drawn line boil: the displacement seed changes 8× per second, so every outline wobbles like redrawn pencil
const BOIL_FPS = 8;
const boilSeed = t => 1 + (Math.floor(t * BOIL_FPS) % 12);

// ─── static-noise textures (TV screens), generated once per page from a fixed seed ──
const NOISE = (() => {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d'), img = ctx.createImageData(128, 128), r = rng(77 + k * 131);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 70 + r() * 175; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); out.push(c.toDataURL('image/png'));
  }
  return out;
})();

// Static <defs> and paper are installed ONCE into the page (index.html calls installStatic()); per-frame SVG only
// references them by id. Rebuilding filters/textures every frame made Chrome re-rasterise the paper each time (≈4× slower).
const BOIL_N = 12;
function installStatic() {
  const pats = [];
  for (let i = 0; i < 12; i++) pats.push(`<pattern id="static${i}" patternUnits="userSpaceOnUse" width="64" height="64" patternTransform="translate(${(i * 23) % 64} ${(i * 41) % 64})"><image href="${NOISE[i % 4]}" width="64" height="64"/></pattern>`);
  const boils = Array.from({ length: BOIL_N }, (_, i) => `<filter id="boil${i + 1}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="${i + 1}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter>`).join("");
  document.getElementById("defs").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs>${boils}
    <radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    ${pats.join("")}</defs></svg>`;
  document.getElementById("paper").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <filter id="paperTex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="3"/>
      <feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.16"/></feComponentTransfer></filter>
    <filter id="fibers" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.06" numOctaves="2" seed="9"/>
      <feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.10"/></feComponentTransfer></filter>
    <radialGradient id="paperGrad" cx="50%" cy="46%" r="75%"><stop offset="0" stop-color="#d3d8db"/><stop offset=".62" stop-color="${PAPER}"/><stop offset="1" stop-color="#9fa6aa"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#paperGrad)"/><rect width="${W}" height="${H}" filter="url(#paperTex)"/><rect width="${W}" height="${H}" filter="url(#fibers)"/></svg>`;
}
const staticFill = (seed, t) => `url(#static${(Math.abs(seed) + Math.floor(t * 12)) % 12})`;
const boilFilter = t => `url(#boil${boilSeed(t)})`;

// ─── doodle confetti: dots, rings, squares, triangles, spirals drifting forever ──
// density 0..2 (1 = like the reference frames). Positions are a function of t only, so cuts don't reset them.
const PARTICLES = (() => {
  const r = rng(2024), kinds = ['dot', 'dot', 'dot', 'ring', 'ring', 'target', 'square', 'tri', 'spiral', 'spiral', 'dot', 'curl'];
  return Array.from({ length: 90 }, (_, i) => ({
    kind: kinds[Math.floor(r() * kinds.length)], x: r() * (W + 200) - 100, y: r() * (H + 120) - 60,
    s: .9 + r() * 1, vx: (r() - .5) * 9, vy: -2 - r() * 7, ph: r() * 6.28, rot: r() * 360, vr: (r() - .5) * 30, order: r(),
  }));
})();
function particleShape(p) {
  const s = p.s;
  switch (p.kind) {
    case 'dot': return `<circle r="${f2(2.4 * s)}" fill="${INK}"/>`;
    case 'ring': return `<circle r="${f2(4.6 * s)}" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
    case 'target': return `<circle r="${f2(5 * s)}" fill="none" stroke="${INK}" stroke-width="1.5"/><circle r="1.6" fill="${INK}"/>`;
    case 'square': return `<rect x="${f2(-5 * s)}" y="${f2(-5 * s)}" width="${f2(10 * s)}" height="${f2(10 * s)}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
    case 'tri': return `<path d="M0 ${f2(-6 * s)} L${f2(5.5 * s)} ${f2(4 * s)} L${f2(-5.5 * s)} ${f2(4 * s)}Z" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
    case 'spiral': { const k = 1.1 * s; return `<path d="M0 0 c${f2(2 * k)} ${f2(-1 * k)} ${f2(2.5 * k)} ${f2(3 * k)} 0 ${f2(3.5 * k)} c${f2(-4 * k)} ${f2(.5 * k)} ${f2(-5 * k)} ${f2(-5 * k)} ${f2(-1 * k)} ${f2(-6.5 * k)} c${f2(5 * k)} ${f2(-2 * k)} ${f2(8 * k)} ${f2(3 * k)} ${f2(6 * k)} ${f2(7 * k)}" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`; }
    case 'curl': return `<path d="M${f2(-9 * s)} 0 q${f2(4 * s)} ${f2(-6 * s)} ${f2(9 * s)} 0 t${f2(9 * s)} 0" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>`;
  }
  return '';
}
function particles(t, density = 1) {
  if (!(density > 0)) return '';
  const n = Math.round(clamp(density, 0, 2) * 45);
  return PARTICLES.slice(0, n).map(p => {
    const x = ((p.x + p.vx * t + Math.sin(t * .5 + p.ph) * 14) % (W + 200) + W + 200) % (W + 200) - 100;
    const y = ((p.y + p.vy * t + Math.cos(t * .4 + p.ph) * 10) % (H + 120) + H + 120) % (H + 120) - 60;
    return `<g transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(p.rot + p.vr * t)})">${particleShape(p)}</g>`;
  }).join('');
}

// ─── film damage: hairs and scratches that flash for a frame or two ──────────
function filmDamage(t) {
  const fi = Math.round(t * 30), r = rng(fi * 7919 + 13);
  let s = '';
  if (r() < .22) {   // vertical scratch
    const x = r() * W; s += `<line x1="${f2(x)}" y1="0" x2="${f2(x + (r() - .5) * 8)}" y2="${H}" stroke="${r() < .5 ? '#fff' : INK}" stroke-width="${f2(.6 + r())}" opacity="${f2(.15 + r() * .25)}"/>`;
  }
  if (r() < .3) {    // hair
    const x = r() * W, y = r() * H, a = r() * 40 + 20;
    s += `<path d="M${f2(x)} ${f2(y)} q${f2(a * .6)} ${f2(-a * .5)} ${f2(a)} ${f2(-a * .1)} t${f2(a * .7)} ${f2(a * .4)}" fill="none" stroke="${INK}" stroke-width=".9" opacity=".35"/>`;
  }
  for (let k = 0; k < 4; k++) if (r() < .5) s += `<circle cx="${f2(r() * W)}" cy="${f2(r() * H)}" r="${f2(.6 + r() * 1.3)}" fill="${r() < .6 ? INK : '#fff'}" opacity=".4"/>`;
  return s;
}
