#!/usr/bin/env node
// Creates a one-click "tvhead studio" launcher: Windows → Desktop + Start-menu shortcuts (no console window);
// macOS → ~/Desktop/tvhead studio.command; Linux → an applications .desktop entry (+ Desktop copy).
//   node app/install-shortcut.mjs           create / refresh
//   node app/install-shortcut.mjs --remove  delete them again
import { spawnSync } from 'node:child_process';
import { writeFileSync, chmodSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { STUDIO } from './jobs.mjs';

const NAME = 'tvhead studio', REMOVE = process.argv.includes('--remove');
const icon = path.join(STUDIO, 'app', 'ui', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

if (process.platform === 'win32') {
  const vbs = path.join(STUDIO, 'app', 'launcher.vbs');
  const q = s => s.replace(/'/g, "''");
  const ps = `
$ws = New-Object -ComObject WScript.Shell
$targets = @([Environment]::GetFolderPath('Desktop'), (Join-Path ([Environment]::GetFolderPath('Programs')) ''))
foreach ($d in $targets) {
  $lnk = Join-Path $d '${NAME}.lnk'
  if (${REMOVE ? '$true' : '$false'}) { if (Test-Path $lnk) { Remove-Item $lnk -Force; "removed $lnk" }; continue }
  $s = $ws.CreateShortcut($lnk)
  $s.TargetPath = Join-Path $env:WINDIR 'System32\\wscript.exe'
  $s.Arguments = '"${q(vbs)}"'
  $s.WorkingDirectory = '${q(STUDIO)}'
  $s.IconLocation = '${q(icon)},0'
  $s.Description = 'tvhead studio — topic to narrated doodle video'
  $s.Save(); "created $lnk"
}`;
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { encoding: 'utf8' });
  process.stdout.write(r.stdout); if (r.status !== 0) { process.stderr.write(r.stderr); process.exit(1); }
} else if (process.platform === 'darwin') {
  const f = path.join(homedir(), 'Desktop', `${NAME}.command`);
  if (REMOVE) { rmSync(f, { force: true }); console.log(`removed ${f}`); }
  else { writeFileSync(f, `#!/bin/bash\ncd "${STUDIO}" && node app/launch.mjs\n`); chmodSync(f, 0o755); console.log(`created ${f} (double-click it; the first time macOS may ask to allow it)`); }
} else {
  const dir = path.join(homedir(), '.local', 'share', 'applications'), f = path.join(dir, 'tvhead-studio.desktop'), desk = path.join(homedir(), 'Desktop', 'tvhead-studio.desktop');
  if (REMOVE) { rmSync(f, { force: true }); rmSync(desk, { force: true }); console.log('removed'); }
  else {
    mkdirSync(dir, { recursive: true });
    writeFileSync(f, `[Desktop Entry]\nType=Application\nName=${NAME}\nExec=sh -c 'cd "${STUDIO}" && node app/launch.mjs'\nIcon=${icon}\nTerminal=false\nCategories=AudioVideo;\n`); chmodSync(f, 0o755);
    if (existsSync(path.dirname(desk))) { copyFileSync(f, desk); chmodSync(desk, 0o755); }
    console.log(`created ${f}`);
  }
}
