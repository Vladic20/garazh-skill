#!/usr/bin/env node
import './lib/net.mjs';
// Search the public Fish Audio voice library (no key needed): node voices.mjs [tags or words…] [--lang en] [--n 15]
//   node voices.mjs deep calm narration      → id | title | tags | uses
// Put the id into story.json "voice" (or TVHEAD_VOICE in .env). Your own cloned voice: its id from fish.audio/m/<id>.
const argv = process.argv.slice(2), opt = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const words = argv.filter((a, i) => !a.startsWith('--') && !['--lang', '--n'].includes(argv[i - 1]));
const lang = opt('--lang', 'en'), n = +opt('--n', 15);
const url = `https://api.fish.audio/model?page_size=100&language=${lang}&sort_by=task_count${words.length ? '' : '&tag=narration'}`;
const j = await (await fetch(url)).json();
const want = words.map(w => w.toLowerCase());
const items = (j.items || []).filter(m => want.every(w => `${m.title} ${(m.tags || []).join(' ')} ${m.description || ''}`.toLowerCase().includes(w))).slice(0, n);
if (!items.length) console.log('no matches — try fewer words');
for (const m of items) console.log(`${m._id} | ${m.title} | ${(m.tags || []).slice(0, 8).join(',')} | ${m.task_count}`);
console.log('\nListen: https://fish.audio/m/<id>  ·  avoid voices that imitate real people');
