#!/usr/bin/env bash
# One click: starts tvhead studio in the background (if needed) and opens it in the browser.
cd "$(dirname "$0")"
exec node app/launch.mjs
