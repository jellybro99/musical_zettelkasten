# Slip references resolve live, without time offset, and ignore tempo/key mismatch

Musical Zettelkasten needed a way to combine multiple slips into one and to reuse a slip's material inside another. We considered snapshotting a referenced slip's notes at the moment of embedding versus resolving references live at read/playback time, and chose live resolution: editing a source slip propagates to everything built from it, matching the zettelkasten idea that a slip is a single evolving source of truth rather than something forked on reuse. We also chose not to support a per-reference time offset or pitch transposition in this pass — referenced slips' notes simply overlay at grid step 0 of the referencing slip and get clipped to its grid length — and to leave tempo/key mismatches between a slip and its references unreconciled, since notes are grid-step data and a slip's tempo only scales overall playback speed rather than reinterpreting step meaning. A slip may not reference itself, directly or transitively; this is enforced when a reference is added, not just assumed.

## Considered Options

- **Snapshot copy at embed time** — rejected: breaks the "one source of truth per idea" property that motivates this feature, and produces silent drift between a slip and the slips it was built from.
- **Per-reference time offset / transposition** — rejected for v1: real DAW-style placement, more domain and UI surface than the first pass needs. Deferred to the planned Arrange screen, which is a different object from Slip.

## Consequences

- Combining slips whose content is longer than the referencing slip's grid silently truncates rather than erroring or resizing the grid.
- Timeline-style composition (multiple slips placed in sequence with independent offsets) is deferred to the planned Arrange screen, which composes Loop-kind slips and is not itself a Slip.
