# Cast & world: design the characters and places for each video

Every video gets its **own cast and world**, chosen by the meaning of the topic, not the default TV-head on grey paper every time. Design them first, before writing scenes.

## 1. Where the ideas come from

1. **The user's library cards** (`castAndWorld.library` from `bridge.mjs wait/show`; each card has kind, title, notes and absolute image paths). **Read every image.** Translate it into parts: silhouette → head and body; headwear → hat; colours → `color` / `accentParts` / theme accent; props → `hold`; place → `set`.
2. **The user's free-text ideas** (`castIdeas`, `worldIdeas`). Follow them literally where they are concrete.
3. **Invent the rest** (`inventTheRest: true`) from the topic's meaning:
   - **Protagonist = the viewer.** Make them relatable, not neutral: the tired student in a hoodie with a backpack, the office worker in a suit, the parent with coffee.
   - **Forces become characters.** The algorithm is a `phone`-headed figure, procrastination a `cloud` head, an idea a `bulb` head, money a `tophat` + `suit` + `briefcase`, AI a `robot`, fear a `mask` in a `robe`, social pressure a `crowd`.
   - **2–4 named characters per video.** Each has one silhouette difference people can read at thumbnail size: the head type, a hat, or a body. Don't vary five things at once.
   - **The world follows the story arc.** Pick 2–4 sets that change with the acts, e.g. bedroom (morning) → subway (commute) → office (pressure) → park (relief). Use `weather` for mood: rain for sadness, snow for stillness, leaves for passing time, wind for chaos.
   - Use real cues and avoid stereotypes: a role is shown by an object or outfit, never by ethnicity or caricature.

## 2. Write it into story.json

```json
"characters": {
  "me":   { "name": { "en": "You", "ru": "Ты" }, "desc": "tired student, always online",
            "head": "round", "hair": "spiky", "body": "hoodie", "back": "backpack", "hold": "phone" },
  "feed": { "name": "The Feed", "desc": "the algorithm that never sleeps",
            "head": "phone", "body": "stick", "face": "hypno" },
  "*":    { "head": "tv" }
},
"set": "bedroom",
"scenes": [
  { "say": "...", "cast": [{ "id": "me", "x": 420, "pose": "slump" }], "set": { "type": "bedroom", "night": true } },
  { "say": "...", "cast": [{ "id": "me", "x": 400 }, { "id": "feed", "x": 860 }], "set": "subway", "weather": "rain" }
]
```

- A cast entry inherits its look from `characters[id]`; use `"as": "feed"` to place a second copy with another id. `"*"` is the look for every unnamed figure, such as lineup or crowd extras.
- Scene fields `face`, `pose`, `x`, `then` work as before; a look field set on a cast entry overrides the design for that scene (e.g. `"hat": "party"` at the celebration).
- `name` and `desc` show on the storyboard's **Cast & world** sheet in the app (`make.mjs <ep> --cast`). Write them in the brief's languages.
- `set` and `weather` carry over to `keep: true` scenes. A story-level `set` is the default for every scene. Use `"set": null` for a clean paper scene, which is good for kinetic type.

## 3. Parts catalog (engine/looks.js)

| field | values |
|---|---|
| `head` | `tv` (default) · `crt` (old TV with knobs) · `monitor` · `phone` · `mask` · `round` (simple face) · `cat` · `bulb` (glows) · `cloud` · `box` (cardboard) · `robot` |
| `body` | `dress` (default trapezoid + chest icon) · `robe` (ragged) · `suit` (jacket + trousers) · `hoodie` · `coat` · `labcoat` · `shirt` (t-shirt + jeans) · `apron` · `stick` |
| `hat` | `beanie` · `cap` · `tophat` · `crown` · `hardhat` · `party` · `chef` · `grad` · `cowboy` · `headphones` · `halo` · `bow` · `wizard` · `hood` |
| `glasses` | `round` · `square` · `sun` · `monocle` · `vr` |
| `neck` | `tie` · `bowtie` · `scarf` · `medal` · `badge` |
| `back` | `backpack` · `cape` · `wings` · `jetpack` |
| `hair` (round/cat heads) | `short` · `long` · `bun` · `spiky` · `curly` (+ `hairColor`) |
| `hold` | `phone` · `heart` · `balloon` · `coffee` · `flower` · `briefcase` · `umbrella` · `book` · `key` · `star` · `magnifier` · `trophy` · `pencil` · `money` · `sign:Text` · `flag:Text` |
| `button` (chest icon on `dress`/`shirt`) | `power` (default) · `heart` · `star` · `dollar` · any 1–2 characters · `none` |
| colours | `color` (body/clothes), `skin` (round/cat head fill), `legColor`, `accentParts: true` (hat/tie etc. in the theme accent) |

Faces and poses are unchanged (see story-api.md). On `round`/`cat`/`bulb`/`cloud`/`box` heads the face draws directly on the head.

## 4. Sets catalog (engine/sets.js)

| `set` | options | reads as |
|---|---|---|
| `room` | `night`, `lamp`, `curtains: false`, `frame: false`, `view: "city"` | home, thinking |
| `bedroom` | `night` | mornings, insomnia, rest |
| `office` | — | work, pressure, routine |
| `classroom` | `text` (chalk on the board) | learning, school, exams |
| `cafe` | — | social life, dates, freelancing |
| `kitchen` | — | home routine, food, family |
| `city` | `night`, `seed` | society, ambition, crowds |
| `street` | `night` | commute, loneliness at night |
| `subway` | — (the city outside scrolls) | commute, being stuck in motion |
| `forest` | `seed` | nature, getting lost, calm |
| `park` | `seed` | relief, a walk, the turn |
| `sea` | `night`, `boat` | freedom, distance, waiting |
| `mountains` | `seed` | goals, effort, perspective |
| `desert` | — | emptiness, burnout, drought |
| `space` | `ground: true` to keep a floor | scale, loneliness, the future |
| `stage` | — | performance, judgement, imposter feelings |
| `garage` | `dim` 0–1, `lamp: false`, `cone` 0–1, `window: false`, `tires: false` | warm night workshop: makers, side projects, friends; the home of the cartoon style |
| `desk` | `top` (y of the table edge), `mug: false`, `plant: false` | close-up on a table: put a `screen` prop (laptop with a live chat / app / terminal) on it |
| `blackout` | `x` (spotlight), `light: false` | a dramatic cold open, a confession, the punchline in the dark |
| `motel` | `neon` colour, `lamp: false` | noir: a dark room, pink neon through blinds, cash bags on a floral bed |
| `bank` | — | noir: stone columns, steps, a flag, by day |
| `strip` | — | noir: night storefronts (laundromat, ATM), wet parking lot |
| `card` | `tone: "light"` (cream) / `"dark"` | noir: a plain card for headlines and infographics |
| `lane` | `team`, `seed` | dota: forest lane at dusk, river, team towers |
| `ancient` | `team: "radiant"`/`"dire"`, `x` | dota: glowing core on a stepped stone base |
| `arena` | — | dota: rune circle, torches on pillars |
| `baseplate` | `trees: false` | blocks: studded green plate, blocky clouds and trees |
| `obby` | — | blocks: floating bricks over lava, a checkpoint flag |
| `pixelworld` | — | pixel: sky, hills, ? blocks, a pipe, brick ground |
| `dungeon` | — | pixel: stone bricks, torches |
| `burst` | `colors: [a, b]` | comic: radial rays behind an action beat |
| `skyline` | `seed` | comic: flat-colour city under a dotted sky |

Character kinds besides the TV head: `"kind": "cube"` (clay box mascot that hops; `color`, `hat: "candle"`) and `"kind": "blocky"` (brick figure; `skin`, `color`, `legs`, `hat: cap/crown/headphones`). Fantasy parts: hats `helm`, `horns`, `hood2`; body `armor`; held `sword`, `staff` (`staff:#ff6a3a` = orb colour), `shield`.

Weather: `rain` · `snow` · `leaves` · `wind`, each with `{ "type": "rain", "amount": 1.5 }`. `dark: true` on a scene still works on top of any set (night).

Sets fill the lower part of the frame and leave the top for kinetic type. In 9:16 they scale to the tall frame automatically.

## 5. When the catalog is not enough: draw it

When the idea needs a part or place that doesn't exist (a pirate hat, a hospital, a fish head), add it in an episode script and register it. It then works everywhere like a built-in:

```js
// episodes/<ep>/art/parts.js   →  story.json: "scripts": ["art/parts.js"]
HATS.pirate = (c, top, w) => `<path d="M${-w - 16} ${top + 8} Q0 ${top - 50} ${w + 16} ${top + 8} Z" fill="${INK}"/>
  <path d="M-8 ${top - 14} l16 0 M0 ${top - 22} v16" stroke="${WHITE}" stroke-width="3"/>`;
HEADS.fish = (c, t, phase, look) => ({ top: -40, eyeY: -6, w: 60,
  svg: `<path d="M-60 0 Q-10 -50 40 0 Q-10 50 -60 0 Z M40 0 L70 -24 L70 24 Z" fill="${WHITE}" stroke="${INK}" stroke-width="4.5"/>
        <circle cx="-20" cy="-6" r="6" fill="${INK}"/>` });
SETS_LIB.hospital = (o, t) => ({ back: `<rect x="${W * .1}" y="${GROUND - 400}" width="${W * .8}" height="400" fill="${WHITE}" stroke="${INK}" stroke-width="3"/>
  <path d="M${CX - 20} ${GROUND - 360} h40 M${CX} ${GROUND - 380} v40" stroke="${ACCENT}" stroke-width="10"/>` });
```

Contracts:
- `HEADS[name](c, t, phase, look, wig)` returns `{ svg, top, eyeY, w }`, centred on the head.
- `BODIES[name](c)` returns `{ svg, legs: 'lines' | 'trousers' }`; feet at 0, shoulders at y ≈ −238.
- `HATS` / `GLASSES` / `NECKS` / `BACKS` / `HELD` return SVG strings.
- `SETS_LIB[name](o, t)` returns `{ back, front?, noGround? }` in world coordinates. Use `W`, `H`, `GROUND`, `CX`, `PORTRAIT` so the set also works in 9:16.

Keep the doodle language: `INK` outlines 3–5 px, flat `WHITE`/`PAPER` fills, one `ACCENT`, no gradients, no `Math.random` (use `rng(seed)`).

Visual catalog: `references/images/parts_sheet.jpg` (character parts on 8 figures) and `references/images/sets_sheet.jpg` (all 16 sets with weather).

## 6. Check

`node make.mjs <ep> --cast` renders the model sheet: each character with its name, then one frame per set. **Read it before the storyboard.** Silhouettes should be different at a glance, nothing should overlap, and the sets should not compete with the cast. The app shows the same sheet to the user above the storyboard.
