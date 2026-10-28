// Series builder for the marker-sketch series: one compact spec per episode → episodes/<slug>/story.json
// usage: node episodes/_series/build.mjs <spec.mjs>   (spec exports { slug, title, colors, scenes, summary })
// Shared for every episode: voice, style, music, pace, look, theme, hand, captions, glide cameras, page flip, ending.
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const VOICE = '48ec28a45588422b977a86460c11977f';   // «Энергичный Рассказчик», the same in every episode
const root = path.dirname(fileURLToPath(import.meta.url));
const spec = (await import(pathToFileURL(path.resolve(process.argv[2])).href)).default;

const hand = { type: 'hand', id: 'hand', x: 0, y: 0, z: 999, enter: 'fade', enterDur: 0.01 };
const scenes = spec.scenes.map((s, i) => {
  const o = { note: { ru: s.note, en: s.note } };
  if (i === 0) {
    o.say = { ru: s.say };
    o.cam = { from: s.camFrom || [360, 560, 1.06], to: s.cam || [360, 600, 1.0], ease: 'from' };
    o.props = [{ type: 'ui', id: 'ui', colors: spec.colors }, hand, ...s.props];
  } else {
    o.keep = true; o.say = { ru: s.say };
    o.cam = { to: s.cam, ease: s.shake ? 'shake' : 'glide' };
    if (s.props) o.props = s.props;
    if (s.remove) o.remove = s.remove;
  }
  return o;
});
// optional spec.money { head ("ДЕНЬГИ"), scenes: [...] }: a new sheet between the build and the summary, e.g. mkLedger + mkBars
if (spec.money) spec.money.scenes.forEach((s, i) => scenes.push(i === 0
  ? { note: { ru: s.note, en: s.note }, transition: { type: 'page', dir: 'up' }, say: { ru: s.say },
      cam: { from: [360, 600, 1.0], to: s.cam || [360, 600, 1.02], ease: 'from' },
      props: [{ type: 'ui', id: 'ui', colors: spec.colors }, hand, { type: 'sk', id: 'mhead', obj: 'mkHead', text: spec.money.head || 'ДЕНЬГИ', delay: 0.2, dur: 0.8 }, ...s.props] }
  : { note: { ru: s.note, en: s.note }, keep: true, say: { ru: s.say }, cam: { to: s.cam || [360, 640, 1.0], ease: 'glide' }, props: s.props }));
// summary page + ending, identical layout in every episode
const sm = spec.summary;
scenes.push({
  note: { ru: 'Новый лист: итог — результат в рамке и чек-лист «проблема → решение».', en: 'New sheet: boxed result and a problem → fix checklist.' },
  transition: { type: 'page', dir: 'up' },
  say: { ru: sm.say },
  cam: { from: [360, 600, 1.0], to: [360, 560, 1.03], ease: 'from' },
  props: [{ type: 'ui', id: 'ui' }, hand,
    { type: 'sk', id: 'head', obj: 'mkHead', delay: 0.25, dur: 0.8 },
    { type: 'sk', id: 'res', obj: 'mkResult', lines: sm.result, delay: 1.1, dur: sm.resultDur || 2.0 },
    // sm.ledger [[label, value], …] + sm.total [label, value] replace the checklist with a price list (mkLedger)
    sm.ledger ? { type: 'sk', id: 'rows', obj: 'mkLedger', rows: sm.ledger, total: sm.total, size: 34, step: 56, ...(sm.rowsOn ? { on: sm.rowsOn } : { at: 0.42 }), dur: sm.rowsDur || 3.6, top: sm.rowsY || 440 }
      : { type: 'sk', id: 'rows', obj: 'mkRows', rows: sm.rows, ...(sm.rowsOn ? { on: sm.rowsOn } : { at: 0.42 }), dur: sm.rowsDur || 3.6, top: sm.rowsY }],
});
// optional spec.cta { say, text, sub }: e.g. tease the next episode of a mini-series
const cta = spec.cta || {};
scenes.push({
  note: { ru: 'Внизу листа: «Что нарисовать дальше?» и стрелка в комментарии.', en: 'Bottom of the sheet: what next? arrow to the comments.' },
  keep: true, say: { ru: cta.say || 'Что нарисовать дальше? Пишите идеи в комментариях.' },
  cam: { to: [360, 640, 1.0], ease: 'glide' }, hold: 0.8,
  props: [{ type: 'sk', id: 'cta', obj: 'mkCta', at: 0.02, dur: 2.2, ...(cta.text && { text: cta.text }), ...(cta.sub && { sub: cta.sub }) }],
});

const story = {
  title: { ru: spec.title, en: spec.titleEn || spec.title }, look: 'marker', format: '9:16', remap: false, languages: ['ru'],
  voice: { ru: VOICE }, style: 'energetic, clear, explaining', music: { preset: 'upbeat', volume: 0.32 },
  captions: true, pace: 0.75, outro: 1.6, particles: 0, scripts: ['art/draw.js'], set: { type: 'sheet' }, scenes,
};
const dir = path.join(root, '..', spec.slug);
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, 'story.json'), JSON.stringify(story, null, 2));
console.log(`✓ ${spec.slug}: ${scenes.length} scenes`);
