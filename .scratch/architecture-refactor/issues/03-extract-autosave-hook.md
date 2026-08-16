# 03 — Extract SlipEditor's autosave policy into one hook

**What to build:** Pull the four hand-correlated state cells that implement
`SlipEditor`'s save policy — load-gate, dirty-check via JSON diff, 400ms debounce, persisted-gate
— into a single `useAutosave` hook, so the whole policy is stated in one place instead of
reconstructed by reading three interleaved effects.

**Blocked by:** None — independent of 01/02 (persistence concern, not playback)

**Status:** done

Current shape (for reference — all in `SlipEditor.tsx`):
- `:19–23` — `isLoaded`, `isPersisted`, `pristineJsonRef`, `autosaveTimeoutRef`, plus the pristine
  check running in the render body itself
- `:30–50` — load effect: fetches saved slip, seeds `pristineJsonRef`, sets `isLoaded`/`isPersisted`
- `:52–62` — autosave effect: re-serializes `slip` via `JSON.stringify` on every change, compares
  to `pristineJsonRef`, debounce-saves via `AUTOSAVE_DELAY_MS` (400ms)
- `:80–89` — `handleSave` (manual save) also mutates `pristineJsonRef` and `isPersisted` — a third
  place touching the same state
- `:91–101` — `handleDelete` clears `autosaveTimeoutRef` — a fourth place that has to know this
  state exists

Checklist:

- [x] New hook, e.g. `useAutosave(slip: Slip, slipId: string, { save, load }): { isLoaded, isPersisted, markSaved }`
  (name/shape can flex) — owns `isLoaded`, `isPersisted`, `pristineJsonRef`, `autosaveTimeoutRef`
  and both effects (load + debounce-save) internally
- [x] Hook's dirty-check (JSON diff against pristine) and debounce timing are unit-testable against
  a fake `save`/`load` — no `MetadataPanel`/`PianoRoll`/IndexedDB mounting required to verify "does
  this call save 400ms after a change, and not before load completes"
- [x] `SlipEditor.tsx` calls the hook and drops its own copies of the four state cells and two
  effects — `handleSave` calls the hook's `markSaved`-equivalent instead of touching
  `pristineJsonRef`/`isPersisted` directly; `handleDelete` calls into the hook to cancel any
  pending autosave instead of reaching into `autosaveTimeoutRef` itself
- [x] Existing behavior is unchanged: autosave still only fires once loaded and persisted, still
  debounces 400ms, manual Save still works and marks pristine, Delete still cancels a pending
  autosave
- [x] `src/domain/slip.test.ts` and friends still pass; add a test file for the new hook alongside
  it (matches this repo's convention of a `.test.ts` next to the module it tests)
- [x] `npm run build` and `npm run test` pass

## Comments

Implemented `useAutosave` at `src/hooks/useAutosave.ts` with `(value, id, { load, save,
onLoaded }) -> { isLoaded, isPersisted, markSaved, cancelPending }`. `onLoaded` was added to the
options (not in the ticket's suggested shape) so the hook can still hand a freshly-loaded value
back to `SlipEditor` for `setSlip`, since the hook doesn't own `slip` state itself.

No DOM-testing infra existed in this repo yet, so `@testing-library/react` + `jsdom` were added as
devDependencies to unit-test the hook via `renderHook` with fake timers — the test file sets
`// @vitest-environment jsdom` per-file rather than switching the whole suite's environment.
9 cases in `src/hooks/useAutosave.test.ts` cover load-gating, persisted-gating, 400ms debounce
timing, dirty-check, `markSaved`, and `cancelPending`.

Ran `/code-review` (Standards + Spec axes). Spec axis: no findings. Standards axis flagged two
judgement calls that were fixed — an unused `delayMs` option (speculative generality, no caller
ever passed it) was dropped in favor of the internal `AUTOSAVE_DELAY_MS` constant, and two
`eslint-disable-next-line react-hooks/exhaustive-deps` comments were removed since this repo lints
with oxlint and has no `react-hooks` plugin configured, so they suppressed nothing.
