# Motion rules (read before choosing transitions and cues)

Distilled from the best open motion skills, rewritten for this engine. Sources (MIT/Apache, used as ideas, not copied):
[HyperFrames](https://github.com/heygen-com/hyperframes) motion-doctrine and cut-the-curve ·
[GSAP skills](https://github.com/greensock/gsap-skills) ·
[Charlie's motion-graphics-skills](https://github.com/charlie947/motion-graphics-skills) (vox-explainer, reference-to-motion, motion-effects) ·
[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) ·
[product-launch-motion](https://github.com/AbubakrChan/product-launch-motion) ·
[claude-motion-design](https://github.com/howseen-ai/claude-motion-design). A wider catalogue: [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills).

## 1. Seams (transitions between scenes)

- **Vector law.** How a scene leaves decides how the next one arrives: same axis, same direction, matched speed, cut mid-motion. The engine does this for you in `curve`, `zoom`, `pull` and `whip`: exit accelerates, entry decelerates, and nothing settles before the cut.
- **One current.** A film has one default direction (`"direction": "left"` at the top of the story). Every ordinary seam uses it. Never alternate left/right on consecutive seams, because ping-pong reads as an error.
- **Reserved vectors carry meaning.** Use each one on purpose:
  - `zoom` (push through): going deeper into the same thought.
  - `pull` (inverse zoom): arrival or payoff, something bigger lands.
  - `"transition": {"type": "curve", "dir": "up"}`: elevation or a conclusion.
  - `iris`: closing a chapter or moving into an intimate/dark moment.
  - `page`: a new topic, like turning a sheet.
  - `wipe`: a before/after swap.
  - `whip`: energy, time skips.
  - `fade`: chapter breaks only. Never use it as a default; a crossfade has no carrier.
- **Budget.** Use 2–3 transition types per film and repeat them. The default is `curve`. Consecutive beats on the same picture use `keep: true`, which needs no transition at all.
- **Carriers.** The strongest seam hands something across: the same hero standing in the same place in both scenes, a prop that grows into the next scene's subject (`zoom` + a `cam.focus` on it), or the floating doodles, which never cut.

## 2. Inside a scene

- **No idle wobble.** Breathing, blinking and line boil are texture, not content. Every scene needs a performing route:
  - **staged reveals**: props pop in `on` words;
  - **camera with intent**: `cam.focus` travelling from wide to the subject;
  - **an animated sequence**: a walk (`pose: walk` + `then` x), a battery draining, a chart drawing itself;
  - **a state change**: faces flip to `static`, the screen goes `off`.
  Test: pause on any second. Something meaningful should be mid-flight.
- **Stillness before the climax.** Leave 0.3–0.75 s between the action and its result. Put the payoff on a later word or use `hold`.
- **Timing.** A single entry takes at most ~0.8 s. Stagger groups by 0.1–0.15 s per item, about 0.5 s total. An exit takes ≈ 75% of the entry. Use overshoot `back.out(1.4–1.7)` (what `pop` does); never bouncy or elastic eases.
- **Causal motion.** A reaction starts on the frame of its cause. Put the face change and the prop pop on the **same** cue word.
- **Principles the rig already applies:**
  - anticipation: a tiny dip before every pose change;
  - follow-through: antennas keep swinging after a move;
  - squash on `drop` landings;
  - overshoot on `pop`.
  Pick poses that read as silhouettes: arms away from the body.
- **One thing moves at a time.** The eye follows one action. If three props must appear, stagger them across the line with `at` 0.15 / 0.45 / 0.75 or three cue words.

## 3. Kinetic type (`words` prop, `layout: "title"`)

- Words rise in exactly when spoken (waterfall entry: ~30 px rise, opacity 0.35→1, power4-out). Emphasise 1–2 words per line with `emph`; they take the accent colour and get a scribble underline.
- Keep it to 3–14 words, two lines at most. Use it for the hook, the thesis and the takeaway, not for every line.
- The first 3 seconds must already state the promise of the video.

## 4. Infographics

- Use `counter`, `bars`, `pie`, `progress`, `timeline`, `checklist` and `grid` for anything countable. **Only real numbers**: if you can't source a figure, show a qualitative visual instead (a `grid` with one odd one out, a `battery` draining, a `chart` trend). Say "about"/"dozens" rather than inventing precision.
- Symmetric layouts, equal gaps. One accent colour per film (`theme.accent`).

## 5. References from the user (app uploads in `episodes/<id>/refs/`)

Read every image. A reference does one of two jobs, and one image can do both:
- **Moves** (frames of a video): take the pace, the kind of scene changes and the one idea. Pick transitions and cameras that match.
- **Look** (a still, a site, a moodboard): take the palette into `"theme": { "preset": "paper", "paper": "#…", "ink": "#…", "accent": "#…", "fill": "#…", "bezel": "#…", "screen": "#…" }`. Keep contrast: ink on paper should be at least 7:1. Pick the closest preset first (`paper`, `sepia`, `blueprint`, `chalk`, `night`, `mint`) and override 2–4 colours.

Never copy logos, characters or text from a reference. A photo the user wants **in** the video goes in a `photo` prop (`src: "refs/<file>"`).

## 6. Custom motion with GSAP (escape hatch)

When no prop fits, write `episodes/<ep>/art/<name>.js` and list it in `"scripts": ["art/<name>.js"]`. Register a prop that returns SVG for time `lt` (seconds since it appeared). Build GSAP timelines **paused** and seek them; never let them run live:

```js
// episodes/<ep>/art/orbit.js
(function () {
  const s = { a: 0, r: 0 };
  const tl = gsap.timeline({ paused: true })
    .to(s, { r: 160, duration: 0.8, ease: 'back.out(1.6)' })
    .to(s, { a: 360, duration: 3, ease: 'none' }, 0);
  (window.CUSTOM ||= {}).orbit = (p, t, lt) => {
    tl.totalTime(lt + 0.001, true); tl.totalTime(lt, true);   // GSAP skips redraws when asked for the same time twice
    const x = Math.cos(s.a * Math.PI / 180) * s.r, y = Math.sin(s.a * Math.PI / 180) * s.r * 0.4;
    return `<circle r="60" fill="${WHITE}" stroke="${INK}" stroke-width="5"/><circle cx="${x}" cy="${y}" r="18" fill="${ACCENT}" stroke="${INK}" stroke-width="4"/>`;
  };
})();
```

Then use `{ "type": "orbit", "x": 640, "y": 330 }`. Use the palette globals `INK`, `WHITE`, `ACCENT`, `PAPER` and helpers `rng(seed)`, `lerp`, `clamp`, `easeOutBack`. Never use `Math.random` or `Date`.

## 7. QA before delivery

1. `--stills auto`, then Read the sheet: check for nothing off-frame, no text over characters, and one idea per frame.
2. If transitions matter, render `--preview` and look at frames around each cut (ffmpeg `-ss cut-0.3 -t 0.8 -vf fps=10,tile=8x1`). Check that both sides move and there are no blank frames.
3. After the final render, check the summary: no "silent" lines, the duration you expected, and 1920×1080.
