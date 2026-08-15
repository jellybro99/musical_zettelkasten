# Musical Zettelkasten

A note-taking app for musical ideas, inspired by the [Zettelkasten](https://en.wikipedia.org/wiki/Zettelkasten) method: capture small musical ideas as individual **slips**, file them, then later combine them into songs.

## Concept

- **Slip** — a single captured musical idea. Slips have a **kind**: Loop, One-shot, Phrase, or Texture.
- **Slip-box** — the library of all filed slips, browsable and searchable.
- **Desk** — the home screen: recent activity, in-progress songs, resurfaced slips.
- **Arrange** — where slips get combined into songs.

Visual reference for all of the above lives in `Musical Zettelkasten UI Mockups/` (static mocks — not implemented yet except where noted below).

## Current focus: the MIDI editor

The first thing being built is a single-screen **MIDI editor** — a piano roll for manually sketching a short musical phrase, hearing it back, and having it persist locally. Everything else (slip-box, Desk, Arrange) is deliberately deferred until this works end to end.

Full spec: [`.scratch/midi-editor/spec.md`](.scratch/midi-editor/spec.md). Implementation tickets: [`.scratch/midi-editor/issues/`](.scratch/midi-editor/issues/).

### Design decisions

- **Capture is manual entry only.** Notes are placed by clicking/dragging in the piano roll — no live MIDI-keyboard input, no `.mid` import yet. Simpler to build, no device/permissions handling, and it validates the slip data model before adding hardware complexity.
- **Local-only storage.** Slips persist to IndexedDB in the browser. No backend, no auth — this is a personal capture tool and there's no server to talk to yet.
- **One pure domain seam.** All note editing (`placeNote`, `moveNote`, `resizeNote`, `deleteNote`, `snapToGrid`) lives in a framework-independent module: plain data in, plain data out, no DOM/Audio/IndexedDB inside it. The React UI, the playback scheduler, and the persistence layer are all thin adapters around this one module. Tests target this module directly rather than simulating drag gestures or real audio/IndexedDB.
- **DOM rendering, not canvas.** The piano roll is absolutely-positioned DOM elements styled with CSS, matching how the static mock is built. Note counts are small (dozens, not thousands), so DOM's native pointer events for drag/resize and CSS for velocity-tinted note color are simpler than hand-rolling hit-testing on a canvas. Revisit canvas only if DOM styling becomes a real constraint.
- **Fixed grid for v1.** The piano roll is a fixed 2-bar, ~1-octave window — no scrolling or resizing. A small, bounded canvas is a friendlier starting point than an intimidating open timeline.
- **Core editing set only.** Place, move, resize, delete, and snap-to-grid ship first. Quantize, per-note velocity editing, and humanize are visible in the mock but deferred — they operate on notes that need to exist and be placeable first.
- **Playback via a simple oscillator.** A basic sine/triangle synth confirms notes are audible, timed, and pitched correctly. A nicer instrument sound (e.g. the mock's "Rhodes") is a later swap of the Web Audio adapter, not a structural change.
- **Full metadata now.** Title, tempo, key, kind, and tags are all editable in the editor from the start, even without a slip-box UI to browse by them yet — cheaper to add now than to reshape the data model later.

### Future ideas

- **Click a row's note name to preview its pitch.** Pressing the piano roll's row label (e.g. `C4`) should play that note through the playback synth, like pressing a key on a real keyboard, so a musician can find a pitch by ear while placing notes.

## Stack

Vite + React + TypeScript, no backend.

## Development

```
npm install
npm run dev
```
