# promo15 — a 15-second hardcore kinetic promo

The repo's X/Twitter cut: a prompt typed in a terminal dives into the screen, slams into giant words, explodes into the 13 looks
flying past, gains a voice, music and both formats, races through the pipeline with the clay cube, and lands as the wordmark
and URL. 1920×1080, 60 fps, 150 BPM. Read `brief.md` first: it holds the style card, the variants and a plan card per shot.

| file | what it holds |
|---|---|
| `brief.md` | goal, allowed facts, style card "hype", variants for the heavy scenes, plan cards |
| `timeline.js` | the 150 BPM grid (`b(k)`), shot boundaries on beats, texts, slams, `SHEET` times, sound `cues()` |
| `scene.js` | eight shots in one pure `render(t)`: extruded type (stacked texture layers), look-frame corridor, bars, frame morph, pipeline with the clay cube, end card; HUD as a crisp 2D canvas over WebGL; accumulation motion blur |
| `audio.mjs` | `hype` music (drums enter on the drop, drop out for the end card) + SFX from `lib/sfx.mjs` → `out/promo15.mp4` |
| `assets/` | the 13 look thumbnails from the app and a vertical frame |

```bash
node render.mjs sheet                    # review/sheet.jpg
node render.mjs probe 3.3:6.6            # the corridor through the final path
node render.mjs video                    # out/promo15.video.mp4 (14 samples per frame)
node audio.mjs                           # out/promo15.mp4
node ../../tools/accents.mjs out/promo15.wav --fps 60     # heard accents vs. the slams
node ../../tools/verify.mjs out/promo15.mp4 --w 1920 --h 1080 --fps 60 --duration 15
node ../../tools/sheet.mjs out/promo15.mp4                # a frame every 0.5 s
```

To make one for another product: rewrite `brief.md` (facts you are allowed to claim), the texts in `timeline.js`, swap the
images in `assets/`, keep the grid, the shot rhythm and the end card's readable hold.
