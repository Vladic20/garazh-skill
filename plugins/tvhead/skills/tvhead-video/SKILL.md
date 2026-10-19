---
name: tvhead-video
description: Turns any topic into a finished narrated 16:9 video (1920×1080 mp4, English voice-over) in a hand-drawn black-and-white doodle style — TV-headed stick figures on grey paper, floating pencil confetti, wobbly boiling lines, film grain. Narration is Fish Audio TTS (fish-audio/drama-3) via OpenRouter with any Fish voice id; frames are SVG rendered in headless Chrome, mixed with ffmpeg. Use when the user asks to make a video, explainer, video essay, YouTube video, animated short or "ролик/видео на тему …", or wants a video with English voice-over in the TV-head / doodle style.
---

# tvhead-video

Topic in → finished mp4 out. **Don't stop to ask questions** unless the topic is genuinely unclear: pick a sensible angle, ~60–90 s, English narration, and deliver the video. The user can ask for changes afterwards.

`${CLAUDE_SKILL_DIR}` = this skill's folder. The engine ("studio") lives in `$STUDIO` = `$TVHEAD_STUDIO` or `~/tvhead-studio`.

## 1. Studio (every time, takes a second)
```bash
bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```
Creates or refreshes the studio (engine files only; episodes and `.env` are kept) and prints whether a TTS key is set.
Needs Node ≥ 18, ffmpeg and Google Chrome (or `CHROME_PATH`).
**No key?** Tell the user once: put `OPENROUTER_API_KEY=...` (https://openrouter.ai/keys) into `$STUDIO/.env`. Never ask them to paste the key into chat. Without a key everything still renders, but the narration is silent — say so clearly if you deliver such a video.

## 2. Write the story
Read `references/writing.md` (how the genre sounds and looks), glance at `references/images/demo_sheet.jpg` (the target look) and `references/story-api.md` (the full JSON API) before the first story of a session. Example: `$STUDIO/episodes/demo/story.json`.

Create `$STUDIO/episodes/<slug>/story.json` (slug: latin, digits, `-`). Checklist:
- hook first line; ~150 words per minute; 6–22 words per scene;
- every scene has a visual metaphor and something that happens `on` a key word;
- recurring hero with an `id`, `keep: true` for consecutive beats on one picture;
- voice: user-given Fish id (`fish.audio/m/<id>` → `<id>`) → story `voice`; otherwise leave it out (default from `.env` `TVHEAD_VOICE`, else the built-in deep narrator). To find voices: `node voices.mjs deep calm` (no key needed). Avoid voices imitating real people.

## 3. Check the pictures (fast, no API calls)
```bash
cd "$STUDIO" && node make.mjs <slug> --stills auto
```
Then **Read** `episodes/<slug>/build/sheet.png` (one frame per scene). Fix overlaps, things off-frame, empty or cluttered scenes, wrong faces. One or two rounds, not more.

## 4. Render the film
```bash
cd "$STUDIO" && node make.mjs <slug>
```
Generates only the missing voice lines (cached per line), aligns words, lays out timing from the real audio, renders 1920×1080@30, mixes voice + drone + paper flips, writes `out/<slug>.mp4` and `out/<slug>.srt`. Roughly 1–2 min of work per minute of film. Run it in the background if it may exceed 2 minutes.
`--preview` = fast 720p draft. `--offline` = never call the API.

## 5. Deliver
Check the summary line (resolution, duration, "voice: N new line(s)" — not "silent"). Send `out/<slug>.mp4` with SendUserFile, plus 2–3 lines: title, length, voice used. Don't paste the whole script unless asked.

## Edits after delivery
- Change a line → edit `say`, re-run step 4: only that line is re-voiced.
- Change visuals only → re-run step 4 (no API cost).
- Different voice → set `voice` and re-run (all lines re-voiced).
- Captions burned in → `"captions": true`. Own music → `"music": "track.mp3"` in the episode folder.

## Pitfalls
- Unknown `face`/`pose`/prop type silently falls back or errors on render — stick to the lists in `references/story-api.md`.
- A cue word (`on`) must be in that scene's `say`, spelled as spoken (the build warns otherwise).
- `$` inside `say` gets read aloud oddly — write "dollars".
- The engine draws frames as pure functions of time: if you extend `engine/*.js`, no `Math.random`/`Date`; use `rng(seed)` and `t`. Engine changes belong in `${CLAUDE_SKILL_DIR}/template` so the next bootstrap keeps them.
