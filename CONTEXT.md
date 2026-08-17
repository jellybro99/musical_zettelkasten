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
A top-nav destination reserved for a future screen (currently a disabled nav button) where multiple Loop-kind slips get placed on a timeline to build a song. One of the app's three intended top-level screens, alongside Slip-box and Desk. An arrangement is not itself a Slip.

## Decisions

**Design system is hand-ported, not vendored.**
The app's CSS is a hand-ported subset of the Classical design system's tokens and classes, sourced from `Musical Zettelkasten UI Mockups/_ds/`. That folder is a fidelity reference, not a runtime dependency — only the tokens/classes the app actually uses are ported in. When styling, check the mockup DS for the canonical value rather than inventing one, but don't pull in unused DS surface area.

**Strict mono-accent — no danger color.**
The app has no danger/red color exception. Destructive actions (slip delete, editor delete) use the same accent/neutral ramps as every other control, with no separate `--color-danger` token. This is deliberate, not an oversight — don't reintroduce a red/danger color for new destructive affordances.

**"Now playing" is a single app-shell-global concept.**
Exactly one playback engine and "currently playing slip" state exist at a time, shared across the dashboard and the editor via a global playback bar — not scoped per-screen. Playback intentionally stops on navigation (entering/leaving the editor, or leaving the dashboard) rather than persisting across screens; the app does not support background/cross-screen playback.

**Slips are atomic — no slip-to-slip references.**
A slip cannot hold or resolve another slip's material; playing or browsing a slip always shows only its own notes. Composing multiple slips together is deferred to the future Arrange screen, which combines Loop-kind slips into a song. See ADR-0002 (supersedes ADR-0001).
