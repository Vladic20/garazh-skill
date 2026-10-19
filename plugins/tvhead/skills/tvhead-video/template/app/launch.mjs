#!/usr/bin/env node
// One-click start (used by the desktop shortcut): if the app already runs → just open it; otherwise install deps on first run,
// start the server in the background (no console window), wait until it answers, open the browser.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, openSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { STUDIO, appState } from './jobs.mjs';

const PORT = +(process.env.TVHEAD_PORT || 4777), URL_ = `http://localhost:${PORT}`;
const open = url => process.platform === 'win32' ? spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true, windowsHide: true }).unref()
  : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
const alive = async () => { try { return (await fetch(`${URL_}/api/status`, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; } };

if (appState() && await alive()) { open(URL_); process.exit(0); }

if (!existsSync(path.join(STUDIO, 'node_modules', 'puppeteer-core'))) {
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: STUDIO, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error('npm install failed'); process.exit(1); }
}
mkdirSync(path.join(STUDIO, 'app'), { recursive: true });
const log = openSync(path.join(STUDIO, 'app', 'server.log'), 'a');
spawn(process.execPath, [path.join(STUDIO, 'app', 'server.mjs')], { cwd: STUDIO, detached: true, windowsHide: true, stdio: ['ignore', log, log] }).unref();
for (let i = 0; i < 60; i++) { if (await alive()) { open(URL_); process.exit(0); } await new Promise(r => setTimeout(r, 300)); }
console.error(`the app did not start — see ${path.join(STUDIO, 'app', 'server.log')}`);
process.exit(1);
