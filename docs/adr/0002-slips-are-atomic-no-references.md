---
status: accepted, supersedes ADR-0001
---

# Slips are atomic — remove slip-to-slip references

Musical Zettelkasten's zettelkasten identity depends on every slip standing alone: browsing or playing a slip should always show just that slip's own material. ADR-0001's live-resolving reference feature broke this — a melody slip referencing a chord-progression slip no longer plays as "just the melody" once opened standalone, even though its own note data is untouched. We removed slip→slip references entirely; a Slip now has zero composition capability. The two things references loosely served are handled elsewhere instead: reuse-with-variation is covered by slip copy + provenance (an independent feature), and multi-slip composition is deferred to the future Arrange screen, which will combine Loop-kind slips into a song. Arrangement→arrangement nesting is unaffected by this decision — an Arrangement is explicitly not a Slip (see `CONTEXT.md`), so the atomicity constraint doesn't bind it.

## Considered Options

- **Restrict references to same-kind slips only** — rejected: still couples a slip's identity to another's, doesn't fix the atomicity break.
- **Keep references, but exclude referenced material when the referencing slip is played standalone** — rejected: makes the feature pointless, since the resolved playback was the entire point.

## Consequences

- The resolve-live union/clip algorithm from ADR-0001 is reserved for reuse in the future Arrange screen, not deleted outright.
- The slip editor's reference UI and the slip data model's reference field are removed.
