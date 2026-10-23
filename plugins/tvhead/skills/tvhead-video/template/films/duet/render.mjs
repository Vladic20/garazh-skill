// Render "Claude Duet builds the studio" through the shared film renderer (lib/film.mjs): stills | sheet | probe a:b | check | video
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFilm } from '../../lib/film.mjs';
import { FPS, DUR, SHEET } from './timeline.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
await renderFilm({ dir, root: path.resolve(dir, '../..'), name: 'duet', fps: FPS, duration: DUR, sheet: SHEET, samples: { draft: 4, final: 8 } });
