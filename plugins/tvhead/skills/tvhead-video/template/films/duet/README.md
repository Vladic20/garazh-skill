# duet — "Claude Duet builds the studio"

A 130-second 3D film: five clay agents build the tvhead-studio repo and app in a glass studio — first one agent alone and slow,
then four at once, a conflict over one piece, the coordinator squeezing and re-linking, the zones sliding together, the preview
coming alive, and everything collapsing into one object. Read `brief.md` for the plan.

| file | what it holds |
|---|---|
| `timeline.js` | the world (zones, slots, piles), the five agents and 24 blocks built with `lib/choreo.js`, the 29 camera shots, sound cues |
| `scene.js` | the studio, zones, clay agents, blocks of six kinds, cables, tear fragments, check rings, live preview/timeline canvases, title |
| `audio.mjs` | ambient + 120 BPM synthwave stems arranged by section, SFX from `lib/sfx.mjs` on every hop, grab, toss, insert, tear, check |
| `assets/` | frames from real tvhead-studio renders for the preview screen |

```bash
node render.mjs sheet                 # one still per beat → review/sheet.jpg
node render.mjs video                 # out/duet.video.mp4 (~80 ms/frame at 8 samples on a GTX 1050 Ti → ~10 min)
node audio.mjs                        # out/duet.mp4
node ../../tools/verify.mjs out/duet.mp4 --w 1920 --h 1080 --fps 60 --duration 130
```

`lib/choreo.js` is reusable for any character film: `new Agent(id).hop(t0, t1, to, h).walk(...).look(t, target).sit(...)`,
`new Block(id).at(t, 'float' | 'held' | 'fly' | 'place', …)`; `pose(t)` / `where(t)` are pure functions of time.
