// "Cast & world" library: the user's own references and ideas for characters, environments and style, reusable across videos.
//   library/library.json  { items: [{ id, kind, title, notes, images: ['library/img/<id>_1.png'], createdAt }] }
//   kind: character | world | style | idea
// When a brief picks items, their images are copied into episodes/<job>/refs/library/ and a snapshot goes into brief.libraryItems.
import { existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { STUDIO, jobDir, readJson, writeJson } from './jobs.mjs';

export const LIB_DIR = path.join(STUDIO, 'library');
const LIB_FILE = path.join(LIB_DIR, 'library.json');
export const KINDS = ['character', 'world', 'style', 'idea'];

export function listLibrary() { return readJson(LIB_FILE, { items: [] }).items || []; }
function save(items) { mkdirSync(LIB_DIR, { recursive: true }); writeJson(LIB_FILE, { items }); }

export function addLibraryItem({ kind, title, notes, images = [] }) {
  if (!KINDS.includes(kind)) throw new Error(`kind must be one of ${KINDS.join(', ')}`);
  if (!String(title || '').trim() && !String(notes || '').trim() && !images.length) throw Object.assign(new Error('Add a name, a description or an image'), { code: 'card_empty' });
  const id = `${kind}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  mkdirSync(path.join(LIB_DIR, 'img'), { recursive: true });
  const files = images.slice(0, 6).map((im, i) => {
    const m = String(im.data || '').match(/^data:image\/(png|jpe?g|webp|gif);base64,(.*)$/);
    if (!m) throw new Error(`${im.name || 'image'}: only png / jpg / webp / gif`);
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 20 * 1048576) throw new Error(`${im.name}: over 20 MB`);
    const rel = `library/img/${id}_${i + 1}.${m[1].replace('jpeg', 'jpg')}`;
    writeFileSync(path.join(STUDIO, rel), buf);
    return rel;
  });
  const item = { id, kind, title: String(title || '').trim().slice(0, 120), notes: String(notes || '').trim().slice(0, 3000), images: files, createdAt: new Date().toISOString() };
  save([item, ...listLibrary()]);
  return item;
}
export function updateLibraryItem(id, patch) {
  const items = listLibrary(), it = items.find(x => x.id === id);
  if (!it) throw new Error('no such item');
  if (patch.title != null) it.title = String(patch.title).slice(0, 120);
  if (patch.notes != null) it.notes = String(patch.notes).slice(0, 3000);
  if (patch.kind && KINDS.includes(patch.kind)) it.kind = patch.kind;
  save(items); return it;
}
export function deleteLibraryItem(id) {
  const items = listLibrary(), it = items.find(x => x.id === id);
  if (!it) return false;
  for (const f of it.images) rmSync(path.join(STUDIO, f), { force: true });
  save(items.filter(x => x.id !== id)); return true;
}
// copy the chosen items into the job folder; returns the snapshot stored in brief.libraryItems
export function attachToJob(jobId, ids = []) {
  const all = listLibrary(), out = [];
  for (const id of ids) {
    const it = all.find(x => x.id === id); if (!it) continue;
    const dst = path.join(jobDir(jobId), 'refs', 'library'); mkdirSync(dst, { recursive: true });
    const images = it.images.filter(f => existsSync(path.join(STUDIO, f))).map(f => { const name = path.basename(f); copyFileSync(path.join(STUDIO, f), path.join(dst, name)); return `refs/library/${name}`; });
    out.push({ id: it.id, kind: it.kind, title: it.title, notes: it.notes, images });
  }
  return out;
}
