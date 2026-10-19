// Job store shared by the app server and the Claude bridge. A job IS an episode folder with a job.json next to story.json:
//   episodes/<id>/job.json   { id, status, createdAt, updatedAt, brief, history:[{t,status,msg}], progress, outputs, error }
//   episodes/<id>/brief.json the user's brief (topic, languages, format, duration, theme, voices, notes, refs, autoRender, captions, engine)
//   episodes/<id>/refs/*     uploaded reference images
// Status flow: brief → storyboarding → storyboard → rendering → done   (feedback: storyboard → revise → storyboarding …; error at any step)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EPISODES = path.join(STUDIO, 'episodes');
export const APP_STATE = path.join(STUDIO, '.app.json');          // written by the running server: { pid, port, url, startedAt }
export const HEARTBEAT = path.join(STUDIO, '.claude-heartbeat');  // touched by `bridge.mjs wait` while a Claude session listens
export const STATUSES = ['brief', 'storyboarding', 'storyboard', 'revise', 'rendering', 'done', 'error'];

export function writeJson(file, obj) { const tmp = file + '.tmp'; writeFileSync(tmp, JSON.stringify(obj, null, 2)); renameSync(tmp, file); }
export function readJson(file, def = null) { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return def; } }

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export function slugify(topic) {
  const s = String(topic || 'video').toLowerCase().replace(/[а-яё]/g, c => TR[c] ?? '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const base = s.split('-').filter(w => w.length > 2).slice(0, 4).join('-') || 'video';
  let id = base, n = 2;
  while (existsSync(path.join(EPISODES, id))) id = `${base}-${n++}`;
  return id;
}

export const jobDir = id => path.join(EPISODES, id);
export function getJob(id) {
  if (!/^[\w-]+$/.test(id)) return null;
  return readJson(path.join(jobDir(id), 'job.json'));
}
export function saveJob(job) { job.updatedAt = new Date().toISOString(); writeJson(path.join(jobDir(job.id), 'job.json'), job); return job; }
export function setStatus(id, status, msg = '', extra = {}) {
  const job = getJob(id); if (!job) throw new Error(`no job ${id}`);
  if (!STATUSES.includes(status)) throw new Error(`bad status ${status}`);
  job.status = status; Object.assign(job, extra);
  job.history = [...(job.history || []), { t: new Date().toISOString(), status, msg }].slice(-40);
  return saveJob(job);
}
export function listJobs() {
  if (!existsSync(EPISODES)) return [];
  return readdirSync(EPISODES).filter(d => !d.startsWith('_') && existsSync(path.join(EPISODES, d, 'job.json')))
    .map(d => getJob(d)).filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function createJob(brief, refs = []) {
  const id = slugify(brief.topic);
  const dir = jobDir(id); mkdirSync(path.join(dir, 'refs'), { recursive: true });
  const names = [];
  for (const r of refs) {
    const name = String(r.name || 'ref.png').replace(/[^\w.-]+/g, '_').slice(-60);
    const m = String(r.data || '').match(/^data:([^;]+);base64,(.*)$/);
    const buf = Buffer.from(m ? m[2] : r.data || '', 'base64');
    if (buf.length > 25 * 1048576) throw new Error(`${name}: file over 25 MB`);
    writeFileSync(path.join(dir, 'refs', name), buf); names.push(`refs/${name}`);
  }
  const b = { ...brief, refs: names, createdAt: new Date().toISOString() };
  writeJson(path.join(dir, 'brief.json'), b);
  const job = { id, status: 'brief', createdAt: b.createdAt, brief: b, history: [{ t: b.createdAt, status: 'brief', msg: 'Бриф отправлен' }] };
  saveJob(job);
  return job;
}

export function claudeWatching() {
  try { return Date.now() - statSync(HEARTBEAT).mtimeMs < 25000; } catch { return false; }
}
export function appState() {
  const s = readJson(APP_STATE);
  if (!s) return null;
  try { process.kill(s.pid, 0); return s; } catch { return null; }   // stale file from a crashed server
}
