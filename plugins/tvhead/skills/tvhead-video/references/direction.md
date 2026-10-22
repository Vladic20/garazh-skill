# Direction, motion quality and acceptance

Three working rules for every video, story.json episode or code-rendered film. They come before any technique below.
(Adapted in our own words from the ideas of the Breakout Motion skill and from what our own renders taught us.)

## 1. Quality by default

- **The camera lives** while the story is active: one connected path with waves of speed (no ease-in-out to a dead stop on
  every accent), motivated tilts, diagonals, arcs, slight rolls. Readable holds and the final frame may rest.
- **Depth**: foreground, middle and background differ in scale, overlap and relative speed. A single linear zoom of a flat
  frame is not camera work.
- **Type acts**: words assemble, change width, get masked, collide with objects, push each other. Design the readable final
  layout first, then its motion. One key word in the accent colour.
- **Weight**: anticipation → action → contact → reaction → settle, with different masses and curves; secondary objects react
  after the event. Micro UI snaps, panels settle, headlines hit and hold, the mascot is playful.
- **Optics where it is spatial**: motion blur from the relative screen motion during the exposure (it fades as things brake),
  depth of field on the chosen plane. In `films/` both come for free from accumulation (`samples`). A radial/zoom blur is a
  stylised accent, not a substitute. Never blur text the viewer must read.
- **Sound is part of the staging from the start**: music with a motif, development and an ending, plus SFX tied to contact,
  material and transitions. A pile of whooshes is not a score; don't put the same whoosh on every cut.

## 2. Direct before you build

1. From the brief: goal, viewer, the one sentence they must remember, required text, format, length, sound, allowed assets.
   Never invent product facts, prices or metrics.
2. One thread: what acts, what changes, what the result proves.
3. Variants by weight: opening, finale, the key scene and big seams get 3–5 genuinely different ideas (different action,
   space, metaphor or transition: a new colour is not a new idea); ordinary scenes 2–3; short links 1–2. Pick the strongest
   for the whole; write down only the choice and a one-line reason.
4. A plan card for **every** scene:

| Field | Write down |
|---|---|
| Time and meaning | interval, the accent, its role in the story |
| States and action | before → trigger → what the hero does → reaction → result |
| Space | composition, foreground / middle / background, light, material |
| Text | the exact words, how they move, the reading window |
| Camera and optics | path, target, speed, framing, focus, blur |
| Links | entry from the previous shot, what carries the cut, exit to the next |
| Sound | bar / beat, SFX, the synced event (or explicit silence) |
| Check | main risk, how you will actually check it, the fallback |

5. **Probe the riskiest moment** through the same path as the final (`node render.mjs probe 7.5:9`), with sound if sound is
   the risk. A probe never replaces the full storyboard or the review after the full build.

Transitions are designed with both shots: a match cut agrees on silhouette, scale, orientation and direction; a mask must
really reveal the next shot inside it; an object handed between shots keeps its screen position, size and state.

## 3. The first build is a draft

Watch the whole film at speed, then every scene and every seam; listen to the full mix. Write findings as
**interval → observation → cause → fix → re-check** and fix causes, not symptoms. Re-check the changed part with its
neighbours, then the whole. Stop when the brief is met and the real defects are gone; taste alternatives don't need endless
rounds. "Cleaner" is not accepted if required characters, words or actions disappeared.

## Stack choice

| On screen | Use | Why |
|---|---|---|
| A narrated explainer with characters, sets, captions, infographics | `story.json` → `make.mjs` (SVG engine, 13 looks) | voice-timed scenes, captions, bilingual, cheap |
| Flat UI, cards, kinetic type over a story | story.json `layout: "title"`, screens, custom GSAP (motion.md) | text stays crisp |
| Perspective, fly-throughs, parallax planes, DOF, motion blur, materials, a 3D mascot | a film in `films/<name>` (three.js, `lib/film.mjs`) | real camera and projection, accumulation optics |
| Polished vector accents from a designer | Lottie prop | don't rebuild what exists |
| Heavy 3D titles / cube when After Effects is installed | `"ae"` plates (after-effects.md) | AE renders, cached |

Mixing is fine (a 3D film with canvas-drawn UI). Decide before building: switching engines half-way costs more than any head start.
Accumulation costs N renders per frame: 15 s × 60 fps × 12 samples = 10 800 renders. Budget it; give fast phases more samples.

## Films (`films/<name>`)

A film is a folder with `index.html`, `scene.js` (exposes `window.__ready` and `window.renderAt(t, samples)`),
`timeline.js` (pure data + math shared by picture and sound: layout, moves, camera keys, cue list, `SHEET` times),
`render.mjs` (3 lines around `lib/film.mjs`), `audio.mjs` (SFX on the cues + music + narration → mp4).

```bash
node render.mjs sheet              # one still per beat → review/sheet.jpg (read it!)
node render.mjs probe 4:6          # the riskiest interval through the final path
node render.mjs check              # cold reload + reverse order must give identical frames
node render.mjs video              # out/<name>.video.mp4, then: node audio.mjs
```

Rules that cost us iterations:
- **Every frame is a pure function of t**: no `state += dt`, no `Math.random()` without a seed, no `Date.now()`.
- **Camera from the hero**: target = the hero's smoothed position (+ framing offset per key), focus on the hero, not on the
  look-at point; two independent paths drift apart and the hero leaves the frame.
- **Load web fonts before drawing canvas textures** (or redraw after `document.fonts` is ready), or labels fall back to serif.
- **Never scale an instance to 0**: a zero matrix gives NaN normals, and bloom smears the NaN into black rectangles. Hide by
  moving away with a tiny scale.
- **Guard canvas radii**: an ease that overshoots below 0 makes `ellipse()` throw on one frame and kills a 10-minute render.
- **UI surfaces are matte** (roughness ≈ 0.9 or a dim albedo + emissive map): a glossy screen catches a hot specular blob.
  Gloss belongs to the hero and the interactive pieces. UI on a 3D slab = a detailed canvas texture; only what the hero
  touches is real geometry.
- **Flat elements sit above the top face** with a visible gap, or the depth test hides them.
- **Grain is expensive**: per-frame noise is incompressible (0.018 grain took a 60 s film to 73 Mbit/s); keep it ≤ 0.006.
- **MJPEG frames are full range**: encode with `scale=in_range=full:out_range=limited,format=yuv420p` (lib/film.mjs does) or
  players get `yuvj420p` and shift the contrast.

## Sound on the picture

Music and SFX come from the same `timeline.js` cues as the picture. After the real mix exists, map the actual accents —
`node tools/accents.mjs out/mix.wav --fps 60 --lowpass 160` — and put cuts, landings and reveals on the *heard* peaks,
not on a computed BPM grid. Sync is a periodic device, not a cut on every beat; reading time, meaning and the voice win
over the grid. Music presets: `lofi`, `ambient`, `upbeat`, `chiptune`, `synthwave`, `epic`, `tribal`, `koto`, `hype`
(150 BPM four-on-the-floor for fast kinetic promos).

## Acceptance

1. Machine: `node tools/verify.mjs out/film.mp4 --w 1920 --h 1080 --fps 60 --duration 15` — codec, yuv420p, constant fps,
   frame count, even timestamps, AAC, audio length, loudness (≈ −14 LUFS for social), true peak, silence share.
2. Eyes: `node tools/sheet.mjs out/film.mp4` (a frame every 0.5 s), `--at 7.5 --window 0.3` for every seam,
   `--scenes` for cut candidates; then watch it at speed.
3. Ears: listen to the full mix with the picture; check the chosen sync points.
4. Honest status: say what is **implemented**, **seen in frames**, **checked in motion**, **listened to**. A contact sheet is
   not motion, an AAC stream is not audible music, equal timestamps are not sync by ear.

## Social cuts (X / Twitter, Reels)

- Autoplay is muted: the text alone must carry the message; the sound rewards those who unmute.
- The first second is the hook (a question, a paradox, a terminal typing the prompt); the last 1.5–2 s is a readable end card
  (name, one line, URL) that works as a poster frame.
- 15 s at 60 fps 1920×1080 (or 1080×1350 / 1080×1920 for feeds) H.264 yuv420p AAC; keep under ~30 MB for phone delivery
  (≈ 12–15 Mbit/s for 15 s).
- Fast is not chaotic: cut on eighths only where the eye already knows where to look (same anchor, same scale, same
  direction); hold every word until it can be read (≈ 0.25 s for one short word at that size, longer for lines).
- Avoid repeated full-screen flashes as a substitute for energy (and for flash safety: no more than ~3 big luminance flips per second).
