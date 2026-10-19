#!/usr/bin/env node
// Claude ↔ app bridge. Works on the job files directly (the server does not have to be running for most commands).
//   node app/bridge.mjs status                 is the app running? key? jobs waiting for Claude
//   node app/bridge.mjs wait [--timeout 1800]  block until a brief/revision is waiting, print it as JSON, exit 0 (exit 2 on timeout).
//                                              While waiting it keeps .claude-heartbeat fresh → the app header shows "Claude на связи".
//   node app/bridge.mjs show <id>              job + brief + feedback + absolute paths of reference images
//   node app/bridge.mjs claim <id>             mark "Claude is writing the storyboard"
//   node app/bridge.mjs storyboard <id>        validate story.json, render the storyboard stills, hand it to the user for review
//                                              (or straight to render when the brief has autoRender)
//   node app/bridge.mjs render <id>            start the final render (through the app if it runs, else directly)
//   node app/bridge.mjs fail <id> "message"    report a problem to the user
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { STUDIO, HEARTBEAT, getJob, setStatus, listJobs, appState, claudeWatching, jobDir, readJson } from './jobs.mjs';
import { storyLanguages } from '../lib/story.mjs';

const [cmd, id, ...rest] = process.argv.slice(2);
const out = o => console.log(JSON.stringify(o, null, 2));
const die = (m, code = 1) => { console.error(`✗ ${m}`); process.exit(code); };
const need = () => { if (!id) die(`usage: bridge.mjs ${cmd} <id>`); const j = getJob(id); if (!j) die(`no job "${id}"`); return j; };
const beat = () => writeFileSync(HEARTBEAT, String(Date.now()));
const pending = () => listJobs().filter(j => j.status === 'brief' || j.status === 'revise').reverse();   // oldest first

function details(j) {
  const dir = jobDir(j.id);
  return { id: j.id, status: j.status, dir, brief: readJson(path.join(dir, 'brief.json')), feedback: j.feedback || [],
    refs: existsSync(path.join(dir, 'refs')) ? readdirSync(path.join(dir, 'refs')).filter(f => f !== 'library').map(f => path.join(dir, 'refs', f)) : [],
    // the user's cast & world ideas: library cards (absolute image paths — Read them) + free-text ideas
    castAndWorld: (() => {
      const b = readJson(path.join(dir, 'brief.json')) || {};
      return { castIdeas: b.castIdeas || '', worldIdeas: b.worldIdeas || '', inventTheRest: b.invent !== false,
        library: (b.libraryItems || []).map(it => ({ ...it, images: it.images.map(f => path.join(dir, f)) })),
        how: 'design story "characters" and scene "set"/"weather" from these (references/cast-and-world.md); invent what is missing by the meaning of the topic' };
    })(),
    story: existsSync(path.join(dir, 'story.json')) ? path.join(dir, 'story.json') : null,
    next: j.status === 'revise' ? `apply the latest feedback to story.json, then: node app/bridge.mjs storyboard ${j.id}` : `node app/bridge.mjs claim ${j.id}  → write ${path.join(dir, 'story.json')} → node app/bridge.mjs storyboard ${j.id}` };
}

async function api(pathname, method = 'GET') {
  const s = appState(); if (!s) return null;
  try { const r = await fetch(s.url + pathname, { method, signal: AbortSignal.timeout(5000) }); return r.ok ? r.json() : null; } catch { return null; }
}

switch (cmd) {
  case 'status': {
    const s = appState(), st = s ? await api('/api/status') : null;
    out({ app: s ? { running: true, url: s.url, since: s.startedAt } : { running: false, start: 'node app/server.mjs --open  (or start-app.cmd / start-app.sh)' },
      tts: st?.tts ?? null, claudeListening: claudeWatching(),
      waiting: pending().map(j => ({ id: j.id, status: j.status, topic: j.brief?.topic, languages: j.brief?.languages })),
      recent: listJobs().slice(0, 6).map(j => ({ id: j.id, status: j.status, topic: j.brief?.topic })) });
    break;
  }
  case 'wait': {
    const ti = rest.indexOf('--timeout'), limit = (ti >= 0 ? +rest[ti + 1] : +(id === '--timeout' ? rest[0] : 1800)) * 1000, t0 = Date.now();
    while (true) {
      beat();
      const p = pending();
      if (p.length) { out(details(p[0])); process.exit(0); }
      if (Date.now() - t0 > limit) die('no brief arrived (timeout) — run wait again to keep listening', 2);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  case 'show': out(details(need())); break;
  case 'claim': { const j = need(); setStatus(j.id, 'storyboarding', 'Claude пишет раскадровку'); beat(); console.log(`claimed ${j.id} → write ${path.join(jobDir(j.id), 'story.json')}`); break; }
  case 'storyboard': {
    const j = need(), file = path.join(jobDir(j.id), 'story.json');
    const story = readJson(file); if (!story) die(`${file} missing or not valid JSON`);
    const brief = readJson(path.join(jobDir(j.id), 'brief.json')) || {};
    if (brief.format && !story.format) { story.format = brief.format; writeFileSync(file, JSON.stringify(story, null, 2)); console.log(`story.format ← brief (${brief.format})`); }
    const lang = storyLanguages(story)[0];
    setStatus(j.id, 'storyboarding', 'Рисую кадры раскадровки');
    const r = spawnSync(process.execPath, [path.join(STUDIO, 'make.mjs'), j.id, '--stills', 'auto', '--lang', lang], { cwd: STUDIO, encoding: 'utf8' });
    process.stdout.write(r.stdout); process.stderr.write(r.stderr);
    if (r.status !== 0) { setStatus(j.id, 'error', 'Раскадровка не собралась', { error: (r.stderr || r.stdout).split('\n').filter(Boolean).pop() }); die('stills failed'); }
    const warnings = (r.stdout + r.stderr).split('\n').filter(l => /story:|warn/i.test(l));
    const sheet = path.join(jobDir(j.id), 'build', lang, 'sheet.png');
    if (story.characters || story.set || story.scenes.some(s => s.set)) {   // model sheet of the cast + environments for the app
      const c = spawnSync(process.execPath, [path.join(STUDIO, 'make.mjs'), j.id, '--cast', '--offline'], { cwd: STUDIO, encoding: 'utf8' });
      console.log(c.status === 0 ? `cast sheet: ${path.join(jobDir(j.id), 'build', 'cast', 'sheet.png')} (Read it too)` : `(cast sheet failed: ${(c.stderr || c.stdout).trim().split('\n').pop()})`);
    }
    if (j.brief?.autoRender) {
      const viaApp = await api(`/api/jobs/${j.id}/approve`, 'POST');
      if (!viaApp) { setStatus(j.id, 'rendering', 'Рендер запущен'); spawn(process.execPath, [path.join(STUDIO, 'make.mjs'), j.id], { cwd: STUDIO, detached: true, stdio: 'ignore' }).unref(); }
      console.log(`storyboard ready, autoRender → rendering. sheet: ${sheet}`);
    } else {
      setStatus(j.id, 'storyboard', 'Раскадровка готова — проверь и нажми «Рендерить»');
      console.log(`storyboard ready for review in the app. Look at the sheet yourself first: ${sheet}`);
    }
    if (warnings.length) console.log('warnings:\n  ' + warnings.join('\n  '));
    break;
  }
  case 'render': {
    const j = need();
    const viaApp = await api(`/api/jobs/${j.id}/approve`, 'POST');
    if (viaApp) { console.log(`rendering in the app: ${appState().url}`); break; }
    setStatus(j.id, 'rendering', 'Рендер запущен из Claude');
    const r = spawnSync(process.execPath, [path.join(STUDIO, 'make.mjs'), j.id], { cwd: STUDIO, stdio: 'inherit' });
    setStatus(j.id, r.status === 0 ? 'done' : 'error', r.status === 0 ? 'Видео готово' : 'Рендер упал');
    break;
  }
  case 'fail': { const j = need(); setStatus(j.id, 'error', rest.join(' ') || 'Ошибка', { error: rest.join(' ') }); break; }
  default: console.log(readFileSync0());
}
function readFileSync0() { return `usage: node app/bridge.mjs status | wait [--timeout s] | show <id> | claim <id> | storyboard <id> | render <id> | fail <id> "msg"`; }
