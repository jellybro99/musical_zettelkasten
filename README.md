# Musical Zettelkasten

Live: https://jellybro99.github.io/musical_zettelkasten/

A note-taking app for musical ideas, inspired by the [Zettelkasten](https://en.wikipedia.org/wiki/Zettelkasten) method: capture small musical ideas as individual **slips**, file them in a browsable **slip-box**, and (eventually) combine them into songs in **Arrange**.

## What's built

A working MIDI sketchpad and library, all client-side:

- **MIDI editor** — click-to-place piano roll (2 bars, ~1 octave), drag to move/resize, snap-to-grid, a metadata panel (title, tempo, key, kind, tags), and a random-title button for naming-avoidant sketching.
- **Playback** — a Web Audio oscillator synth plays the current slip at its own tempo, with an optional loop toggle, driven from a single app-shell-global "now playing" bar shared by the editor and the dashboard.
- **Slip-box** — a card-grid library of every saved slip, with search and tag/kind filtering, capture and delete flows, and a copy action that branches a new slip off an existing one (keeping a one-way "copied from" provenance link back to the original).
- **Local persistence** — every slip autosaves to IndexedDB and reloads exactly as left, no backend involved.
- **Design system** — a hand-ported subset of a Classical design system's tokens/components (`Musical Zettelkasten UI Mockups/_ds/`), strictly mono-accent (no red/danger color anywhere).

**Desk** and **Arrange** are reserved top-nav destinations, not yet built.

## Why this project is interesting (engineering-wise)

This started as a solo sketchpad and grew into a small case study in keeping a fast-moving frontend's domain model honest as requirements changed:

- **A domain-vocabulary reversal, tracked as an ADR pair.** A "slip references another slip, resolved live at playback" feature was designed, fully implemented, and then deliberately ripped back out once it broke the app's core "a slip is always just its own notes" identity. Both the original decision and the reversal are recorded in [`docs/adr/`](docs/adr/) rather than just overwritten in git history — see ADR-0001 (superseded) and ADR-0002.
- **One written-down domain doc, kept current.** [`CONTEXT.md`](CONTEXT.md) is a single glossary + decisions log (slip, slip-box, kind, tag, capture, copy/provenance, ADR pointers) that every feature spec is written against, so terminology doesn't drift feature to feature.
- **A pure domain core under a thin UI.** Note editing (`placeNote`, `moveNote`, `resizeNote`, `snapToGrid`), title generation, and slip transforms (`copySlip`) live in framework-independent modules in `src/domain/` — plain data in, plain data out, no DOM/Audio/IndexedDB inside them. Tests target these modules directly instead of simulating drag gestures or real audio.
- **A later architecture pass to remove structural debt.** After the UI stabilized, a self-review pass (see the autosave/playback-clock rework in `git log`) found and fixed two recurring bug sources: playback wiring routed through a mutable ref instead of app-owned state, and "now playing" progress tracked by three independent unsynchronized clocks. Both were collapsed to a single source of truth rather than patched again.
- **Spec-and-ticket discipline for a one-person project.** Each feature phase (`midi-editor`, `slip-box`, `ui-refresh`, `copy-slip`, ...) was written up as a spec with explicit implementation/testing decisions and out-of-scope calls before being broken into numbered tickets and built — a lightweight version of how a small team would scope and hand off work, even with a single contributor.

## Stack

Vite + React 19 + TypeScript, Web Audio API for playback, IndexedDB for persistence, no backend. Tests with Vitest + Testing Library (`fake-indexeddb` for persistence tests). Linted with `oxlint`.

## Development

```
npm install
npm run dev
```

```
npm run test    # vitest
npm run lint    # oxlint
npm run build   # typecheck + production build
```

Visual reference for not-yet-built screens (Desk, Arrange) lives in `Musical Zettelkasten UI Mockups/` — static mocks, not implemented.
