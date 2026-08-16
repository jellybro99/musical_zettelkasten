# 06 — CONTEXT.md

**What to build:** A repo-root `CONTEXT.md` capturing the domain vocabulary and cross-cutting decisions that have stabilized across the MIDI editor, Slip-box, and this UI-refresh phase.

**Blocked by:** None — independent of the other tickets, can run anytime

**Status:** ready-for-agent

- [x] `CONTEXT.md` created at the repo root, following the single-context structure described in `docs/agents/domain.md`
- [x] Glossary entries for: **slip**, **slip-box**, **kind** (Loop / One-shot / Phrase / Texture), **tag**, **capture**, **Desk**, **Arrange**
- [x] Records that the app's design system is a hand-ported (not vendored) subset of the Classical DS's tokens/classes from `Musical Zettelkasten UI Mockups/_ds/`
- [x] Records the strict-mono-accent decision: the app has no danger/red color exception — destructive actions use the same accent/neutral ramps as everything else (see ticket 03)
- [x] Records that "now playing" is a single app-shell-global concept (not scoped per-screen), and that playback intentionally stops on navigation rather than persisting across screens (see tickets 04/05)
