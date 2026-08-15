Status: ready-for-agent

# MIDI Editor

## Problem Statement

The musical zettelkasten is meant to work like a Zettelkasten: capture small musical ideas as individual "slips," then later combine them into songs. Right now there is no way to capture a musical idea at all — there's no editor for creating a MIDI phrase, no way to hear it back, and no way for that idea to survive a page reload. Before any cataloguing (slip-box) or combining (Arrange) work can matter, a musician needs a place to actually get a short musical idea out of their head and into the box.

## Solution

A single-screen MIDI editor: a piano-roll interface where a musician manually places, moves, resizes, and deletes notes to build a short phrase, sets basic metadata about that phrase (title, tempo, key, kind, tags), hears it played back through a simple synth, and has it persisted locally so the idea isn't lost between sessions. This is deliberately scoped to editing one slip at a time — browsing a library of slips (slip-box), the landing page (Desk), and combining slips into songs (Arrange) are later phases built on top of this same slip data.

Capture is via manual note entry only in this phase (click/draw notes in the piano roll) — no live MIDI-keyboard input and no `.mid` file import yet.

## User Stories

1. As a musician, I want to click on the piano roll to place a note at a given pitch and time, so that I can start sketching a phrase without needing a MIDI controller.
2. As a musician, I want to drag a placed note horizontally, so that I can move it earlier or later in the phrase.
3. As a musician, I want to drag a placed note vertically, so that I can change its pitch.
4. As a musician, I want to drag the edge of a note, so that I can lengthen or shorten it.
5. As a musician, I want to delete a note I placed, so that I can remove mistakes or ideas that didn't work.
6. As a musician, I want note placement, movement, and resizing to snap to a grid, so that my phrase stays rhythmically aligned without needing pixel-perfect precision.
7. As a musician, I want to see a fixed 2-bar, roughly one-octave piano roll window, so that I have a small, approachable canvas for a short phrase rather than an intimidating blank timeline.
8. As a musician, I want to press play and hear my phrase played back, so that I can judge whether the idea actually sounds like what I imagined.
9. As a musician, I want playback to use a simple, generic synth tone, so that I can evaluate timing, pitch, and rhythm now, with a nicer instrument sound added later.
10. As a musician, I want to set a title for my slip, so that I can recognize it later.
11. As a musician, I want to set a tempo (BPM) for my slip, so that playback matches the speed I imagined and later screens can display it accurately.
12. As a musician, I want to set a key for my slip, so that I can remember its tonal context.
13. As a musician, I want to set a kind (e.g. Phrase) for my slip, so that it's categorized consistently with other slip types in the zettelkasten (Loop, One-shot, Phrase, Texture).
14. As a musician, I want to add tags to my slip, so that I can find it later once a slip-box exists.
15. As a musician, I want my slip (notes + metadata) to be saved automatically to local storage, so that refreshing or closing the browser doesn't lose my idea.
16. As a musician, I want my slip to reload exactly as I left it when I return to the editor, so that I can keep refining an idea across multiple sessions.
17. As a musician, I want the editor to work entirely offline/locally, so that capturing a fleeting idea doesn't depend on a network round-trip or an account.
18. As a developer, I want the note-editing logic (place/move/resize/delete/snap) to live in a pure, framework-independent module, so that it can be tested without simulating drag gestures, without a real AudioContext, and without a real IndexedDB.
19. As a developer, I want the playback scheduler and the persistence layer to be thin adapters over the same slip data shape, so that slip-box and Arrange (built later) can reuse this data without reshaping it.

## Implementation Decisions

- **Scope**: this phase builds the MIDI editor screen only. Slip-box (library/browsing), Desk (home), and Arrange (combining slips into songs) are out of scope but the data model must not need reshaping when they're added.
- **Capture method**: manual note entry only (click/drag in the piano roll). Live Web MIDI input and `.mid` import are explicitly deferred.
- **Domain seam**: a single pure module owns the slip's editable state — notes (`pitch`, `start`, `length`, `velocity`) plus grid config (bars, steps-per-bar, visible pitch range) plus metadata (title, tempo, key, kind, tags). It exposes `placeNote`, `moveNote`, `resizeNote`, `deleteNote`, and `snapToGrid` as plain data-in/data-out functions with no DOM, Audio, or IndexedDB dependency. This is the one seam the rest of the system is built around.
- **Rendering**: DOM elements with absolute positioning (matching the existing static mock in `Musical Zettelkasten UI Mockups/`), not canvas. Note blocks, grid lines, and the velocity lane are styled with CSS (including velocity-driven color, per the mock's `color-mix()` approach). Canvas is explicitly deferred until/unless DOM styling becomes a real constraint (e.g. when quantize/velocity/humanize visualization lands).
- **Grid/range for v1**: fixed window — 2 bars, roughly one octave of visible pitch range. No scrolling or resizing of the visible range in this phase.
- **Editing interactions for v1**: place, move, resize, delete, snap-to-grid. Quantize, per-note velocity editing, and humanize are visible in the mock but deferred — not built this phase.
- **Playback**: a scheduler function reads the domain module's `notes[]` and tempo and computes trigger times; a thin Web Audio adapter (basic oscillator — sine/triangle) turns those into actual sound. No sample-based or FM instrument yet; swapping in a nicer instrument later should only require replacing the Web Audio adapter, not the scheduler or domain module.
- **Persistence**: local-only, via IndexedDB. A single in-progress slip is persisted (not a full multi-slip library — that's slip-box's job later). The persistence adapter serializes/deserializes the same slip shape the domain module and playback scheduler use, so no reshaping is needed when slip-box is added.
- **Metadata fields**: full set now — title, tempo (BPM), key, kind, tags — even though there's no slip-box UI yet to browse/filter by them. Matches the mock's editor screen (2a/2b) and avoids a second pass on the data model.
- **No backend, no auth**: everything runs client-side in the browser for this phase.

## Testing Decisions

- Tests target the pure domain module directly: given a `notes[]` + grid config + an action (place/move/resize/delete/snap), assert the resulting `notes[]`. No DOM simulation of drag gestures, no real `AudioContext`, no real IndexedDB reads/writes in these tests.
- Edge cases worth covering in the domain module: placing a note outside the visible grid bounds, resizing a note to zero/negative length, moving/resizing a note so it overlaps another note, deleting a note that doesn't exist, snapping a note that's already on-grid.
- The playback scheduler (notes + tempo → trigger times) is tested as a pure function separately from the Web Audio adapter that actually produces sound — the adapter itself is a thin, effectively untested boundary (typical for audio output; not economical to assert real sound was produced).
- The persistence adapter (serialize/deserialize against IndexedDB) gets a minimal smoke test (save then load returns the same shape) rather than exhaustive coverage — it's a thin pass-through over the domain module's data shape.
- No existing test setup/prior art in this repo yet (freshly scaffolded Vite + React + TS app) — this feature establishes the first test conventions here.

## Out of Scope

- Slip-box screen (library/browsing multiple slips)
- Desk screen (home/landing page)
- Arrange screen (combining slips into songs)
- Live Web MIDI input (recording from a connected controller/keyboard)
- `.mid` file import/export
- Quantize, per-note velocity editing, humanize
- Scrollable/resizable piano-roll grid (more than 2 bars, more than ~1 octave)
- Sample-based or FM synth instruments (e.g. the mock's "Rhodes")
- Backend storage, sync across devices, auth

## Further Notes

- The static mock at `Musical Zettelkasten UI Mockups/Musical Zettelkasten.dc.html` (screens 2/2a/2b) is the visual reference for the piano roll: hairline bar/beat grid, gold note blocks tinted by velocity via `color-mix()`, a velocity lane beneath the roll, and a tool rail. Screen 2a's sample slip ("Rhodes Chord Stab", SB-033, 2 bars, 96 BPM, E min, 12 notes) is a useful concrete reference for note density/shape even though velocity editing itself is deferred.
- Domain vocabulary to keep consistent with the mock and future phases: **slip** (a single captured musical idea), **slip-box** (the library of slips), **Desk** (home screen), **Arrange** (the song-combining screen), **kind** (Loop / One-shot / Phrase / Texture — this phase only deals with Phrase-kind MIDI slips).
- No `CONTEXT.md` or ADRs exist in this repo yet; this spec doesn't introduce any decisions that contradict prior art since there is none. Worth creating a `CONTEXT.md` once the slip/domain vocabulary above stabilizes across more than one feature.
