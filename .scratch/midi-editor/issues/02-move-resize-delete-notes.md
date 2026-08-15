# 02 — Move, resize, delete notes

**What to build:** Notes already placed in the piano roll (ticket 01) can be dragged to reposition, dragged at the edge to resize, and removed. All three operations stay snapped to the grid.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Domain module exposes `moveNote`, `resizeNote`, and `deleteNote` as plain data-in/data-out functions alongside `placeNote`/`snapToGrid`
- [ ] Dragging a note horizontally/vertically in the UI moves it (time/pitch), snapped to the grid
- [ ] Dragging a note's edge resizes its length, snapped to the grid
- [ ] A UI action (e.g. click/keypress) deletes a note
- [ ] Resizing a note to zero or negative length is handled (e.g. clamped to a minimum length)
- [ ] Moving/resizing a note so it overlaps another note is handled without crashing or corrupting state
- [ ] Deleting a note that doesn't exist (already removed) is a safe no-op
- [ ] Unit tests cover `moveNote`, `resizeNote`, `deleteNote` directly, including the edge cases above — no DOM drag simulation
