#!/usr/bin/env node
// tvhead studio app — local web UI for briefs, storyboards and renders.  node app/server.mjs  →  http://localhost:4777
// Claude sees the app through files (.app.json, episodes/<id>/job.json) and the bridge: `node app/bridge.mjs status|wait|…`.
// Listens on 127.0.0.1 only. No dependencies beyond Node.
import '../lib/net.mjs';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync, readFileSync, writeFileSync, mkdirSync, rmSync, unlinkSync, copyFileSync, createWriteStream } from 'node:fs';
import path from 'node:path';
import { STUDIO, EPISODES, APP_STATE, getJob, saveJob, setStatus, listJobs, createJob, claudeWatching, jobDir, readJson, writeJson } from './jobs.mjs';
import { THEMES, localize, storyLanguages, resolveFormat } from '../lib/story.mjs';
import { DEFAULT_VOICES, provider } from '../lib/voice.mjs';
import { listLibrary, addLibraryItem, updateLibraryItem, deleteLibraryItem, attachToJob } from './library.mjs';
import { PARTS, PARTS_EN } from '../lib/parts.mjs';

const PORT = +(process.env.TVHEAD_PORT || 4777), VERSION = '2.4.0';
// .env (same loader as make.mjs) so the key status is accurate
const envFile = path.join(STUDIO, '.env');
if (existsSync(envFile)) for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const HAS_CLAUDE_CLI = !spawnSync(process.platform === 'win32' ? 'where' : 'which', ['claude']).status;
const running = new Map();   // id → child process (render / claude)

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.srt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.log': 'text/plain; charset=utf-8' };
const SERVE_ROOTS = ['episodes', 'out', 'app/ui', 'app/thumbs', 'fonts', 'library'].map(d => path.join(STUDIO, d) + path.sep);

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
function serveFile(req, res, rel) {
  const file = path.resolve(STUDIO, decodeURIComponent(rel));
  if (!SERVE_ROOTS.some(r => file.startsWith(r)) || !existsSync(file) || !statSync(file).isFile()) return send(res, 404, { error: 'not found' });
  const size = statSync(file).size, type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
  if (range) {   // video seeking
    const a = range[1] ? +range[1] : 0, b = range[2] ? Math.min(+range[2], size - 1) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 });
    return createReadStream(file, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}
function body(req) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > 120 * 1048576) { reject(new Error('request too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); } });
  });
}

// ─── storyboard view of a job: scenes with narration per language, transition, thumbnail ─────────
function storyboard(id, ui) {   // ui: interface language for notes / names (falls back to the first narration language)
  const story = readJson(path.join(jobDir(id), 'story.json'));
  if (!story) return null;
  const langs = storyLanguages(story), first = langs[0];
  const stillsDir = `episodes/${id}/build/${first}/stills`;
  const tl = (() => { try { const s = readFileSync(path.join(jobDir(id), 'build', first, 'timeline.js'), 'utf8'); return JSON.parse(s.split('window.TL = ')[1].replace(/;\s*$/, '')); } catch { return null; } })();
  return {
    title: localize(story.title, first) || id, languages: langs, format: (() => { try { return resolveFormat(story.format).id; } catch { return '16:9'; } })(), theme: typeof story.theme === 'object' ? story.theme.preset || 'custom' : story.theme || (story.look === 'cartoon' ? 'garage' : 'paper'), look: story.look || 'doodle',
    mood: story.mood || 'dark', duration: tl?.duration ?? null,
    cast: (() => {   // model sheet written by "make.mjs <id> --cast" (characters + environments Claude designed)
      const cj = readJson(path.join(jobDir(id), 'build', 'cast', 'cast.json'));
      const chars = Object.entries(story.characters || {}).filter(([k]) => k !== '*').map(([k, c]) => ({ id: k, name: localize(c.name, ui || first) || k, desc: localize(c.desc, ui || first) || '' }));
      if (!cj && !chars.length) return null;
      const v = cj ? statSync(path.join(STUDIO, cj.sheet)).mtimeMs | 0 : 0;
      return { characters: chars, items: cj?.items || [], frames: (cj?.frames || []).map(f => `/files/${f}?v=${v}`) };
    })(),
    scenes: story.scenes.map((s, i) => ({
      i, note: localize(s.note, ui || first) || '', say: Object.fromEntries(langs.map(l => [l, localize(s.say, l) || ''])),
      transition: i === 0 ? null : (typeof s.transition === 'object' ? s.transition?.type : s.transition) || (s.keep ? 'none' : story.transition || 'curve'),
      layout: s.layout || null, keep: !!s.keep, cam: typeof s.cam === 'string' ? s.cam : s.cam ? 'focus' : 'push',
      from: tl?.scenes[i]?.from ?? null, to: tl?.scenes[i]?.to ?? null,
      thumb: existsSync(path.join(STUDIO, stillsDir, `s_${String(i).padStart(3, '0')}.png`)) ? `/files/${stillsDir}/s_${String(i).padStart(3, '0')}.png?v=${statSync(path.join(STUDIO, stillsDir, `s_${String(i).padStart(3, '0')}.png`)).mtimeMs | 0}` : null,
    })),
  };
}

// ─── run make.mjs with --json and mirror its progress into job.json ─────────────────────────────
function runMake(id, args, { onDone } = {}) {
  const log = createWriteStream(path.join(jobDir(id), 'make.log'), { flags: 'a' });
  const p = spawn(process.execPath, [path.join(STUDIO, 'make.mjs'), id, '--json', ...args], { cwd: STUDIO });
  running.set(id, p);
  let buf = '', last = 0, err = '';
  const onLine = line => {
    log.write(line + '\n');
    if (!line.startsWith('@@')) { if (line.includes('✗')) err = line.replace(/^.*✗\s*/, ''); return; }
    let ev; try { ev = JSON.parse(line.slice(2)); } catch { return; }
    const job = getJob(id); if (!job) return;
    if (ev.stage === 'frames' && Date.now() - last < 700) return; last = Date.now();
    job.progress = { ...ev, at: Date.now() };
    if (ev.stage === 'done') job.outputs = { ...(job.outputs || {}), [ev.lang]: ev };
    if (ev.stage === 'error') job.error = ev.message;
    saveJob(job);
  };
  const feed = d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { onLine(buf.slice(0, i).replace(/\r/g, '')); buf = buf.slice(i + 1); } };
  p.stdout.on('data', feed); p.stderr.on('data', feed);
  p.on('exit', code => { running.delete(id); log.end(); onDone && onDone(code, err); });
  return p;
}
function startRender(id) {
  const job = getJob(id);
  if (!job || running.has(id)) return job;
  setStatus(id, 'rendering', 'Рендер запущен', { progress: null, error: null, outputs: {} });
  runMake(id, [], { onDone: (code, err) => code === 0 ? setStatus(id, 'done', 'Видео готово') : setStatus(id, 'error', 'Рендер упал', { error: err || `make.mjs exited ${code}` }) });
  return getJob(id);
}
function restill(id, next = 'storyboard') {
  const story = readJson(path.join(jobDir(id), 'story.json')); if (!story) return;
  runMake(id, ['--stills', 'auto', '--lang', storyLanguages(story)[0]], { onDone: (code, err) => {
    if (code !== 0) return setStatus(id, 'error', 'Не удалось отрисовать раскадровку', { error: err });
    if (story.characters || story.set || story.scenes.some(sc => sc.set)) runMake(id, ['--cast', '--offline'], { onDone: () => setStatus(id, next, 'Кадры раскадровки обновлены') });
    else setStatus(id, next, 'Кадры раскадровки обновлены');
  } });
}

// ─── autonomous mode: the app asks Claude Code (headless) to write the storyboard ───────────────
function startClaudeCli(id, feedback) {
  if (!HAS_CLAUDE_CLI || running.has(id)) return false;
  const prompt = `Use the tvhead-video skill. You are processing a job from the tvhead studio app in ${STUDIO}.
Job id: ${id}. ${feedback ? `The user sent storyboard feedback: "${feedback}". Revise episodes/${id}/story.json accordingly.` : `Read episodes/${id}/brief.json (and any images in episodes/${id}/refs/) and write episodes/${id}/story.json.`}
Follow SKILL.md section "App jobs": claim with \`node app/bridge.mjs claim ${id}\`, design the cast and world (story "characters" + scene "set", see references/cast-and-world.md; use the brief's castIdeas / worldIdeas / libraryItems images, invent the rest by meaning), write the story (every scene gets a "note"; say as {"en","ru"} for each language in the brief; copy the brief's "format" and "look" into story.json, and "music" unless it is "auto" ("none" → "music": false)), then run \`node app/bridge.mjs storyboard ${id}\` and look at the sheet it prints; fix obvious problems once. Do not render the final video — the app does that after the user approves.`;
  const log = createWriteStream(path.join(jobDir(id), 'claude.log'), { flags: 'a' });
  const p = spawn('claude', ['-p', '--permission-mode', 'acceptEdits', '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash(node:*)'],
    { cwd: STUDIO, shell: process.platform === 'win32', env: { ...process.env } });
  running.set(id, p);
  p.stdin.end(prompt);
  p.stdout.pipe(log); p.stderr.pipe(log);
  setStatus(id, 'storyboarding', 'Claude CLI пишет раскадровку');
  p.on('exit', code => { running.delete(id); const j = getJob(id); if (j && j.status === 'storyboarding') setStatus(id, 'error', 'Claude CLI завершился без раскадровки', { error: `exit ${code}, see claude.log` }); });
  return true;
}

// ─── theme thumbnails (rendered once with the real engine) ─────────────────────────────────────
async function ensureThumbs() {
  const dir = path.join(STUDIO, 'app', 'thumbs'); mkdirSync(dir, { recursive: true });
  for (const name of Object.keys(THEMES)) {
    const out = path.join(dir, `${name}.png`); if (existsSync(out)) continue;
    const ep = `_theme_${name}`, epd = path.join(EPISODES, ep); mkdirSync(epd, { recursive: true });
    writeJson(path.join(epd, 'story.json'), { theme: name, transition: 'cut', ...(name === 'garage' ? { look: 'cartoon', set: 'garage' } : {}), scenes: [{ say: 'Hello there, this is a style preview.', layout: 'lineup', count: 3,
      props: [{ type: 'heart', x: 1060, y: 190, scale: .8 }, { type: 'text', text: name, x: 300, y: 150, size: 64, enter: 'none' }] }] });
    await new Promise(r => spawn(process.execPath, [path.join(STUDIO, 'make.mjs'), ep, '--stills', '2.4', '--offline', '--lang', 'en'], { cwd: STUDIO, stdio: 'ignore' }).on('exit', r));
    const still = path.join(epd, 'build', 'en', 'stills', 's_000.png');
    if (existsSync(still)) spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', still, '-vf', 'scale=480:-1', out]);
    rmSync(epd, { recursive: true, force: true });
  }
}

let voiceCache = {};
async function voices(lang, q) {
  const key = lang; let items = voiceCache[key]?.t > Date.now() - 600000 ? voiceCache[key].items : null;
  if (!items) {
    const j = await (await fetch(`https://api.fish.audio/model?page_size=100&language=${lang}&sort_by=task_count`, { signal: AbortSignal.timeout(15000) })).json();
    items = (j.items || []).map(m => ({ id: m._id, title: m.title, tags: (m.tags || []).slice(0, 8), uses: m.task_count }));
    voiceCache[key] = { t: Date.now(), items };
  }
  const ws = String(q || 'narration').toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(v => ws.every(w => `${v.title} ${v.tags.join(' ')}`.toLowerCase().includes(w))).slice(0, 30);
}

// ─── HTTP ────────────────────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), p = url.pathname, M = req.method;
  try {
    if (M === 'GET' && (p === '/' || p === '/index.html')) return serveFile(req, res, 'app/ui/index.html');
    if (M === 'GET' && p.startsWith('/ui/')) return serveFile(req, res, 'app' + p);
    if (M === 'GET' && p.startsWith('/files/')) return serveFile(req, res, p.slice(7));
    if (M === 'GET' && p === '/api/status') {
      const jobs = listJobs();
      return send(res, 200, { ok: true, version: VERSION, studio: STUDIO, tts: provider() || null, claude: { watching: claudeWatching(), cli: HAS_CLAUDE_CLI },
        defaults: { voices: DEFAULT_VOICES }, counts: Object.fromEntries(['brief', 'storyboarding', 'storyboard', 'revise', 'rendering', 'done', 'error'].map(s => [s, jobs.filter(j => j.status === s).length])) });
    }
    if (M === 'GET' && p === '/api/themes') return send(res, 200, Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label, paper: t.paper, ink: t.ink, accent: t.accent,
      thumb: existsSync(path.join(STUDIO, 'app', 'thumbs', `${id}.png`)) ? `/files/app/thumbs/${id}.png` : null })));
    if (M === 'GET' && p === '/api/voices') return send(res, 200, await voices(url.searchParams.get('lang') || 'en', url.searchParams.get('q')));
    if (M === 'GET' && p === '/api/library') return send(res, 200, listLibrary());
    if (M === 'GET' && p === '/api/parts') return send(res, 200, url.searchParams.get('lang') === 'en' ? PARTS_EN : PARTS);
    if (M === 'POST' && p === '/api/library') return send(res, 200, addLibraryItem(await body(req)));
    const lm = p.match(/^\/api\/library\/([\w-]+)(?:\/(delete))?$/);
    if (M === 'POST' && lm) return send(res, 200, lm[2] ? { ok: deleteLibraryItem(lm[1]) } : updateLibraryItem(lm[1], await body(req)));
    if (M === 'POST' && p === '/api/shutdown') { send(res, 200, { ok: true }); setTimeout(bye, 200); return; }
    if (M === 'GET' && p === '/api/jobs') return send(res, 200, listJobs().map(j => ({ id: j.id, status: j.status, topic: j.brief?.topic, languages: j.brief?.languages, createdAt: j.createdAt, updatedAt: j.updatedAt, progress: j.progress })));
    const m = p.match(/^\/api\/jobs\/([\w-]+)(?:\/(\w+))?$/);
    if (M === 'POST' && p === '/api/jobs') {
      const b = await body(req);
      if (!String(b.topic || '').trim()) return send(res, 400, { error: 'A topic is required', code: 'topic_required' });
      const langs = (b.languages || ['en']).filter(l => ['en', 'ru'].includes(l));
      const brief = { topic: String(b.topic).trim().slice(0, 2000), languages: langs.length ? langs : ['en'], format: b.format === '9:16' ? '9:16' : '16:9', duration: Math.min(300, Math.max(15, +b.duration || 60)),
        theme: THEMES[b.theme] ? b.theme : b.theme === 'reference' ? 'reference' : 'paper', voices: b.voices || {}, notes: String(b.notes || '').slice(0, 4000),
        look: b.look === 'cartoon' ? 'cartoon' : 'doodle', music: ['lofi', 'ambient', 'upbeat', 'none'].includes(b.music) ? b.music : 'auto',
        captions: !!b.captions, autoRender: !!b.autoRender, engine: b.engine === 'cli' ? 'cli' : 'session',
        castIdeas: String(b.castIdeas || '').slice(0, 3000), worldIdeas: String(b.worldIdeas || '').slice(0, 3000), invent: b.invent !== false, uiLang: b.uiLang === 'ru' ? 'ru' : 'en' };
      const job = createJob(brief, Array.isArray(b.refs) ? b.refs.slice(0, 8) : []);
      if (Array.isArray(b.library) && b.library.length) {   // chosen library cards → copied into the job, snapshot in the brief
        const items = attachToJob(job.id, b.library.slice(0, 12)), file = path.join(jobDir(job.id), 'brief.json'), br = readJson(file);
        br.libraryItems = items; writeJson(file, br); const j = getJob(job.id); j.brief = br; saveJob(j);
      }
      if (brief.engine === 'cli') startClaudeCli(job.id);
      return send(res, 200, getJob(job.id));
    }
    if (m) {
      const [, id, action] = m, job = getJob(id);
      if (!job) return send(res, 404, { error: 'No such job', code: 'job_not_found' });
      if (M === 'GET' && !action) return send(res, 200, { ...job, storyboard: storyboard(id, ['en', 'ru'].includes(url.searchParams.get('ui')) ? url.searchParams.get('ui') : null), running: running.has(id) });
      if (M === 'POST' && action === 'approve') return send(res, 200, startRender(id));
      if (M === 'POST' && action === 'feedback') {
        const b = await body(req), text = String(b.text || '').trim();
        if (!text) return send(res, 400, { error: 'The notes are empty', code: 'empty_feedback' });
        job.feedback = [...(job.feedback || []), { t: new Date().toISOString(), text }]; saveJob(job);
        setStatus(id, 'revise', 'Правки отправлены Claude');
        if (job.brief?.engine === 'cli') startClaudeCli(id, text);
        return send(res, 200, getJob(id));
      }
      if (M === 'POST' && action === 'narration') {   // inline narration edits from the storyboard: { scenes: [{ i, say: { en, ru } }] }
        const b = await body(req), file = path.join(jobDir(id), 'story.json'), story = readJson(file);
        if (!story) return send(res, 400, { error: 'This job has no story.json yet', code: 'no_story' });
        for (const e of b.scenes || []) if (story.scenes[e.i]) story.scenes[e.i].say = typeof story.scenes[e.i].say === 'object' || Object.keys(e.say).length > 1 ? { ...(typeof story.scenes[e.i].say === 'object' ? story.scenes[e.i].say : {}), ...e.say } : Object.values(e.say)[0];
        writeJson(file, story); setStatus(id, 'storyboarding', 'Текст обновлён, перерисовываю кадры'); restill(id);
        return send(res, 200, getJob(id));
      }
      if (M === 'POST' && action === 'retry') { if (getJob(id).status === 'error') setStatus(id, existsSync(path.join(jobDir(id), 'story.json')) ? 'storyboard' : 'brief', 'Повтор'); return send(res, 200, getJob(id)); }
      if (M === 'POST' && action === 'cancel') { const pr = running.get(id); if (pr) pr.kill(); setStatus(id, 'error', 'Остановлено пользователем', { error: 'cancelled' }); return send(res, 200, getJob(id)); }
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, e.code ? 400 : 500, { error: e.message, code: e.code }); }
});

server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `port ${PORT} is busy — the app is probably already running: http://localhost:${PORT}` : e.message); process.exit(1); });
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  writeJson(APP_STATE, { pid: process.pid, port: PORT, url, startedAt: new Date().toISOString(), version: VERSION });
  console.log(`tvhead studio → ${url}\n  TTS: ${provider() || 'no key (narration will be silent)'} · Claude CLI: ${HAS_CLAUDE_CLI ? 'yes' : 'no'}\n  Claude session: run "node app/bridge.mjs wait" (the skill does this) — the header shows when Claude is listening.`);
  if (process.argv.includes('--open')) spawn(process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open', process.platform === 'win32' ? ['/c', 'start', '', url] : [url], { stdio: 'ignore', detached: true }).unref();
  ensureThumbs().catch(e => console.warn('thumbs:', e.message));
});
const bye = () => { try { if (readJson(APP_STATE)?.pid === process.pid) unlinkSync(APP_STATE); } catch {} process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
