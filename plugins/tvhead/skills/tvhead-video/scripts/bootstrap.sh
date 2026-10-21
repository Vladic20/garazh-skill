#!/usr/bin/env bash
# Deploys / updates the studio from the skill template and installs puppeteer-core.
# usage: bootstrap.sh [studio_dir] [--shortcut]   (default dir: $TVHEAD_STUDIO or ~/tvhead-studio; --shortcut adds a one-click desktop launcher)
# Engine files are refreshed on every run; your episodes/, out/ and .env are never touched.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TPL="$HERE/../template"
SHORTCUT=0; ARGS=(); for a in "$@"; do [ "$a" = --shortcut ] && SHORTCUT=1 || ARGS+=("$a"); done
STUDIO="${ARGS[0]:-${TVHEAD_STUDIO:-$HOME/tvhead-studio}}"
mkdir -p "$STUDIO/episodes"
for f in engine lib fonts lottie app make.mjs voices.mjs package.json package-lock.json .gitignore .env.example start-app.cmd start-app.sh; do
  [ -e "$TPL/$f" ] || continue
  if [ "$f" = app ]; then mkdir -p "$STUDIO/app"; for a in "$TPL/app/"*; do n=$(basename "$a"); [ "$n" = thumbs ] && continue; rm -rf "$STUDIO/app/$n"; cp -R "$a" "$STUDIO/app/$n"; done; continue; fi
  rm -rf "$STUDIO/$f"; cp -R "$TPL/$f" "$STUDIO/$f"
done
# films: source files only, never remove a film's renders, voices or downloaded models
[ -d "$TPL/films" ] && { mkdir -p "$STUDIO/films"; cp -R "$TPL/films/." "$STUDIO/films/"; }
for ex in demo promo look-lottie look-ae3d look-desk3d look-noir look-dota look-blocks look-pixel look-comic look-stick look-beanie look-prehistoric look-cozy look-history; do [ -d "$STUDIO/episodes/$ex" ] || cp -R "$TPL/episodes/$ex" "$STUDIO/episodes/$ex"; done
command -v node >/dev/null || { echo "!! need Node.js >= 18" >&2; exit 1; }
command -v ffmpeg >/dev/null || echo "!! need ffmpeg in PATH (Windows: winget install Gyan.FFmpeg · macOS: brew install ffmpeg · Linux: apt install ffmpeg)" >&2
(cd "$STUDIO" && npm install --silent --no-audit --no-fund)   # fast no-op when up to date; picks up new deps after updates
if [ -f "$STUDIO/.env" ] && grep -Eq '^(OPENROUTER_API_KEY|FISH_AUDIO_API_KEY)=.+' "$STUDIO/.env"; then KEY=yes; else KEY=no; [ -f "$STUDIO/.env" ] || cp "$STUDIO/.env.example" "$STUDIO/.env"; fi
chmod +x "$STUDIO/start-app.sh" 2>/dev/null || true
[ "$SHORTCUT" = 1 ] && (cd "$STUDIO" && node app/install-shortcut.mjs)
echo "studio: $STUDIO"
echo "app:    $STUDIO/start-app.cmd (Windows) · ./start-app.sh · npm run app  → http://localhost:4777"
AER=$(ls "/c/Program Files/Adobe/"Adobe\ After\ Effects*/Support\ Files/aerender.exe /Applications/Adobe\ After\ Effects*/aerender 2>/dev/null | head -1 || true)
echo "after effects: ${AER:-not installed (Lottie animations still work; see references/after-effects.md)}"
echo "tts key: $KEY$([ $KEY = no ] && echo "  → put OPENROUTER_API_KEY=... into $STUDIO/.env (https://openrouter.ai/keys)")"
