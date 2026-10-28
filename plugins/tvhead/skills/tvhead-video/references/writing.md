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

## Engineering formats (looks underground and marker)

- **Underground sim** (~45–55 s, 11–12 lines): absurd goal in a hidden room → problem 1 → simple engineering fix → problem 2 → fix → problem 3 → fix → result on the counter → a side effect of success (neighbours, smoke, snow that does not lie) → its fix or a punchline → "Поздравляю, вы построили …" + summary card → "Что построить дальше? Пишите в комментариях." Problems turn the HUD red and get a stamp; every fix adds an upgrade chip.
- **Marker sketch** (~45–50 s): "Хотите … ? Давайте нарисуем" while the hand draws the object → each problem in red (cracks, rings, a crossed-out part, "!") → the fix in green / blue drawn over it → one line of real arithmetic next to it (volumes, frequencies, percentages, parts per hour) → page flip to a summary: problem struck out → fix ✓ and the boxed result → CTA. Numbers are real arithmetic or honest assumptions written as such ("× 30 обменов/ч").
- Both: show safe, legal engineering (exhaust outside, explosion-proof fans, respirators); skip ideas about evading platform bans, tapping utilities or hiding hazards.

## Arcs and density (from the stickman director)

- **Heartbeat** (`"arc": "heartbeat"`, explainers): 1 golden hook (a counter-intuitive question or visual paradox in the first 2–5 s) → 2 disrupting assumptions (state the common belief, break it in one sentence) → 3 insider secret (the hidden mechanism or friction) → 4 truth revelation (the "aha") → 5 elevation: a memorable punchline plus an open question for the comments. For 60 s: hook 1 block, assumptions 1, secret 1, truth 2, elevation 1.
- **Short story** (`"arc": "payoff"`, comedy / prehistoric / history shorts): setup → escalation → ironic payoff; a held reaction (0.5–2 s) can be the joke; no forced question.
- Plan in ~10-second blocks: ~20–25 English words (a little fewer in Russian) per block, three beats per block (0–3 s set up or inherit, 3–7 s escalate, 7–10 s pay off and hand over), a visible change every 2–3 s, and a named connection into the next block (pose, prop, direction or a deliberate location cut — cozy stories change location every block).
- Keep facts factual: dramatise with fictional people, never invent statistics, quotations or history.

## Pictures

- Every scene needs a **visual metaphor**, not an illustration of the words: loneliness → one figure under a spotlight in the dark; addiction → standing on a pile of TVs holding up an endless feed; burnout → a battery draining; overthinking → a scribble over the head; time → a fast clock; comparison → a lineup where one face is static.
- Reuse the cast: the same TV-head figure ("you") walking through the whole film reads as a story. Give it an id and use `keep` for consecutive beats on the same picture.
- Change something **on the key word** of every line (a face, a pose, a prop popping in). A scene where nothing happens on cue feels dead.
- Vary framing: wide lineup → close push (`cam.focus`) → dark spotlight → wide again. Avoid more than 3 cuts in a row with the same layout.
- Text on screen: at most 1–3 words, only for the key concept of the film ("DOPAMINE", "connected"). Lower-case handwritten looks best.
- Keep the frame uncluttered: 1–4 characters, 0–3 props. Empty paper is part of the style.
