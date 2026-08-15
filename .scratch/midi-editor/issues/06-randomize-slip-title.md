# 06 — Randomize slip title

**What to build:** A button next to the title field in the metadata panel gives the slip a random title, so the musician can name an idea without breaking flow to think one up.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] A new `domain/titleGenerator.ts` module owns a curated word bank (adjectives + nouns) and a pure function that combines them into a title, independent of DOM/Audio/IndexedDB
- [ ] The generator function is seedable: the same seed always produces the same title, so it's testable without relying on real randomness
- [ ] A button next to the Title field in the metadata panel calls the generator and sets the slip's title to the result
- [ ] Clicking the button always overwrites the current title, whatever it is — no guardrail for existing/non-default titles
- [ ] Repeated clicks can produce a new random title each time (no requirement to avoid repeats)
- [ ] Unit tests cover the generator function directly (seed → title, including that the same seed is deterministic) — no DOM interaction tests required for this ticket
