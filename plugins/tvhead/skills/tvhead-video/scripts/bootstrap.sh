#!/usr/bin/env bash
# Deploys / updates the studio from the skill template and installs puppeteer-core.
# usage: bootstrap.sh [studio_dir]   (default: $TVHEAD_STUDIO or ~/tvhead-studio)
# Engine files are refreshed on every run; your episodes/, out/ and .env are never touched.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TPL="$HERE/../template"
STUDIO="${1:-${TVHEAD_STUDIO:-$HOME/tvhead-studio}}"
mkdir -p "$STUDIO/episodes"
for f in engine lib fonts make.mjs voices.mjs package.json .gitignore .env.example; do
  rm -rf "$STUDIO/$f"; cp -R "$TPL/$f" "$STUDIO/$f"
done
[ -d "$STUDIO/episodes/demo" ] || cp -R "$TPL/episodes/demo" "$STUDIO/episodes/demo"
command -v node >/dev/null || { echo "!! need Node.js >= 18" >&2; exit 1; }
command -v ffmpeg >/dev/null || echo "!! need ffmpeg in PATH (Windows: winget install Gyan.FFmpeg · macOS: brew install ffmpeg · Linux: apt install ffmpeg)" >&2
[ -d "$STUDIO/node_modules/puppeteer-core" ] || (cd "$STUDIO" && npm install --silent --no-audit --no-fund)
if [ -f "$STUDIO/.env" ] && grep -Eq '^(OPENROUTER_API_KEY|FISH_AUDIO_API_KEY)=.+' "$STUDIO/.env"; then KEY=yes; else KEY=no; [ -f "$STUDIO/.env" ] || cp "$STUDIO/.env.example" "$STUDIO/.env"; fi
echo "studio: $STUDIO"
echo "tts key: $KEY$([ $KEY = no ] && echo "  → put OPENROUTER_API_KEY=... into $STUDIO/.env (https://openrouter.ai/keys)")"
