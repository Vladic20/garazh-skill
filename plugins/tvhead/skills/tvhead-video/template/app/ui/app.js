// tvhead studio UI — vanilla JS, polls the local server. User text is always escaped (h); UI strings come from i18n.js (t).
const $ = s => document.querySelector(s);
const h = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (p, o = {}) => {
  const r = await fetch(p, { headers: { 'Content-Type': 'application/json' }, ...o, body: o.body ? JSON.stringify(o.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.code && I18N.en['err.' + j.code] ? t('err.' + j.code) : j.error || r.statusText);
  return j;
};
const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem('tvh:' + k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem('tvh:' + k, JSON.stringify(v)); } catch {} } };

const STEPS = ['brief', 'storyboarding', 'storyboard', 'rendering', 'done'];
const STEP_OF = { brief: 0, revise: 1, storyboarding: 1, storyboard: 2, rendering: 3, done: 4, error: -1 };
const statusText = s => I18N.en['status.' + s] ? t('status.' + s) : s;

// narration language defaults to the interface language on first use
const state = { lang: LS.get('lang', UI), format: LS.get('format', '16:9'), theme: LS.get('theme', 'paper'), look: LS.get('look', 'doodle'), music: LS.get('music', 'auto'), refs: [], selected: LS.get('job', null), status: null, defaults: {}, editing: false,
  library: [], picked: new Set(), libImgs: [], libKind: 'character', libFilter: 'all', parts: null };

// ─── interface language ──────────────────────────────────────────
function setUI(l) {
  UI = l; LS.set('ui', l);
  document.querySelectorAll('#uiLang button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.ui === l)));
  applyI18n();
  setLang(state.lang); setFormat(state.format); loadLooks(); $('#durLabel').textContent = `${$('#briefForm').duration.value} ${t('sec')}`;
  loadThemes(); buildVoices(); loadLibrary(); loadCatalog(); refreshStatus(); refreshJobs(); refreshDetail(true);
}
document.querySelectorAll('#uiLang button').forEach(b => b.addEventListener('click', () => setUI(b.dataset.ui)));

// ─── header status ───────────────────────────────────────────────
async function refreshStatus() {
  try {
    const s = await api('/api/status'); state.status = s; state.defaults = s.defaults || {};
    const pc = $('#pillClaude'), pt = $('#pillTts');
    pc.className = 'pill ' + (s.claude.watching ? 'on' : 'off');
    pc.textContent = t(s.claude.watching ? 'pill.claude.on' : 'pill.claude.off');
    pt.className = 'pill ' + (s.tts ? 'on' : 'warn');
    pt.textContent = s.tts ? t('pill.tts.on', { p: s.tts === 'openrouter' ? 'OpenRouter' : 'Fish' }) : t('pill.tts.none');
    pt.title = s.tts ? '' : t('pill.tts.title');
    $('#cliOpt').hidden = !s.claude.cli;
    if (!state.voicesBuilt) buildVoices();
  } catch { $('#pillClaude').textContent = t('pill.server'); $('#pillClaude').className = 'pill off'; }
}

// ─── brief form ─────────────────────────────────────────────────
function setLang(l) {
  state.lang = ['en', 'ru', 'both'].includes(l) ? l : 'en'; LS.set('lang', state.lang);
  document.querySelectorAll('.seg [data-lang]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.lang === state.lang)));
  $('#langHint').textContent = t('lang.' + state.lang); buildVoices();
}
document.querySelectorAll('.seg [data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
function setFormat(f) {
  state.format = f === '9:16' ? '9:16' : '16:9'; LS.set('format', state.format);
  document.querySelectorAll('.seg [data-format]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.format === state.format)));
  $('#fmtHint').textContent = t('fmt.' + state.format);
}
document.querySelectorAll('.seg [data-format]').forEach(b => b.addEventListener('click', () => setFormat(b.dataset.format)));
// looks come from the server (lib/story.mjs LOOKS): each has its own palette and default music; a reference palette stays a reference
let LOOKS = [], MUSICS = [];
const lookOf = id => LOOKS.find(l => l.id === id) || LOOKS[0] || { id: 'doodle', theme: 'paper', music: null };
async function loadLooks() {
  if (!LOOKS.length) { const d = await api('/api/looks').catch(() => ({ looks: [], music: [] })); LOOKS = d.looks; MUSICS = d.music; }
  $('#looks').innerHTML = LOOKS.map(l => `<button type="button" class="look" role="radio" data-look="${h(l.id)}" aria-checked="${l.id === state.look}"><img src="/ui/look-${h(l.id)}.jpg" alt="" loading="lazy">
    <b>${h(I18N.en['look.' + l.id] ? t('look.' + l.id) : l.label)}</b><small>${h(I18N.en['look.' + l.id + '.d'] ? t('look.' + l.id + '.d') : '')}</small></button>`).join('');
  $('#looks').querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => setLook(b.dataset.look)));
  $('#musicSel').innerHTML = ['auto', ...MUSICS, 'none'].map(m => `<option value="${h(m)}">${h(t('music.' + m))}</option>`).join('');
  setLook(state.look, true); setMusic(state.music);
}
function setLook(l, quiet) {
  state.look = LOOKS.some(x => x.id === l) ? l : 'doodle'; LS.set('look', state.look);
  document.querySelectorAll('#looks [data-look]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.look === state.look)));
  if (quiet) return;
  if (state.theme !== 'reference') state.theme = lookOf(state.look).theme || 'paper';
  LS.set('theme', state.theme); loadThemes(); setMusic(state.music);
}
function setMusic(m) {
  state.music = MUSICS.includes(m) || m === 'none' ? m : 'auto'; LS.set('music', state.music);
  $('#musicSel').value = state.music;
  const def = lookOf(state.look).music;
  $('#musicHint').textContent = state.music === 'auto' ? t('music.hint.auto', { m: def ? t('music.' + def) : t('music.drone') }) : t('music.hint.' + state.music);
}
$('#musicSel').addEventListener('change', e => setMusic(e.target.value));
const langs = () => state.lang === 'both' ? ['en', 'ru'] : [state.lang];

function buildVoices() {
  state.voicesBuilt = true;
  const box = $('#voices'), saved = LS.get('voices', {});
  box.innerHTML = langs().map(l => `<div class="vrow"><b>${l.toUpperCase()}</b>
    <input data-vlang="${l}" placeholder="${h(t('voice.default', { v: state.defaults.voices?.[l] || '' }))}" value="${h(saved[l] || '')}" aria-label="${h(t('voice.aria', { l }))}">
    <button type="button" class="btn" data-pick="${l}">${h(t('voice.pick'))}</button></div>`).join('');
  box.querySelectorAll('input').forEach(i => i.addEventListener('change', () => { const v = LS.get('voices', {}); v[i.dataset.vlang] = i.value.trim(); LS.set('voices', v); }));
  box.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => openVoices(b.dataset.pick)));
}

async function loadThemes() {
  const list = await api('/api/themes').catch(() => []);
  const box = $('#themes');
  box.innerHTML = list.map(th => `<button type="button" class="theme" role="radio" data-theme="${h(th.id)}" aria-checked="${th.id === state.theme}">
      ${th.thumb ? `<img src="${th.thumb}" alt="" loading="lazy">` : `<div class="sw" style="background:${h(th.paper)};border-bottom:6px solid ${h(th.ink)}"></div>`}
      <span>${h(I18N.en['theme.' + th.id] ? t('theme.' + th.id) : th.label)}</span></button>`).join('') +
    `<button type="button" class="theme" role="radio" data-theme="reference" aria-checked="${state.theme === 'reference'}"><div class="sw" style="background:repeating-linear-gradient(45deg,#fff 0 8px,#e3e6e8 8px 16px);display:grid;place-items:center;font:28px Hand">＋</div><span>${h(t('theme.reference'))}</span></button>`;
  box.querySelectorAll('.theme').forEach(b => b.addEventListener('click', () => {
    state.theme = b.dataset.theme; LS.set('theme', state.theme);
    box.querySelectorAll('.theme').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    if (state.theme === 'reference' && !state.refs.length) $('#refInput').click();
  }));
  if (list.some(th => !th.thumb)) setTimeout(loadThemes, 4000);   // thumbnails are still rendering on first start
}

// references
const drop = $('#drop'), refInput = $('#refInput');
drop.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') refInput.click(); });
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); refInput.click(); } });
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); addRefs(e.dataTransfer.files); });
refInput.addEventListener('change', () => { addRefs(refInput.files); refInput.value = ''; });
function addRefs(files) {
  [...files].filter(f => f.type.startsWith('image/')).slice(0, 8 - state.refs.length).forEach(f => {
    if (f.size > 20 * 1048576) return msg(t('ref.toobig', { name: f.name }), true);
    const r = new FileReader(); r.onload = () => { state.refs.push({ name: f.name, data: r.result }); drawRefs(); }; r.readAsDataURL(f);
  });
}
function drawRefs() {
  $('#refs').innerHTML = state.refs.map((r, i) => `<figure><img src="${r.data}" alt="${h(r.name)}"><button type="button" aria-label="${h(t('ref.remove', { name: r.name }))}" data-rm="${i}">×</button></figure>`).join('');
  $('#refs').querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); state.refs.splice(+b.dataset.rm, 1); drawRefs(); }));
}

const form = $('#briefForm'), dur = form.duration;
dur.addEventListener('input', () => $('#durLabel').textContent = `${dur.value} ${t('sec')}`);
function msg(text, err) { const m = $('#formMsg'); m.textContent = text; m.className = 'formmsg' + (err ? ' err' : ''); }
form.addEventListener('submit', async e => {
  e.preventDefault();
  const voices = {}; document.querySelectorAll('[data-vlang]').forEach(i => { if (i.value.trim()) voices[i.dataset.vlang] = i.value.trim(); });
  const body = { topic: form.topic.value, languages: langs(), format: state.format, duration: +dur.value, theme: state.theme, look: state.look, music: state.music, arc: form.arc.value, voices, notes: form.notes.value,
    captions: form.captions.checked, autoRender: form.autoRender.checked, engine: form.engine.value, refs: state.refs,
    castIdeas: form.castIdeas.value, worldIdeas: form.worldIdeas.value, invent: form.invent.checked, library: [...state.picked], uiLang: UI };
  $('#sendBtn').disabled = true; msg(t('sending'));
  try {
    const job = await api('/api/jobs', { method: 'POST', body });
    state.selected = job.id; LS.set('job', job.id);
    form.topic.value = ''; form.notes.value = ''; form.castIdeas.value = ''; form.worldIdeas.value = ''; state.refs = []; drawRefs(); state.picked.clear(); drawPick();
    msg(t(body.engine === 'cli' ? 'sent.cli' : state.status?.claude.watching ? 'sent.listening' : 'sent.waiting'));
    await refreshJobs(); await refreshDetail(true);
  } catch (err) { msg(err.message, true); }
  $('#sendBtn').disabled = false;
});

// voices dialog
const dlg = $('#voiceDlg');
function openVoices(lang) { dlg.dataset.lang = lang; $('#vLang').textContent = lang.toUpperCase(); $('#vQuery').value = ''; dlg.showModal(); searchVoices(); }
async function searchVoices() {
  const ul = $('#vList'); ul.innerHTML = `<li>${h(t('vdlg.searching'))}</li>`;
  try {
    const list = await api(`/api/voices?lang=${dlg.dataset.lang}&q=${encodeURIComponent($('#vQuery').value)}`);
    ul.innerHTML = list.length ? list.map(v => `<li><span>${h(v.title)}<small>${h(v.tags.join(', '))}</small></span>
      <a href="https://fish.audio/m/${h(v.id)}" target="_blank" rel="noopener">${h(t('vdlg.listen'))}</a><button type="button" class="btn" data-use="${h(v.id)}">${h(t('vdlg.take'))}</button></li>`).join('') : `<li>${h(t('vdlg.none'))}</li>`;
    ul.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', () => {
      const inp = document.querySelector(`[data-vlang="${dlg.dataset.lang}"]`); inp.value = b.dataset.use; inp.dispatchEvent(new Event('change')); dlg.close();
    }));
  } catch (e) { ul.innerHTML = `<li class="err">${h(e.message)}</li>`; }
}
$('#vSearch').addEventListener('click', searchVoices);
$('#vQuery').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); searchVoices(); } });

// ─── jobs + detail ──────────────────────────────────────────────
async function refreshJobs() {
  const list = await api('/api/jobs').catch(() => []);
  if (!state.selected && list[0]) state.selected = list[0].id;
  $('#jobs').innerHTML = list.map(j => `<button class="job" data-id="${h(j.id)}" aria-current="${j.id === state.selected}">
      <span class="t">${h(j.topic || j.id)}</span><span class="chip ${h(j.status)}">${h(statusText(j.status))}</span> <small>${h((j.languages || []).join('+').toUpperCase())}</small></button>`).join('');
  $('#jobs').querySelectorAll('.job').forEach(b => b.addEventListener('click', () => { state.selected = b.dataset.id; LS.set('job', state.selected); state.editing = false; refreshJobs(); refreshDetail(true); }));
}

let lastSig = '';
async function refreshDetail(force) {
  if (!state.selected) return;
  let j; try { j = await api(`/api/jobs/${state.selected}?ui=${UI}`); } catch { return; }
  const sig = JSON.stringify([UI, j.status, j.updatedAt, j.progress?.done, j.storyboard?.scenes?.map(s => s.thumb)]);
  if (!force && sig === lastSig) return;
  if (state.editing && j.status === 'storyboard' && !force) return;   // don't wipe textareas while the user types
  lastSig = sig;
  const d = $('#detail'), step = STEP_OF[j.status];
  let html = `<div class="dhead"><div><h2>${h(j.brief?.topic || j.id)}</h2>
      <div class="meta">${h(j.id)} · ${h((j.brief?.languages || []).join(' + ').toUpperCase())} · ${h(j.storyboard?.format || j.brief?.format || '16:9')} · ~${h(j.brief?.duration || '?')} ${h(t('sec'))} · ${h(t('meta.look'))}: ${h(I18N.en['look.' + (j.brief?.look || 'doodle')] ? t('look.' + (j.brief?.look || 'doodle')) : j.brief?.look)} · ${h(t('meta.style'))}: ${h(I18N.en['theme.' + j.brief?.theme] ? t('theme.' + j.brief.theme) : j.brief?.theme || 'paper')}${j.brief?.refs?.length ? ` · ${h(t('meta.refs'))}: ${j.brief.refs.length}` : ''}</div></div>
      <span class="chip ${h(j.status)}">${h(statusText(j.status))}</span></div>
    <ol class="steps">${STEPS.map((k, i) => `<li class="step ${i < step || j.status === 'done' ? 'done' : i === step ? 'now' : ''}">${h(t('step.' + k))}</li>`).join('')}</ol>`;

  if (j.status === 'brief' || j.status === 'revise' || j.status === 'storyboarding') {
    const listening = state.status?.claude.watching, cli = j.brief?.engine === 'cli';
    const text = t(j.status === 'storyboarding' ? 'wait.storyboarding' : listening || cli ? (j.status === 'revise' ? 'wait.revise' : 'wait.ack') : 'wait.idle');
    const last = j.history?.length ? j.history[j.history.length - 1] : null;
    html += `<div class="wait">${tvSvg()}<div><b>${h(text)}</b>${last ? `<div class="meta">${h(I18N.en['hist.' + last.status] ? t('hist.' + last.status) : last.msg)}</div>` : ''}</div></div>`;
  }
  if (j.brief && (j.brief.libraryItems?.length || j.brief.castIdeas || j.brief.worldIdeas)) html += briefCastHtml(j.brief);
  if (j.storyboard?.cast && ['storyboard', 'rendering', 'done', 'revise', 'error'].includes(j.status)) html += castHtml(j.storyboard);
  if (j.storyboard && ['storyboard', 'rendering', 'done', 'revise', 'error'].includes(j.status)) html += boardHtml(j);
  if (j.status === 'storyboard') html += `<div class="actions">
      <button class="btn primary big" style="width:auto" id="goRender">${h(t('render.go'))}</button>
      <button class="btn" id="saveText" hidden>${h(t('render.save'))}</button>
      <div class="fb"><textarea id="fbText" rows="2" placeholder="${h(t('fb.ph'))}"></textarea>
      <button class="btn" id="sendFb">${h(t('fb.send'))}</button></div></div>`;
  if (j.status === 'rendering') html += renderProgress(j);
  if (j.status === 'done' || (j.outputs && Object.keys(j.outputs).length)) html += videosHtml(j);
  if (j.status === 'error') html += `<p class="err"><b>${h(t('err.label'))}</b> ${h(j.error || '')}</p><button class="btn" id="retry">${h(t('retry'))}</button>`;
  d.innerHTML = html;

  $('#goRender')?.addEventListener('click', async () => { await api(`/api/jobs/${j.id}/approve`, { method: 'POST' }); state.editing = false; refreshDetail(true); refreshJobs(); });
  $('#sendFb')?.addEventListener('click', async () => { const v = $('#fbText').value.trim(); if (!v) return; await api(`/api/jobs/${j.id}/feedback`, { method: 'POST', body: { text: v } }); state.editing = false; refreshDetail(true); refreshJobs(); });
  $('#retry')?.addEventListener('click', async () => { await api(`/api/jobs/${j.id}/retry`, { method: 'POST' }); refreshDetail(true); });
  d.querySelectorAll('textarea[data-scene]').forEach(el => el.addEventListener('input', () => { state.editing = true; $('#saveText').hidden = false; }));
  $('#fbText')?.addEventListener('input', () => state.editing = true);
  $('#saveText')?.addEventListener('click', async () => {
    const scenes = {};
    d.querySelectorAll('textarea[data-scene]').forEach(el => { (scenes[el.dataset.scene] ||= { i: +el.dataset.scene, say: {} }).say[el.dataset.lang] = el.value; });
    await api(`/api/jobs/${j.id}/narration`, { method: 'POST', body: { scenes: Object.values(scenes) } }); state.editing = false; refreshDetail(true);
  });
}
const fmt = s => s == null ? '' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function boardHtml(j) {
  const sb = j.storyboard, editable = j.status === 'storyboard';
  const dl = sb.director ? `<p class="director">🎬 <a href="${h(sb.director.proposal)}" target="_blank">${h(t('dir.proposal'))}</a> · <a href="${h(sb.director.prompts)}" target="_blank">${h(t('dir.prompts'))}</a>${sb.director.checks ? ` · <span title="${h(sb.director.checkText)}">⚠ ${sb.director.checks}</span>` : ''}</p>` : '';
  return `<h3>${h(t('board.h', { n: sb.scenes.length }))}${sb.duration ? ` · ${fmt(sb.duration)}` : ''}</h3>${dl}<div class="board${sb.format === '9:16' ? ' tall' : ''}">${sb.scenes.map(s => `
    <article class="scene">
      <div class="img">${s.thumb ? `<img src="${s.thumb}" alt="${h(t('scene.alt', { n: s.i + 1 }))}" loading="lazy">` : ''}<span class="num">#${s.i + 1} ${fmt(s.from)}</span>
        ${s.transition ? `<span class="chip tr" title="${h(t('tr.title'))}">${h(I18N.en['tr.' + s.transition] ? t('tr.' + s.transition) : s.transition)}</span>` : ''}</div>
      <div class="body">${s.note ? `<div class="note">${h(s.note)}</div>` : ''}
        ${sb.languages.map(l => editable ? `<label>${l.toUpperCase()}<textarea data-scene="${s.i}" data-lang="${l}" rows="2">${h(s.say[l])}</textarea></label>` : `<div><label>${l.toUpperCase()}</label><div>${h(s.say[l])}</div></div>`).join('')}
      </div></article>`).join('')}</div>`;
}
function renderProgress(j) {
  const p = j.progress || {}, ls = j.storyboard?.languages || j.brief?.languages || ['en'];
  return `<div class="bars">${ls.map(l => {
    const done = j.outputs?.[l], cur = p.lang === l;
    const pct = done ? 100 : cur ? (p.stage === 'frames' ? 10 + 80 * p.done / p.total : p.stage === 'audio' ? 95 : 5) : 0;
    const label = done ? t('stage.done') : cur ? (I18N.en['stage.' + p.stage] ? t('stage.' + p.stage) : p.stage) : t('stage.queued');
    return `<div><div class="meta">${l.toUpperCase()} · ${h(label)}${cur && p.stage === 'frames' ? ` ${p.done}/${p.total}` : ''}</div>
      <div class="bar" role="progressbar" aria-valuenow="${pct | 0}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct.toFixed(1)}%"></i></div></div>`;
  }).join('')}</div>`;
}
function videosHtml(j) {
  const outs = Object.values(j.outputs || {});
  if (!outs.length) return '';
  return `<h3>${h(t('videos.h'))}</h3><div class="videos">${outs.map(o => `<figure${o.height > o.width ? ' class="tall"' : ''}>
    <video controls preload="metadata" src="/files/${h(o.file)}#t=1.5"></video>
    <figcaption><b>${h(o.lang.toUpperCase())}</b> <span class="meta">${o.width}×${o.height} · ${fmt(o.duration)} · ${o.mb} ${h(t('mb'))}${o.silentLines ? ' · ' + h(t('silent')) : ''}</span>
      <span><a href="/files/${h(o.file)}" download>mp4</a> · <a href="/files/${h(o.file.replace(/\.mp4$/, '.srt'))}" download>srt</a></span></figcaption></figure>`).join('')}</div>`;
}
function tvSvg() {
  return `<svg class="tv" viewBox="0 0 64 58" aria-hidden="true"><path d="M24 12 18 2M40 12l6-10" stroke="#141414" stroke-width="4" stroke-linecap="round"/><rect x="4" y="12" width="56" height="44" rx="8" fill="#585858" stroke="#141414" stroke-width="4"/><rect class="scr" x="12" y="19" width="40" height="30" rx="5" fill="#e9ebeb" stroke="#141414" stroke-width="3"/><circle cx="25" cy="31" r="3" fill="#141414"/><circle cx="39" cy="31" r="3" fill="#141414"/></svg>`;
}

// ─── cast & world: what the user asked for, and what Claude designed ─────
const kindText = k => I18N.en['kind.' + k] ? t('kind.' + k) : k;
function briefCastHtml(b) {
  const items = b.libraryItems || [];
  return `<details class="castbrief"><summary>${h(t('cb.summary'))}${items.length ? ` · ${h(t('cb.cards', { n: items.length }))}` : ''}</summary>
    ${b.castIdeas ? `<p><b>${h(t('cb.cast'))}</b> ${h(b.castIdeas)}</p>` : ''}${b.worldIdeas ? `<p><b>${h(t('cb.world'))}</b> ${h(b.worldIdeas)}</p>` : ''}
    ${items.length ? `<div class="libgrid mini">${items.map(it => libCardHtml({ ...it, images: it.images.map(f => `episodes/${state.selected}/${f}`) }, false)).join('')}</div>` : ''}
    <p class="meta">${h(t(b.invent === false ? 'cb.only' : 'cb.invent'))}</p></details>`;
}
function castHtml(sb) {
  const c = sb.cast, byFrame = {};
  (c.items || []).forEach(it => (byFrame[it.scene] ||= []).push(it));
  return `<h3>${h(t('cast.h'))}</h3>
    ${c.characters?.length ? `<ul class="castlist">${c.characters.map(ch => `<li><b>${h(ch.name)}</b>${ch.desc ? ` — ${h(ch.desc)}` : ''}</li>`).join('')}</ul>` : ''}
    <div class="board castboard${sb.format === '9:16' ? ' tall' : ''}">${(c.frames || []).map((src, i) => `<figure class="scene"><div class="img"><img src="${src}" alt="" loading="lazy"></div>
      <figcaption class="body">${(byFrame[i] || []).map(it => `<span class="chip">${it.kind === 'set' ? '🏙 ' + h(state.parts?.set?.[it.id] || it.name) : h(it.name)}</span>`).join(' ')}</figcaption></figure>`).join('')}</div>
    <p class="hint">${h(t('cast.hint'))}</p>`;
}

// ─── views: studio / library ─────────────────────────────────────
function setView(v) {
  LS.set('view', v);
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.view === v ? 'page' : 'false'));
  $('#studioView').hidden = v !== 'studio'; $('#libView').hidden = v !== 'library';
  if (v === 'library') loadLibrary();
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

function libCardHtml(it, actions = true) {
  const img = it.images?.[0];
  return `<article class="libcard ${h(it.kind)}">
    <div class="img">${img ? `<img src="/files/${h(img)}" alt="" loading="lazy">` : `<div class="noimg">${h((it.title || '?').slice(0, 1))}</div>`}${it.images?.length > 1 ? `<span class="more">+${it.images.length - 1}</span>` : ''}</div>
    <div class="body"><span class="chip">${h(kindText(it.kind))}</span> <b>${h(it.title || t('lib.untitled'))}</b>${it.notes ? `<p>${h(it.notes)}</p>` : ''}
      ${actions ? `<button type="button" class="link" data-del="${h(it.id)}">${h(t('lib.del'))}</button>` : ''}</div></article>`;
}
async function loadLibrary() {
  state.library = await api('/api/library').catch(() => []);
  $('#libCount').textContent = state.library.length ? state.library.length : '';
  const list = state.library.filter(it => state.libFilter === 'all' || it.kind === state.libFilter);
  $('#libGrid').innerHTML = list.length ? list.map(it => libCardHtml(it)).join('') : `<div class="card empty"><h3>${h(t('lib.empty.h'))}</h3><p>${h(t('lib.empty.p'))}</p></div>`;
  $('#libGrid').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { if (!confirm(t('lib.del.confirm'))) return; await api(`/api/library/${b.dataset.del}/delete`, { method: 'POST' }); state.picked.delete(b.dataset.del); loadLibrary(); }));
  drawPick();
}
function drawPick() {
  const box = $('#libPick');
  if (!state.library.length) { box.innerHTML = `<p class="hint">${t('libpick.empty')}</p>`; box.querySelector('[data-go]').addEventListener('click', e => { e.preventDefault(); setView('library'); }); return; }
  box.innerHTML = state.library.map(it => `<button type="button" class="pick" aria-pressed="${state.picked.has(it.id)}" data-id="${h(it.id)}" title="${h(it.notes || '')}">
    ${it.images?.[0] ? `<img src="/files/${h(it.images[0])}" alt="">` : `<span class="noimg">${h((it.title || '?').slice(0, 1))}</span>`}<span>${h(it.title || kindText(it.kind))}</span></button>`).join('');
  box.querySelectorAll('.pick').forEach(b => b.addEventListener('click', () => { const id = b.dataset.id; state.picked.has(id) ? state.picked.delete(id) : state.picked.add(id); b.setAttribute('aria-pressed', String(state.picked.has(id))); }));
}
document.querySelectorAll('#kindSeg button').forEach(b => b.addEventListener('click', () => { state.libKind = b.dataset.kind; document.querySelectorAll('#kindSeg button').forEach(x => x.setAttribute('aria-checked', String(x === b))); }));
document.querySelectorAll('#libFilter button').forEach(b => b.addEventListener('click', () => { state.libFilter = b.dataset.f; document.querySelectorAll('#libFilter button').forEach(x => x.setAttribute('aria-checked', String(x === b))); loadLibrary(); }));
const libDrop = $('#libDrop'), libInput = $('#libInput');
libDrop.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') libInput.click(); });
libDrop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); libInput.click(); } });
libDrop.addEventListener('dragover', e => { e.preventDefault(); libDrop.classList.add('over'); });
libDrop.addEventListener('dragleave', () => libDrop.classList.remove('over'));
libDrop.addEventListener('drop', e => { e.preventDefault(); libDrop.classList.remove('over'); addLibImgs(e.dataTransfer.files); });
libInput.addEventListener('change', () => { addLibImgs(libInput.files); libInput.value = ''; });
function addLibImgs(files) {
  [...files].filter(f => f.type.startsWith('image/')).slice(0, 6 - state.libImgs.length).forEach(f => { const r = new FileReader(); r.onload = () => { state.libImgs.push({ name: f.name, data: r.result }); drawLibImgs(); }; r.readAsDataURL(f); });
}
function drawLibImgs() {
  $('#libRefs').innerHTML = state.libImgs.map((r, i) => `<figure><img src="${r.data}" alt="${h(r.name)}"><button type="button" aria-label="${h(t('remove'))}" data-rm="${i}">×</button></figure>`).join('');
  $('#libRefs').querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); state.libImgs.splice(+b.dataset.rm, 1); drawLibImgs(); }));
}
$('#libForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, m = $('#libMsg');
  try {
    $('#libSave').disabled = true; m.textContent = t('lib.saving'); m.className = 'formmsg';
    await api('/api/library', { method: 'POST', body: { kind: state.libKind, title: f.title.value, notes: f.notes.value, images: state.libImgs } });
    f.title.value = ''; f.notes.value = ''; state.libImgs = []; drawLibImgs(); m.textContent = t('lib.saved');
    loadLibrary();
  } catch (err) { m.textContent = err.message; m.className = 'formmsg err'; }
  $('#libSave').disabled = false;
});
async function loadCatalog() {
  const P = await api(`/api/parts?lang=${UI}`).catch(() => null); if (!P) return; state.parts = P;
  $('#catalog').innerHTML = Object.entries(P).map(([k, v]) => `<div class="catrow"><b>${h(t('cat.' + k))}</b> ${Object.values(v).map(x => `<span class="chip">${h(x)}</span>`).join(' ')}</div>`).join('');
}
$('#quitBtn').addEventListener('click', async () => {
  if (!confirm(t('quit.confirm'))) return;
  await api('/api/shutdown', { method: 'POST' }).catch(() => {});
  document.body.innerHTML = `<main class="layout"><div class="card"><h2>${h(t('quit.done.h'))}</h2><p>${h(t('quit.done.p'))}</p></div></main>`;
});

// ─── boot ───────────────────────────────────────────────────────
setUI(UI);
setView(LS.get('view', 'studio'));
refreshJobs().then(() => refreshDetail(true));
setInterval(refreshStatus, 4000);
setInterval(refreshJobs, 3000);
setInterval(() => refreshDetail(false), 1500);
