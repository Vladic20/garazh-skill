// Frames: headless Chrome draws each frame (pure function of t); every worker owns a contiguous range of frames and
// pipes JPEGs straight into its own ffmpeg → segment mp4. Segments are concatenated without re-encoding. No PNG dumps on disk.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const FPS = 30;
const WORLD = { w: 1280, h: 720 };

async function openPage(root, tlRel, dsf, world) {
  const exe = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  let browser;
  try {
    browser = await puppeteer.launch({ ...(exe ? { executablePath: exe } : { channel: 'chrome' }), headless: true,
      args: ['--allow-file-access-from-files', '--disable-gpu-vsync', '--force-color-profile=srgb', '--hide-scrollbars'] });
  } catch (e) { throw new Error(`cannot start Chrome (install Google Chrome or set CHROME_PATH): ${e.message}`); }
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => errors.push(`failed to load ${r.url()}`));
  await page.setViewport({ width: world.w, height: world.h, deviceScaleFactor: dsf });
  await page.goto(pathToFileURL(path.join(root, 'engine', 'index.html')).href + `?tl=${encodeURIComponent(tlRel)}`);
  await page.evaluate(() => document.fonts.load("50px 'Patrick Hand'").then(() => document.fonts.ready));
  if (errors.length) { await closeBrowser(browser); throw new Error(`page errors:\n  ${errors.join('\n  ')}`); }
  const cdp = await page.createCDPSession();
  return { browser, page, cdp, errors, world };
}

// puppeteer browser.close() can hang for minutes on Windows after heavy use — give it 2 s, then kill the process tree
async function closeBrowser(b) {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), new Promise(r => setTimeout(r, 2000))]);
  if (proc && proc.exitCode == null) { try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }) : proc.kill('SIGKILL'); } catch {} }
}

const grab = (p, dsf, fmt, quality) => p.cdp.send('Page.captureScreenshot', { format: fmt, ...(fmt === 'jpeg' ? { quality } : {}), optimizeForSpeed: true,
  clip: { x: 0, y: 0, width: p.world.w, height: p.world.h, scale: dsf } }).then(r => Buffer.from(r.data, 'base64'));

// stills: PNGs at given times. world = { w, h } of the timeline (1280×720 or 720×1280)
export async function renderStills({ root, tlRel, times, outDir, dsf = 1, world = WORLD }) {
  mkdirSync(outDir, { recursive: true });
  const p = await openPage(root, tlRel, dsf, world), files = [];
  try {
    for (const [i, t] of times.entries()) {
      await p.page.evaluate(t => render(t), t);
      if (p.errors.length) throw new Error(`t=${t}: ${p.errors.join('; ')}`);
      const f = path.join(outDir, `s_${String(i).padStart(3, '0')}.png`);
      writeFileSync(f, await grab(p, dsf, 'png')); files.push(f);
    }
  } finally { await closeBrowser(p.browser); }
  return files;
}

function run(cmd, args, input) {
  return new Promise((res, rej) => {
    const pr = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    let err = ''; pr.stderr.on('data', d => err += d);
    pr.on('error', e => rej(new Error(`${cmd}: ${e.message}`)));
    pr.on('exit', c => c ? rej(new Error(`${cmd} exited ${c}: ${err.slice(-800)}`)) : res());
    if (input) input(pr);
  });
}

// full video (no audio) → out
export async function renderVideo({ root, tlRel, duration, out, world = WORLD, dsf = 1.5, jobs = 4, preset = 'medium', crf = 18, threads = 2, onProgress }) {
  const n = Math.round(duration * FPS), J = Math.max(1, Math.min(jobs, Math.ceil(n / 30)));
  const tmp = path.join(path.dirname(out), `.seg-${path.basename(out, '.mp4')}`);
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  const ranges = Array.from({ length: J }, (_, k) => [Math.floor(k * n / J), Math.floor((k + 1) * n / J)]);
  const W = Math.round(world.w * dsf / 2) * 2, Hh = Math.round(world.h * dsf / 2) * 2;
  let done = 0; const t0 = Date.now(); let events = [];
  await Promise.all(ranges.map(async ([a, b], k) => {
    const p = await openPage(root, tlRel, dsf, world);
    // sound events declared by the look / episode scripts (window.sfxEvents → [{ t, dur, kind, gain }]), mixed by lib/audio.mjs
    if (k === 0) events = await p.page.evaluate(() => (typeof window.sfxEvents === "function" ? window.sfxEvents() : []) || []);
    const seg = path.join(tmp, `seg_${k}.mp4`);
    try {
      await run('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-vf', `scale=${W}:${Hh}:flags=lanczos:in_range=full:out_range=tv,format=yuv420p`, '-color_range', 'tv', '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-threads', String(threads), '-r', String(FPS), seg], async pr => {
        try {
          for (let i = a; i < b; i++) {
            await p.page.evaluate(t => render(t), i / FPS);
            if (p.errors.length) throw new Error(`t=${(i / FPS).toFixed(2)}: ${p.errors.join('; ')}`);
            const buf = await grab(p, dsf, 'jpeg', 94);
            if (!pr.stdin.write(buf)) await new Promise(r => pr.stdin.once('drain', r));
            if (++done % 15 === 0 && onProgress) onProgress(done, n, (Date.now() - t0) / 1000);
          }
        } catch (e) { pr.stdin.destroy(e); pr.kill(); throw e; }
        pr.stdin.end();
      });
    } finally { await closeBrowser(p.browser); }
  }));
  const list = path.join(tmp, 'list.txt');
  writeFileSync(list, ranges.map((_, k) => `file 'seg_${k}.mp4'`).join('\n'));
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  rmSync(tmp, { recursive: true, force: true });
  return { frames: n, seconds: (Date.now() - t0) / 1000, size: [W, Hh], events };
}
