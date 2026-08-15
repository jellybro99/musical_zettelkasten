# 04 — Playback

**What to build:** Pressing play plays the current phrase back through a simple, generic synth tone at the slip's set tempo, so the musician can judge whether the idea sounds right.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] A pure scheduler function takes the domain module's `notes[]` and the slip's tempo (BPM) and computes trigger times for each note, independent of any Audio API
- [ ] A thin Web Audio adapter consumes the scheduler's trigger times and produces sound using a basic oscillator (sine/triangle) — no sample-based or FM instrument
- [ ] A play control in the UI starts playback of the current slip at its set tempo
- [ ] A stop/pause control halts playback
- [ ] Playback reflects the current note state at the moment play is pressed (including notes moved/resized/deleted since the slip was opened, if ticket 02 has landed)
- [ ] Unit tests cover the scheduler function directly (notes + tempo → trigger times) with no real `AudioContext` involved
- [ ] The Web Audio adapter itself is treated as a thin, effectively untested boundary — no test asserting real sound output
