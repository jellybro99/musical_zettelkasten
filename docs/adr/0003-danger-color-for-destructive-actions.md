---
status: accepted, supersedes ADR-0002
---

# Danger color for destructive actions

Note on scope: "supersedes ADR-0002" refers only to the mono-accent-for-destructive-actions stance that had accumulated as a follow-on note in `CONTEXT.md`'s Decisions section (adjacent to, but not part of, ADR-0002's actual subject). ADR-0002's own decision — slips are atomic, no slip-to-slip references — is untouched by this ADR.

Musical Zettelkasten's Classical design system is a strict mono-accent scheme: one accent voice (`--color-accent` and its ramp), color applied as stroke rather than fill, no second accent. That rule previously extended to destructive actions too — slip delete and editor delete rendered as equal-weight ghost buttons in the same accent/neutral ramps as Save, Copy, and every other control. In practice this made delete too easy to hit by mistake: it sat in the same row, same visual weight, same color language as non-destructive actions, with only a `window.confirm` dialog as a backstop. We're introducing a single `--color-danger` token, used exclusively for destructive affordances (the editor's delete button, the dashboard card's hover delete icon), and separating those controls from their neighboring action groups (a divider in the editor, position/color distinction on the dashboard card). This does not reopen the mono-accent decision for anything else — every other control in the app keeps using the accent/neutral ramps exactly as before; `--color-danger` is scoped to "this action is destructive," not a second general-purpose accent.

## Considered Options

- **Keep strict mono-accent, rely on `window.confirm` alone** — rejected: the original motivation (ADR context, `CONTEXT.md`) undervalued how much a same-weight, same-color delete control increases the chance of an accidental click before the confirm dialog is even reached. A confirm dialog is a second line of defense, not a substitute for the affordance itself signaling risk.
- **Full danger ramp (100–900, mirroring `--color-accent-*`)** — rejected for now: only a single base token is consumed today (button text/border color, with `color-mix()` for hover/active tints, matching how `--color-accent` is used by `.btn-primary`). A full ramp can be added later if a tinted-fill danger surface (e.g. a `tag-danger`) is ever needed.
- **Scope the new token to a confirm modal instead of the trigger button** — rejected: the ticket motivating this change explicitly keeps the existing `window.confirm(...)` call and does not introduce a new confirm-modal component; the danger color belongs on the button that triggers deletion, not on UI that doesn't exist.

## Consequences

- `src/index.css` gains one new design token, `--color-danger`, plus a `.btn-danger` component class (styled the same way `.btn-primary` is: base color/border plus `color-mix()` hover/active tints).
- The editor's delete button (`MetadataPanel`) uses `.btn-danger`, is labeled "Delete" (not "Delete slip"), and is visually separated from the Save/Copy group by a divider.
- The dashboard card's hover delete icon (`SlipDashboard`) adopts the same danger color and hover/active/focus treatment for consistency with the editor.
- `CONTEXT.md`'s "Strict mono-accent — no danger color" decision is rewritten to describe the new, narrower rule: accent/neutral ramps stay mono everywhere except destructive-action affordances, which use `--color-danger`.
- Any future destructive control (e.g. a future bulk-delete or discard action) should reach for `--color-danger` / `.btn-danger` rather than reinventing a red, and should not use it for anything non-destructive.
