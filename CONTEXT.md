# Musical Zettelkasten

A zettelkasten for musical ideas: short note patterns ("slips") captured, tagged, and browsed like index cards, with a MIDI editor and playback attached.

## Language

**Slip**:
A single unit of musical material — a note pattern (`notes`/`grid`) plus metadata (`title`, `tempo`, `key`, `kind`, `tags`). Named after the zettelkasten "slip" (a note card).
_Avoid_: Clip, pattern, snippet

**Slip-box**:
The library screen listing all slips, with search, tag, and kind filtering. The zettelkasten box the slips live in.
_Avoid_: Library, dashboard, browser

**Kind**:
A slip's fixed structural role: `Loop`, `One-shot`, `Phrase`, or `Texture`. A closed enum — new kinds require a domain-model decision, not just a UI addition.
_Avoid_: Type, category

**Tag**:
A freeform, open-vocabulary label a user assigns to a slip, used for filtering and search alongside title text. Distinct from kind, which is closed.
_Avoid_: Label, category

**Capture**:
The action of creating a new slip from the top nav's "Capture" button — the zettelkasten "quick capture" motion. Not a screen: it creates a slip and drops the user into the editor.
_Avoid_: Create, new slip

**Desk**:
A top-nav destination reserved for a future screen (currently a disabled nav button). One of the app's three intended top-level screens, alongside Slip-box and Arrange.

**Arrange**:
A top-nav destination reserved for a future screen (currently a disabled nav button). One of the app's three intended top-level screens, alongside Slip-box and Desk.

## Decisions

**Design system is hand-ported, not vendored.**
The app's CSS is a hand-ported subset of the Classical design system's tokens and classes, sourced from `Musical Zettelkasten UI Mockups/_ds/`. That folder is a fidelity reference, not a runtime dependency — only the tokens/classes the app actually uses are ported in. When styling, check the mockup DS for the canonical value rather than inventing one, but don't pull in unused DS surface area.

**Strict mono-accent — no danger color.**
The app has no danger/red color exception. Destructive actions (slip delete, editor delete) use the same accent/neutral ramps as every other control, with no separate `--color-danger` token. This is deliberate, not an oversight — don't reintroduce a red/danger color for new destructive affordances.

**"Now playing" is a single app-shell-global concept.**
Exactly one playback engine and "currently playing slip" state exist at a time, shared across the dashboard and the editor via a global playback bar — not scoped per-screen. Playback intentionally stops on navigation (entering/leaving the editor, or leaving the dashboard) rather than persisting across screens; the app does not support background/cross-screen playback.
