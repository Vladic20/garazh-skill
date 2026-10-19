// tvhead studio UI — vanilla JS, polls the local server. All user text is inserted with textContent/escaped.
const $ = s => document.querySelector(s);
const h = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (p, o = {}) => { const r = await fetch(p, { headers: { 'Content-Type': 'application/json' }, ...o, body: o.body ? JSON.stringify(o.body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j; };
const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem('tvh:' + k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem('tvh:' + k, JSON.stringify(v)); } catch {} } };

const STATUS_RU = { brief: 'ждёт Claude', storyboarding: 'пишется раскадровка', storyboard: 'проверь раскадровку', revise: 'правки у Claude', rendering: 'рендер', done: 'готово', error: 'ошибка' };
const STEPS = [['brief', 'Бриф'], ['storyboarding', 'Раскадровка'], ['storyboard', 'Проверка'], ['rendering', 'Рендер'], ['done', 'Готово']];
const STEP_OF = { brief: 0, revise: 1, storyboarding: 1, storyboard: 2, rendering: 3, done: 4, error: -1 };
const TR_RU = { curve: '→ сдвиг', zoom: '⊕ зум сквозь', pull: '⊖ отъезд', whip: '⇢ whip-пан', iris: '◉ ирис', wipe: '▥ шторка', page: '▤ новый лист', fade: '◌ растворение', cut: '| склейка', none: '= тот же кадр' };

const state = { lang: LS.get('lang', 'en'), format: LS.get('format', '16:9'), theme: LS.get('theme', 'paper'), refs: [], selected: LS.get('job', null), status: null, defaults: {}, editing: false };

// ─── header status ───────────────────────────────────────────────
async function refreshStatus() {
  try {
    const s = await api('/api/status'); state.status = s; state.defaults = s.defaults || {};
    const pc = $('#pillClaude'), pt = $('#pillTts');
    pc.className = 'pill ' + (s.claude.watching ? 'on' : 'off');
    pc.textContent = s.claude.watching ? 'Claude на связи' : 'Claude не слушает';
    pt.className = 'pill ' + (s.tts ? 'on' : 'warn');
    pt.textContent = s.tts ? `Озвучка: ${s.tts === 'openrouter' ? 'OpenRouter' : 'Fish'}` : 'Нет ключа озвучки';
    pt.title = s.tts ? '' : 'Добавь OPENROUTER_API_KEY в .env студии — без него видео будет без голоса';
    $('#cliOpt').hidden = !s.claude.cli;
    if (!state.voicesBuilt) buildVoices();
  } catch { $('#pillClaude').textContent = 'Сервер недоступен'; $('#pillClaude').className = 'pill off'; }
}

// ─── brief form ─────────────────────────────────────────────────
const LANG_HINT = { en: 'Один ролик на английском', ru: 'Один ролик на русском', both: 'Два ролика: EN и RU, одна картинка, своя озвучка у каждого' };
function setLang(l) {
  state.lang = l; LS.set('lang', l);
  document.querySelectorAll('.seg [data-lang]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.lang === l)));
  $('#langHint').textContent = LANG_HINT[l]; buildVoices();
}
document.querySelectorAll('.seg [data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
const FMT_HINT = { '16:9': 'Горизонтальный 1920×1080 — YouTube', '9:16': 'Вертикальный 1080×1920 — Shorts, Reels, TikTok' };
function setFormat(f) {
  state.format = FMT_HINT[f] ? f : '16:9'; LS.set('format', state.format);
  document.querySelectorAll('.seg [data-format]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.format === state.format)));
  $('#fmtHint').textContent = FMT_HINT[state.format];
}
document.querySelectorAll('.seg [data-format]').forEach(b => b.addEventListener('click', () => setFormat(b.dataset.format)));
const langs = () => state.lang === 'both' ? ['en', 'ru'] : [state.lang];

function buildVoices() {
  state.voicesBuilt = true;
  const box = $('#voices'), saved = LS.get('voices', {});
  box.innerHTML = langs().map(l => `<div class="vrow"><b>${l.toUpperCase()}</b>
    <input data-vlang="${l}" placeholder="по умолчанию: ${h(state.defaults.voices?.[l] || '')}" value="${h(saved[l] || '')}" aria-label="ID голоса ${l}">
    <button type="button" class="btn" data-pick="${l}">Подобрать</button></div>`).join('');
  box.querySelectorAll('input').forEach(i => i.addEventListener('change', () => { const v = LS.get('voices', {}); v[i.dataset.vlang] = i.value.trim(); LS.set('voices', v); }));
  box.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => openVoices(b.dataset.pick)));
}

async function loadThemes() {
  const list = await api('/api/themes').catch(() => []);
  const box = $('#themes');
  box.innerHTML = list.map(t => `<button type="button" class="theme" role="radio" data-theme="${t.id}" aria-checked="${t.id === state.theme}">
      ${t.thumb ? `<img src="${t.thumb}" alt="" loading="lazy">` : `<div class="sw" style="background:${h(t.paper)};border-bottom:6px solid ${h(t.ink)}"></div>`}
      <span>${h(t.label.replace(' (default)', ''))}</span></button>`).join('') +
    `<button type="button" class="theme" role="radio" data-theme="reference" aria-checked="${state.theme === 'reference'}"><div class="sw" style="background:repeating-linear-gradient(45deg,#fff 0 8px,#e3e6e8 8px 16px);display:grid;place-items:center;font:28px Hand">＋</div><span>По моему референсу</span></button>`;
  box.querySelectorAll('.theme').forEach(b => b.addEventListener('click', () => {
    state.theme = b.dataset.theme; LS.set('theme', state.theme);
    box.querySelectorAll('.theme').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    if (state.theme === 'reference' && !state.refs.length) $('#refInput').click();
  }));
  if (list.some(t => !t.thumb)) setTimeout(loadThemes, 4000);   // thumbnails are still rendering on first start
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
    if (f.size > 20 * 1048576) return msg(`${f.name}: больше 20 МБ`, true);
    const r = new FileReader(); r.onload = () => { state.refs.push({ name: f.name, data: r.result }); drawRefs(); }; r.readAsDataURL(f);
  });
}
function drawRefs() {
  $('#refs').innerHTML = state.refs.map((r, i) => `<figure><img src="${r.data}" alt="${h(r.name)}"><button type="button" aria-label="Убрать ${h(r.name)}" data-rm="${i}">×</button></figure>`).join('');
  $('#refs').querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); state.refs.splice(+b.dataset.rm, 1); drawRefs(); }));
}

const form = $('#briefForm'), dur = form.duration;
dur.addEventListener('input', () => $('#durLabel').textContent = `${dur.value} с`);
function msg(t, err) { const m = $('#formMsg'); m.textContent = t; m.className = 'formmsg' + (err ? ' err' : ''); }
form.addEventListener('submit', async e => {
  e.preventDefault();
  const voices = {}; document.querySelectorAll('[data-vlang]').forEach(i => { if (i.value.trim()) voices[i.dataset.vlang] = i.value.trim(); });
  const body = { topic: form.topic.value, languages: langs(), format: state.format, duration: +dur.value, theme: state.theme, voices, notes: form.notes.value,
    captions: form.captions.checked, autoRender: form.autoRender.checked, engine: form.engine.value, refs: state.refs };
  $('#sendBtn').disabled = true; msg('Отправляю…');
  try {
    const job = await api('/api/jobs', { method: 'POST', body });
    state.selected = job.id; LS.set('job', job.id);
    form.topic.value = ''; form.notes.value = ''; state.refs = []; drawRefs();
    msg(body.engine === 'cli' ? 'Claude CLI уже пишет раскадровку.' : state.status?.claude.watching ? 'Claude получил бриф.' : 'Бриф сохранён. Напиши Claude в чате: «проверь tvhead-приложение».');
    await refreshJobs(); await refreshDetail();
  } catch (err) { msg(err.message, true); }
  $('#sendBtn').disabled = false;
});

// voices dialog
const dlg = $('#voiceDlg');
async function openVoices(lang) {
  dlg.dataset.lang = lang; $('#vLang').textContent = lang.toUpperCase(); $('#vQuery').value = ''; dlg.showModal(); searchVoices();
}
async function searchVoices() {
  const ul = $('#vList'); ul.innerHTML = '<li>Ищу…</li>';
  try {
    const list = await api(`/api/voices?lang=${dlg.dataset.lang}&q=${encodeURIComponent($('#vQuery').value)}`);
    ul.innerHTML = list.length ? list.map(v => `<li><span>${h(v.title)}<small>${h(v.tags.join(', '))}</small></span>
      <a href="https://fish.audio/m/${h(v.id)}" target="_blank" rel="noopener">слушать</a><button type="button" class="btn" data-use="${h(v.id)}">Взять</button></li>`).join('') : '<li>Ничего не нашлось</li>';
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
      <span class="t">${h(j.topic || j.id)}</span><span class="chip ${j.status}">${STATUS_RU[j.status] || j.status}</span> <small>${(j.languages || []).join('+').toUpperCase()}</small></button>`).join('');
  $('#jobs').querySelectorAll('.job').forEach(b => b.addEventListener('click', () => { state.selected = b.dataset.id; LS.set('job', state.selected); state.editing = false; refreshJobs(); refreshDetail(true); }));
}

let lastSig = '';
async function refreshDetail(force) {
  if (!state.selected) return;
  let j; try { j = await api(`/api/jobs/${state.selected}`); } catch { return; }
  const sig = JSON.stringify([j.status, j.updatedAt, j.progress?.done, j.storyboard?.scenes?.map(s => s.thumb)]);
  if (!force && sig === lastSig) return;
  if (state.editing && j.status === 'storyboard' && !force) return;   // don't wipe textareas while the user types
  lastSig = sig;
  const d = $('#detail'), step = STEP_OF[j.status];
  let html = `<div class="dhead"><div><h2>${h(j.brief?.topic || j.id)}</h2>
      <div class="meta">${h(j.id)} · ${(j.brief?.languages || []).join(' + ').toUpperCase()} · ${h(j.storyboard?.format || j.brief?.format || '16:9')} · ~${j.brief?.duration || '?'} с · стиль: ${h(j.brief?.theme || 'paper')}${j.brief?.refs?.length ? ` · референсов: ${j.brief.refs.length}` : ''}</div></div>
      <span class="chip ${j.status}">${STATUS_RU[j.status] || j.status}</span></div>
    <ol class="steps">${STEPS.map(([k, label], i) => `<li class="step ${i < step || j.status === 'done' ? 'done' : i === step ? 'now' : ''}">${label}</li>`).join('')}</ol>`;

  if (j.status === 'brief' || j.status === 'revise' || j.status === 'storyboarding') {
    const listening = state.status?.claude.watching, cli = j.brief?.engine === 'cli';
    const text = j.status === 'storyboarding' ? 'Claude пишет сценарий и раскадровку…'
      : listening || cli ? (j.status === 'revise' ? 'Claude получил правки и переделывает раскадровку…' : 'Claude получил бриф и скоро начнёт…')
      : 'Бриф ждёт Claude. Напиши ему в чате: «проверь tvhead-приложение» — он увидит задание и возьмёт его в работу.';
    html += `<div class="wait">${tvSvg()}<div><b>${h(text)}</b>${j.history?.length ? `<div class="meta">${h(j.history[j.history.length - 1].msg)}</div>` : ''}</div></div>`;
  }
  if (j.storyboard && ['storyboard', 'rendering', 'done', 'revise', 'error'].includes(j.status)) html += boardHtml(j);
  if (j.status === 'storyboard') html += `<div class="actions">
      <button class="btn primary big" style="width:auto" id="goRender">Рендерить ▶</button>
      <button class="btn" id="saveText" hidden>Сохранить текст и перерисовать</button>
      <div class="fb"><textarea id="fbText" rows="2" placeholder="Правки для Claude: «сцена 3 мрачнее», «добавь график», «концовка короче»…"></textarea>
      <button class="btn" id="sendFb">Отправить правки Claude</button></div></div>`;
  if (j.status === 'rendering') html += renderProgress(j);
  if (j.status === 'done' || (j.outputs && Object.keys(j.outputs).length)) html += videosHtml(j);
  if (j.status === 'error') html += `<p class="err"><b>Ошибка:</b> ${h(j.error || '')}</p><button class="btn" id="retry">Повторить</button>`;
  d.innerHTML = html;

  $('#goRender')?.addEventListener('click', async () => { await api(`/api/jobs/${j.id}/approve`, { method: 'POST' }); state.editing = false; refreshDetail(true); refreshJobs(); });
  $('#sendFb')?.addEventListener('click', async () => { const t = $('#fbText').value.trim(); if (!t) return; await api(`/api/jobs/${j.id}/feedback`, { method: 'POST', body: { text: t } }); state.editing = false; refreshDetail(true); refreshJobs(); });
  $('#retry')?.addEventListener('click', async () => { await api(`/api/jobs/${j.id}/retry`, { method: 'POST' }); refreshDetail(true); });
  d.querySelectorAll('textarea[data-scene]').forEach(t => t.addEventListener('input', () => { state.editing = true; $('#saveText').hidden = false; }));
  $('#fbText')?.addEventListener('input', () => state.editing = true);
  $('#saveText')?.addEventListener('click', async () => {
    const scenes = {};
    d.querySelectorAll('textarea[data-scene]').forEach(t => { (scenes[t.dataset.scene] ||= { i: +t.dataset.scene, say: {} }).say[t.dataset.lang] = t.value; });
    await api(`/api/jobs/${j.id}/narration`, { method: 'POST', body: { scenes: Object.values(scenes) } }); state.editing = false; refreshDetail(true);
  });
}
const fmt = s => s == null ? '' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function boardHtml(j) {
  const sb = j.storyboard, editable = j.status === 'storyboard';
  return `<h3>Раскадровка · ${sb.scenes.length} сцен${sb.duration ? ` · ${fmt(sb.duration)}` : ''}</h3><div class="board${sb.format === '9:16' ? ' tall' : ''}">${sb.scenes.map(s => `
    <article class="scene">
      <div class="img">${s.thumb ? `<img src="${s.thumb}" alt="Кадр сцены ${s.i + 1}" loading="lazy">` : ''}<span class="num">#${s.i + 1} ${fmt(s.from)}</span>
        ${s.transition ? `<span class="chip tr" title="переход в эту сцену">${h(TR_RU[s.transition] || s.transition)}</span>` : ''}</div>
      <div class="body">${s.note ? `<div class="note">${h(s.note)}</div>` : ''}
        ${sb.languages.map(l => editable ? `<label>${l.toUpperCase()}<textarea data-scene="${s.i}" data-lang="${l}" rows="2">${h(s.say[l])}</textarea></label>` : `<div><label>${l.toUpperCase()}</label><div>${h(s.say[l])}</div></div>`).join('')}
      </div></article>`).join('')}</div>`;
}
function renderProgress(j) {
  const p = j.progress || {}, langs = j.storyboard?.languages || j.brief?.languages || ['en'];
  const stageRU = { voice: 'озвучка', timeline: 'таймлайн', frames: 'кадры', audio: 'звук', done: 'готово' };
  return `<div class="bars">${langs.map(l => {
    const done = j.outputs?.[l], cur = p.lang === l;
    const pct = done ? 100 : cur ? (p.stage === 'frames' ? 10 + 80 * p.done / p.total : p.stage === 'audio' ? 95 : 5) : 0;
    return `<div><div class="meta">${l.toUpperCase()} · ${done ? 'готово' : cur ? stageRU[p.stage] || p.stage : 'в очереди'}${cur && p.stage === 'frames' ? ` ${p.done}/${p.total}` : ''}</div>
      <div class="bar" role="progressbar" aria-valuenow="${pct | 0}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct.toFixed(1)}%"></i></div></div>`;
  }).join('')}</div>`;
}
function videosHtml(j) {
  const outs = Object.values(j.outputs || {});
  if (!outs.length) return '';
  return `<h3>Готовые видео</h3><div class="videos">${outs.map(o => `<figure${o.height > o.width ? ' class="tall"' : ''}>
    <video controls preload="metadata" src="/files/${h(o.file)}#t=1.5"></video>
    <figcaption><b>${o.lang.toUpperCase()}</b> <span class="meta">${o.width}×${o.height} · ${fmt(o.duration)} · ${o.mb} МБ${o.silentLines ? ' · без голоса (нет ключа)' : ''}</span>
      <span><a href="/files/${h(o.file)}" download>mp4</a> · <a href="/files/${h(o.file.replace(/\.mp4$/, '.srt'))}" download>srt</a></span></figcaption></figure>`).join('')}</div>`;
}
function tvSvg() {
  return `<svg class="tv" viewBox="0 0 64 58" aria-hidden="true"><path d="M24 12 18 2M40 12l6-10" stroke="#141414" stroke-width="4" stroke-linecap="round"/><rect x="4" y="12" width="56" height="44" rx="8" fill="#585858" stroke="#141414" stroke-width="4"/><rect class="scr" x="12" y="19" width="40" height="30" rx="5" fill="#e9ebeb" stroke="#141414" stroke-width="3"/><circle cx="25" cy="31" r="3" fill="#141414"/><circle cx="39" cy="31" r="3" fill="#141414"/></svg>`;
}

// ─── boot ───────────────────────────────────────────────────────
setLang(state.lang);
setFormat(state.format);
loadThemes();
refreshStatus(); refreshJobs().then(() => refreshDetail(true));
setInterval(refreshStatus, 4000);
setInterval(refreshJobs, 3000);
setInterval(() => refreshDetail(false), 1500);
