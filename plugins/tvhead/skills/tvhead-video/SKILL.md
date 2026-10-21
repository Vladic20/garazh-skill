---
name: tvhead-video
description: Turns any topic into a finished narrated motion video — horizontal 16:9 (1920×1080) or vertical 9:16 (1080×1920, Shorts/Reels/TikTok) mp4 — in English, Russian or both, in eight looks — hand-drawn doodle, warm garage cartoon, 3D desk UI showcase with a clay mascot, neon-noir explainer, Dota-like dark fantasy, Roblox-like brick game, 8-bit pixel and comic book — with velocity-matched transitions, kinetic type, infographics, live app screens and free generated background music (lo-fi / ambient / upbeat / chiptune / synthwave / epic). Free narration by default (Fish Audio S2.1 free tier via OpenRouter, any Fish voice id). Includes a local studio app (brief → storyboard → render) that Claude watches through a bridge. Use when the user asks for a video, explainer, video essay, YouTube/Reels video, motion graphic, "ролик/видео на тему …", says "проверь приложение / tvhead app / там бриф", or wants to change, re-voice or re-render such a video.
---

# tvhead-video

Topic in → finished mp4 out. **Don't stop to ask questions** unless the topic is genuinely unclear: pick a sensible angle, ~60–90 s, the language the user writes in (or the app brief's languages), 16:9 unless they ask for vertical / Shorts / Reels / TikTok (then `"format": "9:16"`, ~30–60 s), and deliver. Edits come afterwards.

`${CLAUDE_SKILL_DIR}` = this skill's folder. The engine ("studio") = `$STUDIO` = `$TVHEAD_STUDIO` or `~/tvhead-studio`.

## 0. Studio (every time, takes a second)
```bash
bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```
Creates or refreshes the studio (engine and app files only; `episodes/`, `out/` and `.env` are kept) and prints whether a TTS key is set. Needs Node ≥ 18, ffmpeg and Google Chrome (or `CHROME_PATH`).
**No key?** Tell the user once: put `OPENROUTER_API_KEY=...` (https://openrouter.ai/keys) into `$STUDIO/.env`. Never ask for the key in chat. Narration uses the **free** model `fish-audio/s2.1-pro-free:free` (OpenRouter free-model rate limits: ~20 requests/min plus a daily cap, which is enough for a couple of videos a day). A Fish Audio key only helps if the user has paid Fish *API* credit; the free Fish plan credits don't apply to the API. Without any key everything renders, but the narration is silent: say so if you deliver such a video.

## 1. Where the request comes from

**A. Chat** ("make a video about …"): go to step 2 with slug `<topic-in-latin>`, files in `$STUDIO/episodes/<slug>/`.

**B. The studio app** (the user says "проверь приложение", "в tvhead бриф", or you see the app running):
```bash
cd "$STUDIO" && node app/bridge.mjs status      # app running? key? which jobs wait for you
node app/bridge.mjs wait --timeout 1800         # run in the BACKGROUND: returns the next brief as JSON; while it runs the app shows "Claude на связи"
```
- No app running → tell the user to double-click the **tvhead studio** shortcut on the desktop (one click: it starts the app in the background and opens http://localhost:4777). No shortcut yet → create it with `node app/install-shortcut.mjs` (Windows/macOS/Linux) once the user agrees, or run `node app/launch.mjs`.
- For each job: `node app/bridge.mjs claim <id>` → read `brief.json` (topic, languages, format, duration, look, music, theme or `reference`, voices, notes, captions; copy `format` and `look` into story.json) and **Read every image in `refs/`** and every image in `castAndWorld.library` → design the cast and world (`references/cast-and-world.md`) → write `episodes/<id>/story.json` → `node app/bridge.mjs storyboard <id>`. This renders the stills and the cast sheet, and moves the job to "check the storyboard" in the app (or straight to render if the brief has `autoRender`). Read both sheets it prints and fix obvious problems once.
- The user reviews it in the app. They either press «Рендерить» (the app renders; you're done) or send feedback, which makes the job `revise` → `wait` returns it again with `feedback` → edit story.json → `storyboard` again.
- After handling a job, start `wait` again in the background so the app keeps showing that you're listening. Stop when the user says so.

## 2. Write the story
Before the first story of a session, read:
- `references/writing.md`: how the genre sounds and looks;
- `references/motion.md`: seams, staging, kinetic type, infographics, references, custom GSAP;
- `references/story-api.md`: the full JSON API;
- `references/cast-and-world.md`: designing characters (heads, bodies, hats, props) and places (sets, weather) for the topic, and drawing new ones.
Glance at `references/images/demo_sheet.jpg` for the doodle look (`demo_sheet_9x16.jpg` for vertical) and `cartoon_sheet.jpg` for the cartoon look. Examples: `$STUDIO/episodes/demo/story.json` (doodle, bilingual), `$STUDIO/episodes/promo/story.json` (cartoon, 9:16, bilingual, every screen type).

Checklist for `story.json`:
- **Cast & world first.** Use 2–4 named `characters` whose looks come from the topic's meaning (and from the user's library cards and ideas, if any), plus 2–4 `set`s that follow the story arc. Don't default to the bare grey TV-head on empty paper unless the user asked for that. Check with `node make.mjs <slug> --cast`.
- Hook in line 1. ~150 words per minute, 6–22 words per scene. Every scene has a `note` (one line describing the picture, shown in the app). Write `note`, `title` and character `name`/`desc` as `{ "en": "...", "ru": "..." }` even for a one-language video: the app interface switches between English and Russian.
- Languages: `"languages": ["en","ru"]`, and `say` (and any on-screen text) as `{ "en": "...", "ru": "..." }`. Write each language natively; don't translate word for word. Cue words differ per language, so prefer `at` for multilingual cues or give `on` per language.
- Every scene has a visual metaphor and something happening on a key word or fraction. One recurring hero with an `id`; `keep: true` for consecutive beats on one picture.
- Transitions: default `curve` in one direction; spend `zoom`/`pull`/`iris`/`page`/`whip` on meaning; use 2–3 types per film.
- Kinetic type (`layout: "title"`) for the hook, thesis and takeaway. Infographics only with real numbers.
- Look: `"look"` = `doodle` (default, pencil on paper), `cartoon` (warm garage), `desk3d` (UI on a desk under a 3D camera, clay cube mascot), `noir` (neon-noir explainer with cards), `dota` (dark-fantasy MOBA), `blocks` (Roblox-like brick game), `pixel` (8-bit) or `comic`. Each has its own sets, characters, props, captions and music: read story-api.md "Looks" before writing one. Test stories for every look: `$STUDIO/episodes/look-<name>/story.json`. Take the brief's `look`. In cartoon, show anything on a computer with a `screen` prop (`show`: `chat` / `app` / `code` / `video`) on the `desk` set, and introduce heroes with a `badge`.
- Music: the brief's `music` (`lofi` / `ambient` / `upbeat`; `none` → `"music": false`; `auto` → leave it out: cartoon gets lo-fi, doodle the quiet drone). It is generated locally for free and follows the cuts.
- Theme: the brief's `theme`; for `reference`, derive palette overrides from the images (motion.md §5).
- Format: `"format": "9:16"` for vertical. Write 16:9 coordinates as usual (they are mapped), pin exact portrait spots with `{ "16:9": …, "9:16": … }` where the sheet shows a collision. See story-api.md "Vertical 9:16".
- Voice: a user-given Fish id (`fish.audio/m/<id>` → `<id>`) goes into `voice` (per language if needed); otherwise leave it out. Find voices with `node voices.mjs deep calm --lang ru`. Avoid voices that imitate real people.

## 3. Check the pictures (no API calls)
```bash
cd "$STUDIO" && node make.mjs <slug> --stills auto
```
**Read** `episodes/<slug>/build/<lang>/sheet.png`. Fix overlaps, things off-frame, empty or cluttered frames, wrong faces. One or two rounds.

## 4. Render
```bash
cd "$STUDIO" && node make.mjs <slug>            # all languages → out/<slug>.<lang>.mp4 + .srt
```
This voices only missing lines (cached per line), aligns words, times scenes to the real audio, renders 1920×1080@30 (1080×1920 for 9:16; about real time), and mixes voice + music (or the drone) + transition sounds. Use `--lang ru` for one language, `--preview` for a fast 720p draft, `--offline` to make no API calls, `--format 9:16` to render a 16:9 story vertically as well (→ `out/<slug>.<lang>_9x16.mp4`, sheet in `build/<lang>_9x16/`). Run it in the background when it may take over 2 minutes. App jobs are rendered by the app after approval; use `node app/bridge.mjs render <id>` only if the user asks you to.

## 5. Deliver
Check each summary line (1920×1080 or 1080×1920, duration, "voice: N new line(s)", not "silent"). Send the mp4(s) with SendUserFile. Files over 30 MB don't reach phones: also send a 720p copy (`ffmpeg -i in.mp4 -vf scale=1280:720 -c:v libx264 -preset slow -crf 27 -c:a aac -b:a 128k out_share.mp4`; for 9:16 use `scale=720:1280`). Add 2–3 lines: title, length, voices. For app jobs, say it's in the app.

## Edits
- Change a line → edit `say` and re-render: only that line is re-voiced.
- Visual changes only → re-render (no API cost).
- New voice → set `voice` (all lines re-voiced). Burned-in captions → `"captions": true`. Music → `"music": "lofi" | "ambient" | "upbeat"` (generated) or `"track.mp3"` in the episode folder.
- Better word sync for captions/cues → `TVHEAD_STT=on` in `.env` (whisper-turbo, about $0.0002 per minute; off by default to stay free).

## Pitfalls
- Unknown `face`/`pose`/prop/transition names fail the build. Use only the names in `story-api.md`.
- A cue word must be in that language's `say` (the build warns and falls back to `at`).
- Write "dollars", not `$`, inside `say`.
- Engine code (`engine/*.js`) draws frames as pure functions of time: no `Math.random`/`Date`; use `rng(seed)`. Put lasting engine changes into `${CLAUDE_SKILL_DIR}/template` so the next bootstrap keeps them; per-video tricks go into episode `scripts` (motion.md §6).
