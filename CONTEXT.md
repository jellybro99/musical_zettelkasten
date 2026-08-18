# Musical Zettelkasten

A zettelkasten for musical ideas: short note patterns ("slips") captured, tagged, and browsed like index cards, with a MIDI editor and playback attached.

## Language

**Slip**:
A single unit of musical material — a note pattern (`notes`/`grid`) plus metadata (`title`, `tempo`, `key`, `kind`, `tags`). Named after the zettelkasten "slip" (a note card). Atomic: a slip cannot hold or resolve another slip's material, so browsing or playing a slip always shows only its own notes. See ADR-0002.
_Avoid_: Clip, pattern, snippet, Embed, Include, Import, Nest, Link, Reference (composing multiple slips together is Arrange's job, not a Slip capability)

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

**Copy** / **Provenance**:
Copying a slip produces a new, fully independent slip pre-populated with the original's notes/grid/tempo/key/kind/tags, opened straight in the editor. The copy carries a one-way **provenance** pointer (`copiedFromId`) back to the slip it was copied from, shown as a "Copied from" link in the editor. Provenance is a historical fact recorded once at copy time — never resolved into playback, not reciprocated by the original, and silently omitted if the original has since been deleted. This is unrelated to the removed Reference concept (see Decisions, ADR-0002): a copy's playback is its own notes only.

**Desk**:
A top-nav destination reserved for a future screen (currently a disabled nav button). One of the app's three intended top-level screens, alongside Slip-box and Arrange.

**Arrange**:
A top-nav destination where an Arrangement is built: slips are placed on a multi-track timeline as Clips and played back together at the arrangement's own tempo. One of the app's three intended top-level screens, alongside Slip-box and Desk. An arrangement is a new persisted entity of its own — not itself a Slip — with its own list, name, and tempo. Any slip kind can be placed, not just Loop.

**Track**:
A lane within an Arrangement holding an ordered sequence of Clips. Has its own name, mute, solo, and volume state. Created either by dropping a slip onto empty timeline space (with that slip's Clip already on it) or by clicking the "+" button revealed on hover there (empty, no clip). Selectable and removable (with its clips, no confirmation); not itself reorderable in this pass.

**Clip**:
A placement of one Slip on a Track at a given bar, with its own `lengthBars` independent of the slip's own grid length — shorter truncates playback, longer loops (repeats) the slip's pattern. A Clip always plays at the arrangement's tempo, not the slip's own; a "fit" badge (e.g. "96→121") shows when they differ.
_Avoid_: Slip (a Clip references a Slip, it isn't one)

**Variation**:
An independent, transposed copy of a slip's material, created from a placed Clip via a "make a variation" popover. Reuses the Copy/Provenance mechanism rather than a new linking concept: a Variation records `copiedFromId` back to its source only when "keep linked" is enabled, otherwise it carries no link at all. Once created, a Variation is a first-class Slip like any other — playable, editable, deletable — and the Clip it was made from switches to using it.

## Decisions

**Design system is hand-ported, not vendored.**
The app's CSS is a hand-ported subset of the Classical design system's tokens and classes, sourced from `Musical Zettelkasten UI Mockups/_ds/`. That folder is a fidelity reference, not a runtime dependency — only the tokens/classes the app actually uses are ported in. When styling, check the mockup DS for the canonical value rather than inventing one, but don't pull in unused DS surface area.

**Mono-accent, with a danger exception for destructive actions.**
The app is otherwise a strict mono-accent scheme — every non-destructive control uses the `--color-accent`/neutral ramps, and that's unchanged. Destructive actions specifically (slip delete, editor delete) are the one exception: they use a dedicated `--color-danger` token (`.btn-danger` in `src/index.css`) and are visually separated from neighboring non-destructive controls, rather than rendering as an equal-weight ghost button in the same row. See ADR-0003 (supersedes ADR-0002 on this point only — ADR-0002's atomicity decision is untouched). Don't reach for `--color-danger` outside destructive affordances; it is not a second general-purpose accent.

**"Now playing" is a single app-shell-global concept.**
Exactly one playback engine and "currently playing slip" state exist at a time, shared across the dashboard and the editor via a global playback bar — not scoped per-screen. Playback intentionally stops on navigation (entering/leaving the editor, or leaving the dashboard) rather than persisting across screens; the app does not support background/cross-screen playback.

**Slips are atomic — no slip-to-slip references.**
A slip cannot hold or resolve another slip's material; playing or browsing a slip always shows only its own notes. Composing multiple slips together is the Arrange screen's job, via Tracks and Clips, not a slip-level capability. See ADR-0002 (supersedes ADR-0001).
