# 01 — App owns "which slip is currently playable," drop the editor-play ref dance

**What to build:** Replace the `onRegisterPlay`/`editorPlayRef` round-trip between `App` and
`SlipEditor` with `App` holding a direct reference to the editor's current slip, so the global
`PlaybackBar` toggle can call `playSlip(currentEditorSlip)` without going through a ref registered
by a closure that re-fires on every keystroke.

**Blocked by:** None — can start immediately

**Status:** done

Current shape (for reference — this is what's being replaced):
- `App.tsx:17,58–60` — `editorPlayRef` (mutable ref) + `registerEditorPlay`
- `App.tsx:62–68` — `handleBarToggle` calls `editorPlayRef.current?.()`
- `App.tsx:77–82` — `SlipEditor` is given `onPlay={playSlip}` and `onRegisterPlay={registerEditorPlay}`
- `SlipEditor.tsx:25–28` — effect keyed on `[slip, onPlay, onRegisterPlay]` that calls
  `onRegisterPlay(() => onPlay(slip))` — re-registers on every `slip` change (every keystroke,
  every note edit), not just on mount/unmount

Checklist:

- [x] `SlipEditor` reports its current slip to `App` directly (e.g. an `onSlipChange(slip: Slip)`
  prop called whenever local `slip` state changes) instead of exporting a play closure via
  `onRegisterPlay`
- [x] `App` stores the reported slip (e.g. `currentEditorSlip: Slip | null`, cleared on
  `goToDashboard`/`openSlip` navigation) and `handleBarToggle` calls
  `playSlip(currentEditorSlip)` directly — no ref, no registered closure
- [x] `SlipEditorProps` drops `onPlay` and `onRegisterPlay`; `App` no longer passes `playSlip` down
  into the editor at all
- [x] `editorPlayRef` is deleted from `App.tsx`
- [x] Manual check: open a slip, hit play from the global bar, confirm playback starts; edit the
  title/tempo/a note while nothing is playing, then hit play — confirm it still plays the
  up-to-date slip (this is the exact case `4370e8e` patched — don't regress it)
- [x] `npm run build` and `npm run test` pass
