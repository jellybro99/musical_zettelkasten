# 01 — Place notes in the piano roll

**What to build:** The MIDI editor screen opens showing a fixed 2-bar, roughly one-octave piano-roll grid. Clicking an empty cell in the grid places a note there, snapped to the grid. This establishes the pure domain module that owns the slip's editable state (notes + grid config) — the seam every later ticket builds on.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Domain module exists with a `notes[]` shape (`pitch`, `start`, `length`, `velocity`) and a grid config (bars, steps-per-bar, visible pitch range), independent of DOM/Audio/IndexedDB
- [ ] Domain module exposes `placeNote` and `snapToGrid` as plain data-in/data-out functions
- [ ] Piano-roll UI renders the fixed 2-bar / ~1-octave grid as absolutely-positioned DOM elements (matching the style of `Musical Zettelkasten UI Mockups/Musical Zettelkasten.dc.html`), not canvas
- [ ] Clicking an empty grid cell places a note there, snapped to the grid, and it renders immediately
- [ ] Placing a note outside the visible grid bounds is handled without crashing (e.g. no-op or clamped)
- [ ] Unit tests cover `placeNote` and `snapToGrid` directly (no DOM simulation, no Audio, no IndexedDB)
