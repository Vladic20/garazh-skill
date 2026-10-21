// ─── lottie: After Effects animations inside the frame ─────────────────────────────────────────────
// { "type": "lottie", "src": "pack:check" | "anim/logo.json" (episode folder: a Bodymovin / LottieFiles export),
//   "w": 300, "h": 300 (box, aspect kept), "loop": false (true = repeat), "speed": 1, "from": 0, "to": <last frame> }
// make.mjs inlines every referenced JSON into TL.lottie[src]. Each prop instance owns a hidden lottie-web player
// (SVG renderer) that is seeked to the exact frame for time t, so playback is deterministic and frame-accurate.
// The player's SVG is copied into the item, so the animation sits in the scene like any prop (camera, z, transitions).
(function () {
  if (typeof lottie === 'undefined') return;
  lottie.setQuality && lottie.setQuality('high');
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-20000px;top:0;width:1px;height:1px;overflow:hidden';
  document.body.appendChild(host);
  const players = {};
  function player(key, src) {
    if (players[key]) return players[key];
    const data = TL.lottie && TL.lottie[src];
    if (!data) throw new Error(`lottie "${src}": not found (put the JSON in the episode folder or use pack:<name>)`);
    const box = document.createElement('div'); box.style.cssText = `width:${data.w}px;height:${data.h}px`; host.appendChild(box);
    const anim = lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: false,
      animationData: JSON.parse(JSON.stringify(data)), rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false } });
    return (players[key] = { anim, box, data, fr: data.fr || 30, ip: data.ip || 0, op: data.op || 60 });
  }
  PROPS.lottie = function (p, t, lt) {
    const P = player(`${p.id}|${p.src}`, p.src), from = p.from ?? P.ip, to = Math.min(p.to ?? P.op - 1, P.op - 1), len = Math.max(1, to - from);
    let f = Math.max(0, lt) * P.fr * (p.speed ?? 1);
    f = p.loop ? f % len : Math.min(f, len);   // default: play once and hold the last frame
    P.anim.goToAndStop(from + f, true);
    const svg = P.box.querySelector('svg'); if (!svg) return '';
    const w = p.w || P.data.w, h = p.h || P.data.h;
    return `<svg x="${f2(-w / 2)}" y="${f2(-h / 2)}" width="${f2(w)}" height="${f2(h)}" viewBox="0 0 ${P.data.w} ${P.data.h}" preserveAspectRatio="xMidYMid meet" overflow="visible">${svg.innerHTML}</svg>`;
  };
  if (typeof NO_TOON !== 'undefined') NO_TOON.add('lottie');
})();
