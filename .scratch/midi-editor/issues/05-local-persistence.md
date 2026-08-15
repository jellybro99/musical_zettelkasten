# 05 — Local persistence

**What to build:** The current slip (notes + metadata) autosaves to IndexedDB as it's edited, and reloads exactly as it was left when the editor is reopened — so a musician's idea survives a refresh or browser close.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] A persistence adapter serializes the domain module's full slip shape (notes + grid config + metadata) to IndexedDB
- [ ] Changes to notes or metadata trigger an autosave (no explicit "Save" button required)
- [ ] On loading the editor, the previously saved slip (if any) is deserialized from IndexedDB and rendered exactly as it was left
- [ ] If no slip has been saved yet, the editor opens with a fresh empty slip (no crash on first run)
- [ ] Persistence is local-only — no network calls, no backend, no auth
- [ ] A smoke test covers save-then-load returning the same slip shape (not exhaustive IndexedDB coverage)
