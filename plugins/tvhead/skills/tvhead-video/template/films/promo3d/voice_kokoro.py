# Narration with the local Kokoro 82M model (Apache-2.0, offline): one WAV per shotlist line, silence trimmed,
# timings into voice.json (same shape as voice.mjs writes).   python voice_kokoro.py [voice] [speed]
import json, os, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

here = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[1] if len(sys.argv) > 1 else 'am_michael'
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 0.9
model, voices = os.path.join(here, 'kokoro', 'kokoro-v1.0.int8.onnx'), os.path.join(here, 'kokoro', 'voices-v1.0.bin')
if not (os.path.exists(model) and os.path.exists(voices)):
    sys.exit('Kokoro model missing: download kokoro-v1.0.int8.onnx and voices-v1.0.bin from
'
             'https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 into films/promo3d/kokoro/ (pip install kokoro-onnx soundfile)')
k = Kokoro(model, voices)
shots = json.load(open(os.path.join(here, 'shotlist.json'), encoding='utf8'))
os.makedirs(os.path.join(here, 'voice'), exist_ok=True)
out = []
for i, v in enumerate(shots['voice']):
    parts = []                                             # one clip per sentence, short dry pauses between them
    for sent in [s.strip() for s in v['text'].replace('. ', '.|').split('|') if s.strip()]:
        x, sr = k.create(sent, voice=voice, speed=speed, lang='en-us')
        a = np.abs(x); idx = np.where(a > 0.012)[0]
        parts.append(x[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.08 * sr)] if len(idx) else x)
    gap = np.zeros(int(0.3 * sr), dtype=parts[0].dtype)
    x = np.concatenate([p for q in parts for p in (q, gap)][:-1])
    f = os.path.join(here, 'voice', f'k_{voice}_{i:02d}.wav'); sf.write(f, x, sr)
    dur = len(x) / sr
    out.append({**v, 'file': f, 'dur': round(dur, 3), 'lead': 0, 'silent': False})
    print(f"{v['at']:6.2f}s  {dur:5.2f}s  window {v['until'] - v['at']:.1f}s  {'OVER ' if v['at'] + dur > v['until'] else ''}{v['text']}")
json.dump(out, open(os.path.join(here, 'voice.json'), 'w', encoding='utf8'), indent=1)
