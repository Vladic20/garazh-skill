# promo3d — a code-rendered 3D film

The 60-second tvhead-studio promo: an orange clay cube living in a dark video editor that lies on a desk (three.js r169).
Everything is a pure function of time, so any frame renders on its own and every revision is local.

| file | what it holds |
|---|---|
| `brief.md` | the one-sentence goal, reference analysis, product facts, motion rules |
| `shotlist.json` | beats and narration lines with their time windows |
| `timeline.js` | the single timeline: editor layout, mascot moves (hops, runs, sits, blinks), camera keys, sound cues — read by the picture **and** the sound |
| `scene.js` | the scene: desk, editor slab with a canvas UI, clay cube, track tiles, cards → scene blocks, playhead, narration bars. Each frame averages N jittered renders (lens → real depth of field, sub-pixel → anti-aliasing, shutter → motion blur), then bloom, grade, ACES |
| `render.mjs` | headless Chrome on the GPU: `stills`, `sheet` (contact sheet), `video` |
| `audio.mjs` | synthesized SFX on the cues, generated lo-fi with an arranged level and ducking, narration, loudness → `out/promo3d.wav` + `out/promo3d.mp4`; writes `env.json` (voice loudness for the waveform bars) |
| `voice.mjs` / `voice_kokoro.py` | narration: free Fish voice through OpenRouter, or the local Kokoro 82M model when the network voice is unavailable |
| `assets/` | frames from real tvhead-studio renders used on the cards and in the montage |

```bash
cd films/promo3d
node render.mjs sheet --samples 6        # review/sheet.jpg — one still per beat
node render.mjs check                    # determinism: cold reload + reverse order give the same frames
node render.mjs probe 4:6                # the riskiest interval through the final path → review/probe.mp4
node voice.mjs                           # or: python voice_kokoro.py am_michael 0.9
node audio.mjs --video none              # env.json + mix (run before the final picture so the bars follow the voice)
node render.mjs video --samples 20       # out/promo3d.video.mp4 (~0.2 s/frame on a GTX 1050 Ti)
node audio.mjs                           # out/promo3d.mp4
```

Needs a GPU-backed Chrome (WebGL2). Kokoro: `pip install kokoro-onnx soundfile`, then put `kokoro-v1.0.int8.onnx` and
`voices-v1.0.bin` from github.com/thewh1teagle/kokoro-onnx (release model-files-v1.0) into `kokoro/`.
