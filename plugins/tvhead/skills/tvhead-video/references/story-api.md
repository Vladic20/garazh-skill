# story.json — the whole API

A film is a list of **scenes**. Each scene = one narration line (`say`) + one picture. Timing is automatic:
the scene lasts as long as its voice clip plus a short pause, so you never write seconds by hand.
Things inside a scene appear **on a spoken word** (`"on": "word"`), which keeps picture and voice in sync.

**Languages.** Any text value may be `{ "en": "...", "ru": "..." }` — `say`, `text`, `note`, labels, list items and even cue words (`"on": { "en": "scroll", "ru": "ленту" }`). One story renders one video per language with the same pictures and its own voice and timing. Cue words must be in that language's line; when they are not, the item falls back to `at` (so give multilingual items an `at` as well, or use `at` only).

World: 1280×720 (rendered 1920×1080). Ground line at `y = 615`. Centre `x = 640`. A character at `scale: 1` is ~395 px tall (feet on the ground, antenna tip at y ≈ 220).
Vertical videos (`"format": "9:16"`) use a 720×1280 world (rendered 1080×1920); you still write 16:9 coordinates, see **Vertical 9:16** below.

## Top level

| key | default | meaning |
|---|---|---|
| `title` | — | shown in the app; not drawn |
| `look` | `doodle` | the look: `doodle`, `cartoon`, `desk3d`, `noir`, `dota`, `blocks`, `pixel` or `comic` (see "Looks" below). `doodle` = pencil on paper, boiling lines; `cartoon` (warm flat colour after the garazh cartoon reel: thick brown outlines, tube arms with hands, coloured clothes, dust in lamp light, karaoke captions on a dark plate). `cartoon` defaults to `theme: "garage"`, `captions: true`, `music: "lofi"` and soft whooshes instead of paper flips. See "Cartoon look" below |
| `format` | `16:9` | `16:9` (1920×1080, YouTube) or `9:16` (1080×1920, Shorts / Reels / TikTok); also `landscape` / `portrait`. `node make.mjs <slug> --format 9:16` renders any story the other way without editing it |
| `remap` | `true` | 9:16 only: `false` = plain numbers are already 720×1280 world coordinates (write this when the story is vertical-only) |
| `languages` | detected from `say` | `["en"]`, `["ru"]` or `["en", "ru"]` |
| `voice` | per language: EN `bf322df2096a46f18c579d0baa36f41d` (Adrian), RU `868377a7b08f4c0d9acf8c9f059571aa` (Молодой Аналитик); .env `TVHEAD_VOICE_EN` / `TVHEAD_VOICE_RU` | Fish Audio voice id (`fish.audio/m/<id>`), or `{ "en": "<id>", "ru": "<id>" }` |
| `model` | `fish-audio/s2.1-pro-free:free` (**free**) or .env `TVHEAD_TTS_MODEL` | any OpenRouter TTS model; paid, more acted: `fish-audio/drama-3` |
| `theme` | the look's palette | `paper` · `sepia` · `blueprint` · `chalk` · `night` · `mint` · `garage` · `desk` · `noir` · `dota` · `blocks` · `pixel` · `comic`, or `{ "preset": "paper", "paper": "#…", "ink": "#…", "accent": "#…", "fill": "#…", "bezel": "#…", "screen": "#…" }` (built from a reference image) |
| `transition` | `curve` | default seam into each new scene (see Transitions) |
| `direction` | `left` | the film's "current" for `curve`/`whip`/`wipe`/`page` |
| `scripts` | — | episode JS files with custom GSAP props (`references/motion.md` §6) |
| `style` | — | delivery direction prepended to every line, e.g. `"calm, low, reflective"` (skipped for lines that start with their own `[tag]`) |
| `mood` | `dark` | drone under the voice: `dark` · `calm` · `tense` · `hope` · `none` |
| `music` | the look's default | generated for free, no samples: `lofi` (electric piano, dusty swung drums, bass, vinyl) · `ambient` (pads + soft piano, no drums) · `upbeat` (bright chords, arpeggio, claps) · `chiptune` (square lead, noise drums) · `synthwave` (saw pads, pulsing bass, gated snare) · `epic` (brass, strings, taiko), or `{ "preset": "lofi", "bpm": 80, "volume": 0.5 }`; or a path (relative to the episode folder) to an mp3 to loop; `false` = none. The music follows the film: drums enter after the intro, drop out in dark / `blackout` scenes, a swell + kick lands on `zoom`/`iris`/`whip`/`pull` seams, the last bars resolve; ducked under the voice. A generated track replaces the `mood` drone |
| `captions` | `false` | burn karaoke captions into the video (an `.srt` is always written next to the mp4) |
| `pace` | `1` | multiplies the pause after every line (0.7 = snappier, 1.4 = slower) |
| `pause` | `0.38` | seconds of silence after each line |
| `outro` | `1.4` | extra hold on the last picture |
| `particles` | `1` | floating doodle density 0–2 |
| `flips` | `true` | soft paper-flip sound on every cut (a soft whoosh in cartoon style) |

## Scene

| key | meaning |
|---|---|
| `note` | one line describing the picture — shown on the storyboard card in the app. Always write it. |
| `transition` | seam into this scene: `curve` · `zoom` · `pull` · `whip` · `iris` · `wipe` · `page` · `fade` · `cut` · `none`, or `{ "type": "curve", "dir": "up" }`, `{ "type": "iris", "at": [x, y], "from": [x, y] }`. `keep` scenes default to `none`. |
| `say` | narration. Direction tags allowed: `[whispering]`, `[sad, barely holding it together]`, `(sighs)`, `<emphasis>word</emphasis>`. Tags are not shown in captions. 6–22 words per scene is the sweet spot. |
| `layout` | shortcut that places characters/props: `solo`, `duo`, `lineup` (+`count` 2–6), `crowd`, `pile` (mask figure on a mound of TVs holding up an endless feed), `title` (big kinetic statement of the line, id `title`) |
| `cast` | characters (below). A cast entry with the same `id` as a layout figure overrides it (`p1…pN` for lineup, `hero` for solo/crowd/pile, `a`/`b` for duo) |
| `props` | objects (below) |
| `keep` | `true` = continue the previous picture: same characters/props in their final state, no re-entry animation. Combine with `change`, `remove`, new `cast`/`props` |
| `change` | timed changes for kept items: `[{ "id": "p1", "on": "word", "face": "sad", "pose": "slump" }]` |
| `remove` | ids to drop when `keep`ing |
| `cam` | `push` (default slow zoom-in) · `push-fast` · `pull` · `still` · `drift` · `pan-left` · `pan-right` · `up` · `down` · `{ "focus": [x, y], "zoom": 1.4 }` · `{ "from": [cx,cy,s], "to": [cx,cy,s] }` |
| `dark` | night look: paper goes dark grey (pair with a `spotlight` prop) |
| `ground` | `false` hides the ground line |
| `particles` | per-scene doodle density |
| `speaker` | id of a character whose mouth moves with this line (default: narrator, nobody's mouth moves) |
| `hold` | extra seconds on this picture after the line |
| `pause`, `lead` | per-scene overrides of the pause after / delay before the voice |
| `dur` | length of a scene **without** `say` (default 2.2 s) — a silent visual beat |

## Timing cues (characters, props, changes)

- `"on": "scroll"` — at the moment that word is spoken (first occurrence; `"scroll#2"` = second). Prefix match for words ≥ 4 letters (`"connect"` hits "connected").
- `"at": 0.5` — at that fraction of the scene.
- `"delay": 0.8` — seconds after the scene starts.
- nothing — appears at the cut.
- `"outOn"` / `"outAt"` / `"out"` (seconds) — when it disappears.
- `"then": [{ "on": "word", "face": "shock" }, { "at": 0.8, "x": 900, "dur": 1.2 }]` — changes over time on the same item. Numbers (`x`, `y`, `scale`, `rot`, `opacity`) animate over `dur` (default 0.6 s); `pose` blends over 0.3 s; everything else switches instantly.

## Cast & world (full guide: cast-and-world.md)

- Top level `"characters": { "<id>": { "name", "desc", "head", "body", "hat", "glasses", "neck", "back", "hair", "hold", "button", "color", … } }`. Cast entries with that `id` (or `"as": "<id>"`) inherit the design; `"*"` is the default look for unnamed figures. `name`/`desc` show on the app's cast sheet.
- Scene `"set"`: `room` · `bedroom` · `office` · `classroom` · `cafe` · `kitchen` · `city` · `street` · `subway` · `forest` · `park` · `sea` · `mountains` · `desert` · `space` · `stage`, or `{ "type": "city", "night": true }`. Use `null` for a clean page; a top-level `set` is the default.
- Scene `"weather"`: `rain` · `snow` · `leaves` · `wind` (or `{ "type", "amount" }`). `set`/`weather` carry over to `keep` scenes.
- `node make.mjs <ep> --cast` renders the model sheet (characters with names, then one frame per set).

## Characters

```json
{ "id": "me", "x": 640, "face": "happy", "pose": "idle", "kind": "tv", "scale": 1, "flip": false, "hold": "phone", "enter": "pop" }
```

- `kind`: `tv` (TV head, black dress with power button) · `mask` (white oval mask, ragged robe). `robe: true` gives a tv figure the ragged hem. `arms: "coil"` = springy zig-zag arms. `button: false` hides the power icon. `color` changes the dress (e.g. `"#f1f2f1"` for a white "different one").
- `face`: `happy` `neutral` `blank` `sad` `shock` `tired` `angry` `cry` `love` `dead` `hypno` `joy` `worried` `smug` `awe` · screen states `static` (TV noise) and `off` (black screen).
- `pose`: `idle` `wave` `raise` `point` `up` `head` (hands on head) `facepalm` `shrug` `hip` `phone` `hold` `think` `cross` `reach` `cheer` (bouncing) `slump` `walk` `run` `sit`.
  Move while walking: `"pose": "walk", "then": [{ "delay": 0, "x": 1000, "dur": 3 }]`.
- `hold` (right hand): `phone` · `heart` · `balloon` · `coffee` · `flower` · `sign:Your text`.
- `tilt` (deg), `look: "down"`, `y` (default 615 = standing on the ground), `z` (draw order).

## Props

Every prop takes `x`, `y`, `scale`, `rot`, `flip`, `enter`, `z`, cues and `then`. Standing props anchor at their **bottom centre** (default `y` = ground); floating icons anchor at their **centre** (default `y` = 300).

| type | options |
|---|---|
| `text` | `text` (use `\n` for lines), `size` (64), `align`, `underline`, `outline`, `color: "white"`; types itself in by default |
| `tv` | `face` (`static` default, `off`, or any face) |
| `tvpile` | `width` (620), `height` (300) — mound of static TVs, anchor bottom (default y 790, below frame edge) |
| `feed` | endless scrolling social feed column: `height`, `width`, `speed` |
| `phone` | big phone: `screen` = `feed` · `static` · `heart` · `off` · `text:Words` |
| `like` | notification bubble with heart: `count` |
| `bell` | ringing bell, optional `count` badge |
| `heart` | `fill: "black"`, `broken: true`, `beat: false` |
| `bubble` | speech/thought bubble, anchor = tail tip: `text`, `kind: "thought"`, `dir: "right"`, `size` |
| `arrow` | `from: [x,y]`, `to: [x,y]` (world coords), `curve` (0.2) — draws itself |
| `chart` | `trend`: `up` `down` `crash` `zigzag` `flat`; `w`, `h`, `drawDur` |
| `clock` | `speed` (8 = time flying) |
| `hourglass` | `dur` (seconds to run out) |
| `battery` | `level` 0–1, `drain` (seconds to empty) |
| `coin` · `money` (`count`) · `crown` · `target` · `check` · `cross` · `lock` |  |
| `bulb` (`lit: false`) · `brain` · `eye` (blinks, looks around) · `question` · `exclaim` (`size`) |  |
| `cloud` (`rain: false`, `dark`) · `sun` · `moon` |  |
| `chain` (`links`, `ball`) · `scribble` (`r`) — anxious pencil mess |  |
| `door` (`open`, `light`) · `stairs` (`steps`, `stepW`, `stepH`) · `house` (`lit`) · `bed` · `laptop` (`screen: "static"`) | standing |
| `crowd` | rows of small TV heads: `rows`, `cols`, `width`, `face` |
| `spotlight` | cone of light from the top onto `x`; `w` = half-width of the pool. Use with `"dark": true` |
| `sign` | white board with `text`, `size`, `w`, `h` |
| `words` | kinetic type: each word rises in when it is spoken. `text` (default: the scene's `say`), `emph: ["word"]` (accent + scribble underline), `size` (76), `maxWidth` (1040), `align` |
| `counter` | number counting up: `from`, `to`, `dur`, `prefix`, `suffix`, `decimals`, `label`, `accent`, `size` — real numbers only |
| `bars` | bar chart: `values`, `labels`, `hi` (index to highlight), `w`, `h`, `step`, `prefix`, `suffix` |
| `pie` | `value` 0–1, `r`, `label` |
| `progress` | `value` 0–1, `w`, `label` |
| `timeline` | `items`: `["2007", …]` or `[{ "label", "sub" }]`, `w`, `step`, `hi` |
| `checklist` | `items`, `step` (s between ticks), `checked`, `size` — anchor = left edge |
| `grid` | rows×cols of small TV heads, one breaks the pattern: `rows`, `cols`, `cell`, `face`, `odd` (index), `oddFace`, `oddAt` (s) — anchor = bottom centre |
| `photo` | the user's image as a taped grayscale polaroid: `src: "refs/<file>"`, `w`, `h`, `caption`, `color: true` |
| `badge` | name card (lower third): `text` (big name), `role` (coloured chip under it, e.g. "CHIEF SCEPTIC"), `color`, `size` (54), `tilt` (−4) — introduce each hero once |
| `screen` | a device with a **live screen**: `frame` = `laptop` (default; base reaches `h/2 + 62` below the centre, rest it on the `desk` table) · `window` (app window, `title`) · `phone` · `none`; `w` (560), `h` (350); `show` = what plays on it (below). Origin = centre of the display |
| `notes` | music notes floating up: `n` (5), `spread` (120), `color` |
| `lottie` | an **After Effects** animation (Lottie JSON from Bodymovin / LottieFiles), played frame-accurately: `src` (`pack:check` · `burst` · `loader` · `heart` · `arrow` · `sparkle` · `pin` · `confetti`, or a file in the episode folder), `w`, `h`, `loop`, `speed`, `from`, `to` — see `references/after-effects.md` |

**`screen` contents** (`show`). Timed entries take `on` / `at` / `delay` like any cue (resolved to absolute times); later scenes add entries with `change: [{ "id": "<screen id>", "addChat" | "addSteps" | "addLines": [ … ] }]`.
- `chat` — a Claude chat: `chat: [{ "from": "user" | "claude", "text", "delay": 1.5, "button": "Run", "click": { "delay": 4 }, "progress": { "dur": 2, "label": "Rendering", "doneLabel": "✓ done" } }]`. User lines type into the input box and jump up as a bubble at their time; Claude lines show typing dots for 0.9 s, then type out; a button appears when the text is done, a cursor flies to it and clicks at `click`; a progress bar runs after the click. `fs` (19), `labels: { "title", "ph" }`, `dw` (design width: 560, phones 340 = bigger text).
- `app` — the tvhead studio app: `steps: [{ "view": "brief" | "board" | "render" | "done", "delay": 0 }]`, `topic` (typed in), `langs` (["EN","RU"]), `styleName`, `ui` ("EN"/"RU"), `labels` (`topic`, `voice`, `style`, `refs`, `go`, `board`, `drawing`, `drawn`, `render`, `rendering`, `done`, `files`). The button of each view is pressed (cursor + click) just before the next step.
- `code` — a terminal: `lines: [{ "text", "kind": "cmd" | "out" | "ok" | "err", "delay" }]` — commands type out, output appears at once; `title`, `fs` (16). Add `hands: true` (+ `sleeve`, `skin`) on a laptop for typing hands.
- `video` — a finished doodle video playing (grey paper, a TV-head figure): `word`, `len`.
- `off` — dark screen with a reflection.

`enter`: `pop` (default) · `fade` · `drop` · `rise` · `slide-left` · `slide-right` · `grow` · `write` (text) · `none`. `exit`: `pop` · `fade`.

## Looks

| look | what it is | sets | characters | best props | default music |
|---|---|---|---|---|---|
| `doodle` | pencil on grey paper, boiling lines, B&W | all doodle sets | TV heads and parts | words, infographics | drone |
| `cartoon` | warm night-garage cartoon (below) | garage, desk, blackout | outlined, coloured | badge, screen, notes | lofi |
| `desk3d` | a dark UI slab lying on a wooden desk, filmed by a moving 3D camera with depth of field; characters stand upright on it | — (the slab is the world) | `"kind": "cube"` clay mascot (`hat: "candle"`) | `screen` with `frame: "none"` filling the slab: `tweet`, `timeline`, `daw`, `prompt`, `chat`, `app`, `code`; big `text` titles | upbeat |
| `noir` | illustrated neon-noir explainer: painted scenes alternating with clean cards | motel, bank, strip, card (`tone: light/dark`) | `head: round, hat: cap, body: hoodie, back: backpack` | headline, hud, billgrid, stamp, marker, counter | synthwave |
| `dota` | dark-fantasy MOBA: Radiant green vs Dire red, gold serif type, embers | lane, ancient (`team`), arena | `hat: helm/horns/hood2`, `body: armor/robe`, `hold: sword/staff/shield` | unitbar, abilities, gold, banner, minimap | epic |
| `blocks` | brick-built game (Roblox-like) | baseplate, obby | `"kind": "blocky"` (skin = head + arms, color = torso, legs; hat cap/crown/headphones) | leaderboard, chatbox, pickup, hotbar | upbeat |
| `pixel` | 8-bit game: the whole frame is pixelated (`"pixel": 8` = block size), scanlines, RPG dialog-box captions | pixelworld, dungeon (any set works) | any (TV heads read well) | pickup, text | chiptune |
| `comic` | comic-book page: heavy ink, halftone, panel border, yellow caption boxes | burst (`colors`), skyline (any set works) | any outlined figure (`back: cape`) | pow, speedlines, text | upbeat |

Per-scene `"cam3d"` (desk3d only): `tilt` · `left` · `right` · `close` · `wide` · `top` · `low` or `{ "rx": 40, "rz": -15, "s": 1.2, "x": 0, "y": 30 }`; without it the camera cycles through presets and glides between scenes. Use `"transition": "cut"` in desk3d: the camera glide is the transition.

**Props of the new looks** (all work in any look):
- `headline` — eyebrow (mono caps) + bold headline + sub, words in `accent` coloured: `{ eyebrow, title, sub, accent: ["word"], size, tone: "light" (white text), maxWidth }`.
- `hud` — row of dark chips counting up: `{ items: [{ label, from, to, prefix, suffix, accent }], cellW, dur }`.
- `billgrid` — banknotes popping in a grid: `{ rows, cols, bill: [w, h], step }`. `stamp` — accent label: `{ text, sub, color, tilt }`. `marker` — ring drawing itself: `{ r, color }`.
- `pow` — comic starburst: `{ text, fill, color, r, spikes, tilt }`. `speedlines` — radial action lines: `{ r0, r1, n, color }`.
- `leaderboard` `{ title, col, rows: [[name, value]], hi }` · `chatbox` `{ lines: [[name, text, colour]], step }` · `pickup` (`+1` coin) `{ text, color }` · `hotbar` `{ slots: [...], active }`.
- `unitbar` `{ name, level, hp: [from, to], mp: [from, to], team: "radiant"|"dire" }` · `abilities` `{ keys: "QWER", icons, cast (index), castAt (s), cooldown }` · `gold` `{ amount }` · `banner` `{ text, sub, color }` · `minimap` `{ size }`.

**More `screen` contents**: `tweet` `{ name, handle, text, highlight: ["phrase"], hlAt, stats: [replies, reposts, likes, views], time }` (phrases get a yellow marker one after another) · `timeline` `{ title, sub, layers }` (motion-editor: glowing title, layer bars, moving playhead) · `daw` `{ bpm, tracks }` (step sequencer lighting on the beat, piano roll, mixer meters) · `prompt` `{ text, hint }` (typed into an input box).

## Cartoon look (`"look": "cartoon"`)

The warm look of a night-garage cartoon (look at `references/images/cartoon_sheet.jpg`). Same story API; what changes:
- **Figures**: every character gets a thick brown outline, tube arms with skin-tone hands (`skin`), coloured clothes (`color`, or a palette colour picked from the id), trousers (`legs`), a TV casing colour (`bezel`), blush on screen faces. No line boil.
- **Places**: use the warm sets `garage` (night garage: brick wall, window on a city at night, pegboard, shelf with an old TV, hanging lamp with a light cone, `dim`, `lamp: false`, `cone`), `desk` (close-up table edge under a dim wall, `top` = y of the table; put a `screen` on it) and `blackout` (darkness with one spotlight, `x`; `light: false` = black). The doodle sets still work, recoloured.
- **Type**: `text` / `words` / `counter` are drawn in rounded Pangolin, cream with a thick brown outline, so they read on dark walls. Introduce heroes with `badge`.
- **Sound**: lo-fi music by default; karaoke captions on (words appear as they are spoken, the current one in yellow).
- **Recipe that works** (the promo episode `episodes/promo`): open on `blackout` with the hero in the spotlight and a `badge` → `iris` into the `garage` → `zoom` into a `desk` + `screen` for anything on a computer (chat, app, terminal) → back to the garage for reactions → a title card → a joke button (lamp off).

## Vertical 9:16

`"format": "9:16"` renders 1080×1920 from a 720×1280 world. Ground at `y = 940`, centre `x = 360`; figures default to `scale: 1.2`. Everything is laid out for you:

- **Coordinates.** Write the story in 16:9 numbers as usual. In 9:16 they are mapped: `x → 360 + (x − 640) × 0.5625` (squeezed toward the centre) and `y → y × 1.53` (the ground stays the ground, things above it spread over the taller sky). This applies to `x`, `y`, arrow `from`/`to`, `then`/`change` moves, `cam` points and iris `at`/`from`. Defaults follow the world (standing props on y 940, floating icons at y 460, `words` at y 600).
- **Exact placement.** Any value can be given per format: `"x": { "16:9": 900, "9:16": 560 }`, `"layout": { "16:9": "lineup", "9:16": "solo" }`, `"cam": { "16:9": "pan-left", "9:16": "up" }`. A format-keyed value is used as-is (no mapping) — use it when the mapped position overlaps something. With `"remap": false` every plain number is a 720×1280 coordinate.
- **Layouts re-laid:** `solo`/`duo` (x 195 / 525) at 1.2×, `lineup` closer and smaller (0.8 for 3–4, 0.66 for 5–6), `crowd` narrower, `pile` taller (mound fills the bottom, the feed reaches past the top), `title` narrower (size 80, wraps at 620 px).
- **Type and infographics wrap narrower:** `words` wrap at 620 px, `text` shrinks to fit the frame, `timeline`/`progress`/`chart`/`bars`/`crowd` widths are capped, a wide `grid` (e.g. 3×7) is transposed to 7×3 and resized (the `odd` one stays the same figure).
- **Camera presets** are re-centred and kept inside the frame (`pan-*` and `up`/`down` zoom 1.1–1.12 so the travel fits); `focus` points are clamped the same way.
- **Captions** (`captions: true`) wrap to ≤ 600 px, ≤ 5 words per phrase, on a soft paper slip 238 px above the bottom — clear of the Shorts/Reels/TikTok UI. Keep important things between y ≈ 120 and 1040; the strip under the ground is caption space.
- Compose for the tall frame: text and infographics in the top third, figures in the middle, one or two subjects per picture. A 16:9 story usually works unchanged; check the sheet and fix collisions with format-keyed values.

## Patterns that work

- **Reveal on the key word**: put the metaphor prop on the word that names it — `{ "type": "chain", "on": "trapped" }`.
- **Same picture, new beat**: next scene with `"keep": true` and a `change` — cheaper for the eye than a new cut every line.
- **Before/after**: two scenes, same layout, second one `keep` + faces switch to `static`.
- **Push into a detail**: `"cam": { "focus": [x, y], "zoom": 1.5 }` on the thing being talked about.
- **Silent beat**: a scene with no `say`, `"dur": 1.5` — lets a strong image land.
- Keep characters inside x 180–1100 and text above y 200 so nothing touches the frame edge.
