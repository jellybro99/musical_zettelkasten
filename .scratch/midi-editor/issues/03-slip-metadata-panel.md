# 03 — Slip metadata panel

**What to build:** Alongside the piano roll, a panel lets the musician set the slip's metadata: title, tempo (BPM), key, kind, and tags. This is wired to the same slip object the domain module owns.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Slip data shape (from ticket 01's domain module) is extended with metadata fields: title, tempo (BPM), key, kind, tags
- [ ] UI panel renders editable fields for title, tempo, key, kind, and tags next to the piano roll
- [ ] Kind is constrained to the existing slip kinds (Loop / One-shot / Phrase / Texture)
- [ ] Editing any metadata field updates the same in-memory slip object the piano roll reads/writes
- [ ] Tags support adding and removing individual tags
- [ ] Unit tests cover metadata updates against the domain module's data shape (no DOM interaction tests required for this ticket)
