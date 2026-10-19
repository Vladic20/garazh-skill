# Writing the narration and the pictures

The genre: a calm, slightly melancholic English voice-over essay over minimal black-and-white doodles —
TV-headed stick people on grey paper, floating pencil confetti. Think "why you feel tired all the time", "the psychology of X", "what nobody tells you about Y".

## Script

- **Hook in the first line** (≤ 12 words): a contradiction, a confession, or a question the viewer has felt. "You're not lazy. You're exhausted in a way sleep can't fix."
- **One idea per scene**, 6–22 words. Short sentences. Spoken English, contractions, second person ("you") or "we".
- **Arc**: hook → the familiar situation → the hidden mechanism (the "why") → the cost → the turn (what to do / new way to see it) → a quiet last line that echoes the hook.
- **Length**: ~150 words per minute of film. 60 s ≈ 14–18 scenes. Default to 60–90 s when the user gives no length.
- Concrete beats abstract: "you check your phone 96 times a day" beats "technology affects attention". Only use numbers you're confident are real, or phrase them softly ("dozens of times a day").
- Ellipses `...` and em-dashes make the voice pause; `[softly]`, `[whispering]`, `[warm]`, `(sighs)` steer delivery. Don't overuse tags — set the overall `style` once.
- Last scene: short, lands on an image, `"hold": 0.6`.

## Pictures

- Every scene needs a **visual metaphor**, not an illustration of the words: loneliness → one figure under a spotlight in the dark; addiction → standing on a pile of TVs holding up an endless feed; burnout → a battery draining; overthinking → a scribble over the head; time → a fast clock; comparison → a lineup where one face is static.
- Reuse the cast: the same TV-head figure ("you") walking through the whole film reads as a story. Give it an id and use `keep` for consecutive beats on the same picture.
- Change something **on the key word** of every line (a face, a pose, a prop popping in). A scene where nothing happens on cue feels dead.
- Vary framing: wide lineup → close push (`cam.focus`) → dark spotlight → wide again. Avoid more than 3 cuts in a row with the same layout.
- Text on screen: at most 1–3 words, only for the key concept of the film ("DOPAMINE", "connected"). Lower-case handwritten looks best.
- Keep the frame uncluttered: 1–4 characters, 0–3 props. Empty paper is part of the style.
