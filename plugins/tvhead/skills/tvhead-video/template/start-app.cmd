@echo off
cd /d "%~dp0"
if not exist node_modules\puppeteer-core call npm install --no-audit --no-fund
node app\server.mjs --open
pause
