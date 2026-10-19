---
name: tvhead-video
description: Turns any topic into a finished narrated 16:9 motion video (1920×1080 mp4) in English, Russian or both, in a hand-drawn doodle style — TV-headed stick figures on paper, floating pencil confetti, boiling lines, film grain — with velocity-matched transitions, kinetic type and doodle infographics. Free narration by default (Fish Audio S2.1 free tier via OpenRouter, any Fish voice id). Includes a local studio app (brief → storyboard → render) that Claude watches through a bridge. Use when the user asks for a video, explainer, video essay, YouTube/Reels video, motion graphic, "ролик/видео на тему …", says "проверь приложение / tvhead app / там бриф", or wants to change, re-voice or re-render such a video.
---

# tvhead-video

Topic in → finished mp4 out. **Don't stop to ask questions** unless the topic is genuinely unclear: pick a sensible angle, ~60–90 s, the language the user writes in (or the app brief's languages), and deliver. Edits come afterwards.

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
- No app running → tell the user to start it: `start-app.cmd` (Windows) / `./start-app.sh` / `npm run app` in `$STUDIO`. It opens http://localhost:4777.
- For each job: `node app/bridge.mjs claim <id>` → read `brief.json` (topic, languages, duration, theme or `reference`, voices, notes, captions) and **Read every image in `refs/`** → write `episodes/<id>/story.json` → `node app/bridge.mjs storyboard <id>`. This renders the stills and moves the job to "check the storyboard" in the app (or straight to render if the brief has `autoRender`). Read the sheet it prints and fix obvious problems once.
- The user reviews it in the app. They either press «Рендерить» (the app renders; you're done) or send feedback, which makes the job `revise` → `wait` returns it again with `feedback` → edit story.json → `storyboard` again.
- After handling a job, start `wait` again in the background so the app keeps showing that you're listening. Stop when the user says so.

## 2. Write the story
Before the first story of a session, read:
- `references/writing.md`: how the genre sounds and looks;
- `references/motion.md`: seams, staging, kinetic type, infographics, references, custom GSAP;
- `references/story-api.md`: the full JSON API.
Glance at `references/images/demo_sheet.jpg` for the target look. Example: `$STUDIO/episodes/demo/story.json` (bilingual).

Checklist for `story.json`:
- Hook in line 1. ~150 words per minute, 6–22 words per scene. Every scene has a `note` (one line describing the picture, shown in the app).
- Languages: `"languages": ["en","ru"]`, and `say` (and any on-screen text) as `{ "en": "...", "ru": "..." }`. Write each language natively; don't translate word for word. Cue words differ per language, so prefer `at` for multilingual cues or give `on` per language.
- Every scene has a visual metaphor and something happening on a key word or fraction. One recurring hero with an `id`; `keep: true` for consecutive beats on one picture.
- Transitions: default `curve` in one direction; spend `zoom`/`pull`/`iris`/`page`/`whip` on meaning; use 2–3 types per film.
- Kinetic type (`layout: "title"`) for the hook, thesis and takeaway. Infographics only with real numbers.
- Theme: the brief's `theme`; for `reference`, derive palette overrides from the images (motion.md §5).
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
This voices only missing lines (cached per line), aligns words, times scenes to the real audio, renders 1920×1080@30 (about real time), and mixes voice + drone + transition sounds. Use `--lang ru` for one language, `--preview` for a fast 720p draft, `--offline` to make no API calls. Run it in the background when it may take over 2 minutes. App jobs are rendered by the app after approval; use `node app/bridge.mjs render <id>` only if the user asks you to.

## 5. Deliver
Check each summary line (1920×1080, duration, "voice: N new line(s)", not "silent"). Send the mp4(s) with SendUserFile. Files over 30 MB don't reach phones: also send a 720p copy (`ffmpeg -i in.mp4 -vf scale=1280:720 -c:v libx264 -preset slow -crf 27 -c:a aac -b:a 128k out_share.mp4`). Add 2–3 lines: title, length, voices. For app jobs, say it's in the app.

## Edits
- Change a line → edit `say` and re-render: only that line is re-voiced.
- Visual changes only → re-render (no API cost).
- New voice → set `voice` (all lines re-voiced). Burned-in captions → `"captions": true`. Music → `"music": "track.mp3"` in the episode folder.
- Better word sync for captions/cues → `TVHEAD_STT=on` in `.env` (whisper-turbo, about $0.0002 per minute; off by default to stay free).

## Pitfalls
- Unknown `face`/`pose`/prop/transition names fail the build. Use only the names in `story-api.md`.
- A cue word must be in that language's `say` (the build warns and falls back to `at`).
- Write "dollars", not `$`, inside `say`.
- Engine code (`engine/*.js`) draws frames as pure functions of time: no `Math.random`/`Date`; use `rng(seed)`. Put lasting engine changes into `${CLAUDE_SKILL_DIR}/template` so the next bootstrap keeps them; per-video tricks go into episode `scripts` (motion.md §6).
