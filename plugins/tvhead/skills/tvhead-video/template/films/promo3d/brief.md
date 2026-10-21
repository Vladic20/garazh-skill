# tvhead-studio — 3D clay cube promo

**One sentence:** type a topic, get a finished narrated video — tvhead-studio does the whole film.
**Audience:** Claude Code users, creators. **Duration:** 60 s. **Format:** 1920×1080, 30 fps. **Language:** English narration.

## Reference analysis (ssstwitter 1792504803666.mp4, 12 s)
- Palette: brown desk #3a2a22 → #1d1512 vignette; editor panels #1f2023 / #2a2b2f; blue panel outline #2d8cff; red work-area bar #d9534f;
  tracks yellow #e8c547, teal #8fd3c8, lilac #a99ad8; mascot clay orange #e8734f with soft subsurface look; title glow warm orange #ffb070.
- Composition: the UI is a flat slab lying on a desk, seen at a low grazing angle; the eye goes to the mascot, always in the sharp plane.
- Camera: slow dolly / orbit, strong shallow depth of field (foreground and far UI melt into bokeh), occasional push-in.
- Motion: mascot hops with squash & stretch, small rotation in the air; playhead is a glowing cyan pin with a light beam; holds are short (~1–1.5 s).
- Type: UI labels small and blurred (texture, not reading); hero title heavy, wide, glowing ("MADE WITH CLAUDE", tracked subtitle).
- Do not copy: Adobe branding/UI copy, "Opus 5.5" subtitle. Our UI is a generic dark editor labelled "tvhead studio".

## Product facts (real, from the repo)
- story.json → narration (free Fish voices), SVG/3D frames in headless Chrome, ffmpeg; 13 looks; EN/RU; 16:9 and 9:16; generated music; director proposal.
- Real look frames for the montage: out/look-*.mp4 stills and app/ui/look-*.jpg.

## Motion rules
- Micro UI: quick, tiny overshoot. Panels / cards: controlled settle (spring, ζ≈0.7). Camera: smooth, almost invisible (smoothstep paths).
- Headlines: strong entrance, stable hold ≥ 2 s. Mascot: playful, squash 0.75 / stretch 1.2 on take-off and landing.

## Renderer
three.js r169 scene in headless Chrome (GPU, WebGL2): `render(t)` is a pure function of time (seeded, no clocks) → seekable;
UI drawn on canvas textures; soft shadows, bokeh DOF, bloom. Frames → ffmpeg. Sound placed against the same cue times (cues.json).
