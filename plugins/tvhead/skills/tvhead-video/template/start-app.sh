#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -d node_modules/puppeteer-core ] || npm install --no-audit --no-fund
exec node app/server.mjs --open
