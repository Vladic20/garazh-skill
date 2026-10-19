# tvhead — topic in, narrated doodle video out (Claude Code skill)

Fork of [lubluniky/garazh-skill](https://github.com/lubluniky/garazh-skill) with a new plugin, **tvhead**. Ask Claude for a video about anything and get a finished **1920×1080 mp4 with English voice-over** in a hand-drawn black-and-white style: TV-headed stick figures on grey paper, floating pencil doodles, wobbly lines, film grain.

![One frame per scene of the demo episode «The Infinite Scroll»](docs/tvhead-preview.jpg)

- **Voice:** Fish Audio TTS (`fish-audio/drama-3`) **via OpenRouter**, with any Fish voice. Clone your own voice or pick one from the library on fish.audio (free), then use its id from `fish.audio/m/<id>`.
- **Sync:** word timestamps from `fish-audio/transcribe-1`, so things on screen appear exactly on the spoken word, and an `.srt` comes out next to the mp4.
- **Code, not video AI:** SVG frames rendered in headless Chrome, mixed with ffmpeg. No paid video tools. About 30 s of render time for 35 s of 1080p film on a 16-thread CPU.

## Install

```
/plugin marketplace add Vladic20/garazh-skill
/plugin install tvhead@garazh-skill
```

Needs Node ≥ 18, ffmpeg and Google Chrome (or `CHROME_PATH`). On first use the skill deploys its studio to `~/tvhead-studio` (override with `TVHEAD_STUDIO`).

### One key

Put an OpenRouter key into `~/tvhead-studio/.env`:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

Get one at https://openrouter.ai/keys. Drama-3 costs about $2 per million characters, so a 90-second video is under a cent. `FISH_AUDIO_API_KEY` works too: the voice is the same, but caption timing is estimated.

Optional default voice for every video: `TVHEAD_VOICE=<fish id>` in the same `.env`.

## Use

Just ask:

> Сделай видео на тему «почему мы постоянно устаём», ~60 секунд
>
> Make a video about the psychology of procrastination, use voice 8ec9973300874562962bbcb300f82213

Claude writes the script and storyboard (`story.json`), checks a contact sheet of the frames, renders and sends you the mp4. Ask for edits afterwards ("make scene 3 darker", "slower voice", "add captions"). Only changed lines get re-voiced.

### By hand (inside `~/tvhead-studio`)

```bash
node make.mjs demo --stills auto   # one frame per scene → episodes/demo/build/sheet.png
node make.mjs demo --preview       # fast 720p draft
node make.mjs demo                 # final 1080p → out/demo.mp4 + out/demo.srt
node voices.mjs deep calm          # search Fish voices (no key needed)
```

The full story format is in [`plugins/tvhead/skills/tvhead-video/references/story-api.md`](plugins/tvhead/skills/tvhead-video/references/story-api.md).

## What's inside

```
plugins/tvhead/skills/tvhead-video/
  SKILL.md                 the workflow Claude follows
  references/              story.json API, writing guide, reference contact sheet
  scripts/bootstrap.sh     deploy / refresh the studio
  template/
    make.mjs               one command: voice → timeline → frames → mix → mp4
    voices.mjs             Fish voice search
    lib/                   story → timeline, TTS + alignment, audio bed + mix, parallel frame capture
    engine/                SVG drawing: paper, doodles, characters, ~40 props, camera
    episodes/demo/         example story
plugins/garazh/            the original vertical «garage» reels skill (unchanged, see README.garazh.md)
```

## License

MIT (see [LICENSE](LICENSE)). The Patrick Hand font is under SIL OFL 1.1 (`template/fonts/OFL-patrickhand.txt`). Voices are Fish Audio voice models used through their API under Fish Audio's terms. Don't use voices that imitate real people without their consent.
