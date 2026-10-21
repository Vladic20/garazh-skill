// ─── After Effects plates: a scene with "ae" shows the frames of its rendered AE clip as the background ───────────
// make.mjs renders the clip (lib/ae.mjs) and writes TL.scenes[i].ae = { recipe, dir, frames, fps }. The plate sits above
// the paper and below the drawing, so characters, props and captions stay on top. render() waits for the frame image
// to decode before the screenshot (frames.mjs awaits it). Without frames (stills before the first render, or AE not
// installed) a labelled placeholder shows where the 3D scene will be.
(function () {
  const stage = document.getElementById('stage'), art = document.getElementById('art');
  const plate = document.createElement('img'); plate.id = 'aeplate';
  plate.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none';
  const ph = document.createElement('div'); ph.id = 'aeph';
  ph.style.cssText = `position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;
    background:radial-gradient(ellipse at 50% 40%, #3a2a3e, #120e14 75%);color:#f3ead6;font:800 34px/1.2 Inter, Rubik, sans-serif;letter-spacing:1px;text-align:center`;
  const host = art.parentNode;   // #stage, or the desk3d slab
  host.insertBefore(plate, art); host.insertBefore(ph, art);
  const pad = n => String(n).padStart(5, '0');
  const sceneAt = t => TL.scenes[sceneIndex(t)];
  const _render = window.render;
  window.render = function (t) {
    _render(t);
    const sc = sceneAt(t), a = sc && sc.ae;
    if (!a) { plate.style.display = 'none'; ph.style.display = 'none'; return; }
    const i = TL.scenes.indexOf(sc), prev = TL.scenes[i - 1], next = TL.scenes[i + 1];
    const fin = prev && prev.ae ? 1 : clamp((t - sc.from) / .35), fout = next && next.ae ? 1 : clamp((sc.to - t) / .3);
    const op = Math.min(fin, fout).toFixed(3);
    if (!a.frames) {
      plate.style.display = 'none'; ph.style.display = 'flex'; ph.style.opacity = op;
      ph.innerHTML = `<div style="font-size:18px;letter-spacing:4px;opacity:.6">AFTER EFFECTS · 3D</div><div>${esc(a.recipe || '')}${a.text ? ' — ' + esc(a.text) : ''}</div><div style="font-size:16px;opacity:.5">${esc(a.note || 'rendered by aerender in the final video')}</div>`;
      return;
    }
    ph.style.display = 'none'; plate.style.display = 'block'; plate.style.opacity = op;
    const f = Math.max(1, Math.min(a.frames, Math.floor((t - sc.from) * (a.fps || 30)) + 1));
    const src = `${a.dir}/f_${pad(f)}.jpg`;
    if (plate.getAttribute('src') !== src) { plate.setAttribute('src', src); return plate.decode().catch(() => {}); }
  };
})();
