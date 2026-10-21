// Render the 3D promo: headless Chrome (GPU, WebGL2) draws render(t) frame by frame; three.js comes from the studio's node_modules.
//   node render.mjs stills 0.5,4.6,9 [--samples 8]   → review/s_<t>.png
//   node render.mjs sheet [--samples 8]               → review/sheet.jpg (one still per beat)
//   node render.mjs video [--samples 24] [--from 0 --to 60] → out/promo3d.video.mp4 (no audio)
import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { FPS, DUR } from './timeline.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const args = process.argv.slice(2), mode = args[0] || 'sheet';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
const SAMPLES = +opt('samples', mode === 'video' ? 24 : 8);
const W = 1920, H = 1080;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
function serve() {
  const three = [path.join(root, 'node_modules', 'three'), path.join(here, 'node_modules', 'three')].find(existsSync);
  if (!three) throw new Error('three.js missing: run npm install in the studio folder');
  const map = [['/three/', three], ['/fonts/', path.join(root, 'fonts')], ['/', here]].map(([p, d]) => [p, path.resolve(d) + path.sep]);
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const [pre, dir] = map.find(([p]) => url.startsWith(p));
    const f = path.join(dir, url.slice(pre.length) || 'index.html');
    if (!f.startsWith(dir) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function open(port) {
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true, protocolTimeout: 600000,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--force-color-profile=srgb', '--hide-scrollbars'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('env.json')) errors.push(r.status() + ' ' + r.url()); }); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/index.html?samples=${SAMPLES}`);
  try { await page.waitForFunction('window.__ready', { timeout: 30000 }); await page.evaluate(() => window.__ready); } catch (e) { throw new Error('page not ready: ' + e.message + '\n  ' + errors.join('\n  ')); }
  if (errors.length) console.warn('page:', errors.join('\n  '));
  const cdp = await page.createCDPSession();
  const shot = (fmt = 'jpeg') => cdp.send('Page.captureScreenshot', { format: fmt, ...(fmt === 'jpeg' ? { quality: 94 } : {}), optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } }).then(r => Buffer.from(r.data, 'base64'));
  return { browser, page, shot, errors };
}
const close = async b => { const p = b.process(); await Promise.race([b.close().catch(() => {}), new Promise(r => setTimeout(r, 2000))]); if (p && p.exitCode == null) spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); };

const srv = await serve(), port = srv.address().port;
const review = path.join(here, 'review'); mkdirSync(review, { recursive: true });
try {
  if (mode === 'stills' || mode === 'sheet') {
    const times = mode === 'sheet' ? [1.2, 3.4, 4.6, 6.2, 10, 12.8, 14.8, 16.5, 20.5, 25, 27.4, 29.6, 31.4, 35.2, 39.6, 41.6, 44.2, 46.6, 48.95, 51.2, 54.8, 58.4]
      : args[1].split(',').map(Number);
    const p = await open(port), files = [];
    for (const t of times) {
      const t0 = Date.now();
      await p.page.evaluate(t => window.renderAt(t), t);
      const f = path.join(review, `s_${t.toFixed(2).padStart(5, '0')}.png`);
      (await import('node:fs')).writeFileSync(f, await p.shot('png')); files.push(f);
      console.log(`t=${t}  ${Date.now() - t0} ms`);
    }
    if (p.errors.length) console.warn('page errors:\n  ' + [...new Set(p.errors)].slice(0, 20).join('\n  '));
    await close(p.browser);
    if (mode === 'sheet') {
      const cols = 4, rows = Math.ceil(files.length / cols);
      const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...files.flatMap(f => ['-i', f]), '-filter_complex',
        files.map((_, i) => `[${i}:v]scale=480:270[v${i}]`).join(';') + ';' +
        files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join('|')}:fill=black`,
        path.join(review, 'sheet.jpg')], { encoding: 'utf8' });
      if (r.status) console.error(r.stderr); else console.log('sheet → review/sheet.jpg');
    }
  } else if (mode === 'video') {
    const from = +opt('from', 0), to = +opt('to', DUR), out = opt('out', path.join(here, 'out', 'promo3d.video.mp4'));
    mkdirSync(path.dirname(out), { recursive: true });
    const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
    let p = await open(port);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
    const t0 = Date.now();
    // a lost WebGL context or a hung page must not kill a long render: reopen the browser and redo the frame
    const frame = async n => {
      for (let a = 0; ; a++) {
        try {
          await Promise.race([p.page.evaluate(t => window.renderAt(t), n / FPS), new Promise((_, rej) => setTimeout(() => rej(new Error('frame timeout')), 60000))]);
          return await p.shot('jpeg');
        } catch (e) {
          if (a >= 3) throw e;
          console.warn(`frame ${n}: ${e.message.split('\n')[0]} — restarting the browser`);
          await close(p.browser).catch(() => {}); p = await open(port);
        }
      }
    };
    try {
    for (let n = n0; n < n1; n++) {
      const buf = await frame(n);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((n - n0) % 30 === 0) { const el = (Date.now() - t0) / 1000, k = (n - n0 + 1) / (n1 - n0); console.log(`frame ${n}/${n1}  ${(el / (n - n0 + 1) * 1000).toFixed(0)} ms/f  eta ${((el / k - el) / 60).toFixed(1)} min`); }
    }
    } finally { ff.stdin.end(); await new Promise(r => ff.on('exit', r)); }
    if (p.errors.length) console.warn('page errors:\n  ' + [...new Set(p.errors)].slice(0, 20).join('\n  '));
    await close(p.browser);
    console.log('video →', out);
  }
} finally { srv.close(); }
