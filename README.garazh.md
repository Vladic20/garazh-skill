# garazh — cartoon reels from your own story, with Claude Code

A Claude Code skill + a small rendering engine that turns a one-line idea into a **vertical cartoon reel** (720×1280, 30 fps, 8–90 s) in a deadpan «garage IT-startup» style: flat 2D with thick brown outlines, warm film grain, karaoke subtitles, name badges with joke job titles, a Claude chat on a laptop screen, procedural foley and optional TTS voice-over.

Everything is code: SVG scenes are pure functions of time, rendered frame-by-frame in headless Chrome and encoded with ffmpeg. No paid video tools, no MCP servers.

![Contact sheet of the example episode «Какой миллион» (one frame per second)](docs/preview.jpg)

*Example episode `garazh` — «Какой миллион», 80 s, three characters, three voices: three guys build a «million-dollar startup» in a garage overnight, but every launch is killed by Tolyan's kettle tripping the breaker — until Claude, asked «which pain should we solve», answers: «Yours.»*

## Install

**As a plugin (recommended):**

```
/plugin marketplace add lubluniky/garazh-skill
/plugin install garazh@garazh-skill
```

No GitHub SSH key? Start Claude Code with `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`.

**Manually:** copy only the skill folder.

```bash
git clone https://github.com/lubluniky/garazh-skill
mkdir -p ~/.claude/skills/cartoon-reel
cp -R garazh-skill/plugins/garazh/skills/cartoon-reel/. ~/.claude/skills/cartoon-reel/
```

On first use the skill deploys the engine (the «studio») to `~/cartoon-studio` (override with `CARTOON_STUDIO=/path`) and runs `npm install` there.

### Requirements

- Node.js ≥ 18, ffmpeg
- Google Chrome — or set `CHROME_PATH=/path/to/chromium` (Linux/CI)
- ~10 GB of free disk space while rendering an 80 s reel: frames are written as PNG, then deleted
- macOS + iCloud: don't put the studio inside a synced «Documents» folder unless the folder name ends with `.nosync`. When the disk fills up, macOS evicts the sources to the cloud and renders fail with strange errors.

### Voice-over: you need ONE key — Fish Audio **or** OpenRouter

Voices are generated with the TTS model **fish-audio/drama-3**. Put one key into `<studio>/.env`; copy `.env.example` to start:

| Key | Where to get it | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys | TTS plus the `--check` pass (speech-to-text via `openai/gpt-transcribe`) that catches swallowed words |
| `FISH_AUDIO_API_KEY` | https://fish.audio (API keys) | TTS directly at Fish; private voices of your Fish account work too. `--check` is unavailable. *This path follows the Fish API docs and has not yet been tested with a real key.* |

- **No key is needed** for everything else, and lines that are already generated play from the cache. The example episodes ship with their voice cache, so they render with sound out of the box.
- Costs are tiny: about $2 per million bytes of text at OpenRouter.
- Voices are Fish Audio voice-model IDs (`voice.cast` in the timeline). Browse the public catalogue without a key: `curl -s "https://api.fish.audio/model?page_size=40&language=ru&sort_by=task_count"`. Please avoid voices that imitate real people.
- **Reference voice** of the main character Palych in the example: «Харизматичный Дед-Разработчик» — [`7076e45ce3234fd49ef40ffbd5a3f0cd`](https://fish.audio/m/7076e45ce3234fd49ef40ffbd5a3f0cd).

Keys live only in `.env`. It is git-ignored and never copied into the skill template.

## Use

Just ask Claude:

> Сделай мультик в стиле garazh про то, как айтишники в гараже пытаются запустить ИИ-стартап на шаурме. 40 секунд, с матом, мораль — «сначала клиенты, потом код».

> Make a 30-second garazh reel about a team that ships on Friday evening.

The skill walks Claude through the full pipeline:

1. **Script** (`script.md`): logline, cast with badge jokes, beat sheet about one beat per second. Claude shows you the logline, cast and ending before producing anything.
2. **Voices**: generate the lines and lay out the shots against the real line durations.
3. **Characters, set and props**: reuse the presets, and draw new art only when your story needs it.
4. **Timeline**: shots, camera, poses, chat on screen, scene state.
5. **Stills → preview contact sheet → fixes**, until the shots read well.
6. **Final render**: `--voice --sfx`, checked with ffprobe.

## Presets — what makes it reproducible

You don't start from a blank SVG. The engine ships with presets that render the style correctly out of the box. Your story is mostly data in `timeline.js`:

| Layer | Presets |
|---|---|
| **Episode starters** | `node new-episode.mjs myep --preset garage3` (3 characters, chat, close-up, about 10 s) · `garage1` (one character at the desk) · `blank` |
| **Stage layouts** | `stage: { preset: 'garage3' }` or `'garage1'`: the garage set, the characters placed, scene points (laptop, kettle, socket, breaker, lamp) |
| **Camera** | `cam: 'wide'` · `'two:tolyan+palych'` · `'cu:palych'` · `'cu+:sanek'` · `'mid:<who>'` · `'screen'`: automatic slow push-in, with `{preset, dx, dy, s}` overrides |
| **Gestures** | `{ t, pose: 'fingerUp' }` · `rest` `typing` `spread` `point` (`at: 'laptop' \| '<who>' \| [x,y]`) `reach` `kiss` `thumbsUp` `hold` (kettle/mug) `sip` `phoneWaist` `phoneUp` `phoneChin` `phoneDown` `down`; head: `nod` `shake` `left` `right` |
| **Characters** | Tolyan (tracksuit, cap, matchstick), Palych (beanie, mustache, glasses on the forehead), Sanek (hoodie, round glasses, phone); new ones follow the same `CHARS` contract |
| **Props & set** | night garage (bricks, window, lamp, breaker, tyres, workbench, desk), kettle, mugs, phone, socket and extension cord, blackout with a glowing nose |
| **Screen** | Claude chat: typed messages, «печатает…», buttons, cursor, progress bar, screen off |
| **Sound** | procedural foley recipes (room tone, crickets, clicks, pops, breaker thunk, 8-bit fanfare…) and TTS voice-over with a cache |
| **Render** | `--preview` (fast) · `--final` (2× supersampled) · `--voice --sfx`; frames are deleted after encoding |

Starters render immediately, **without any API key**: lines that aren't voiced yet still get subtitles and mouth movement timed by syllables.


### Commands (inside the studio)

```bash
node new-episode.mjs myep --preset garage3                    # new episode from a working starter
FRAMES_DIR=/tmp/st node render.mjs --ep myep --stills 1,3,5   # a few frames as PNG
node render.mjs --ep myep out/myep_preview.mp4 --preview      # fast full preview
node --env-file=.env render.mjs --ep myep out/myep.mp4 --final --voice --sfx
```

## What's inside

```
.claude-plugin/marketplace.json
plugins/garazh/
  .claude-plugin/plugin.json
  skills/cartoon-reel/
    SKILL.md               workflow Claude follows
    references/            style guide, engine/timeline API, reference contact sheets
    scripts/               bootstrap.sh (deploy the studio), sync-template.sh
    template/              the engine + example episodes: tolyan (8 s), garazh (80 s)
```

## Credits & license

- Code and docs: MIT, see [LICENSE](LICENSE).
- Fonts (Rubik, Pangolin, JetBrains Mono): SIL OFL 1.1, texts in `template/fonts/`.
- Style inspired by Russian «IT-startup in a garage» animated reels. All characters, art and jokes here are original.
- Example voices: Fish Audio voice models, used through their API under Fish Audio's terms.

---

## По-русски коротко

Скилл для Claude Code плюс движок. По вашему сюжету он делает вертикальный мультик в стиле «гаражный стартап»: сценарий, персонажи, озвучка, рендер.

Установка:

```
/plugin marketplace add lubluniky/garazh-skill
/plugin install garazh@garazh-skill
```

Дальше просто попросите Claude: «сделай мультик garazh про …».

Для озвучки нужен **один ключ: fish.audio или OpenRouter**. Положите его в `.env` студии. Без ключа работает всё, кроме генерации новых реплик. Голос главного героя примера («Харизматичный Дед-Разработчик», ID выше) можно использовать как эталон.
