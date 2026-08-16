# 02 — One playback clock instead of three unsynchronized ones

**What to build:** Make `playbackEngine` the single source of truth for "is playing" / "elapsed
time," instead of `App` (wall-clock `setTimeout` estimate) and `PlaybackBar` (polling
`Date.now()`) each independently re-deriving playback state on their own clock.

**Blocked by:** 01 — do the editor-play ownership change first; it clears the seam this ticket
extends (`App` already needs to become the single owner of playback-related state for 01, this
ticket finishes that by moving the *timing* source of truth too).

**Status:** done

Current shape (for reference):
- `playbackEngine.ts:31–47` — schedules oscillator start/stop against `context.currentTime` (the
  real clock; nothing else reads it)
- `App.tsx:16,20,26,32` — `stopTimeoutRef` + `setTimeout(() => setNowPlaying(null), durationMs)`,
  a **second**, wall-clock estimate of when playback ends
- `PlaybackBar.tsx:23–30` — `setInterval` polling `Date.now()` every 100ms against
  `nowPlaying.startedAt` (captured at `App.tsx:31`), a **third** independent "now" reading
- `domain/playback.ts:30–45` — `computePlaybackDurationMs`/`computePlaybackProgress`, pure and
  well-tested, but called from two unrelated places (App, PlaybackBar) that don't know about each
  other

Checklist:

- [x] `PlaybackEngine` interface (`audio/playbackEngine.ts`) grows a way to report playback state
  — e.g. `play()`/`stop()` accept an `onProgress(elapsedMs: number)` callback, or the engine
  exposes `isPlaying()`/`getElapsedMs()` polled from one place — the engine's own scheduled
  oscillator stop becomes the thing that ends playback state, not a parallel `setTimeout` in `App`
- [x] `App.tsx` stops running its own `stopTimeoutRef`/`setTimeout` to clear `nowPlaying` —
  playback ending is driven by the engine, not guessed at from `computePlaybackDurationMs`
- [x] `PlaybackBar.tsx` stops polling `Date.now()` independently — it reads progress from the
  same single source `App` now gets from the engine (props/state update), not a second timer
- [x] `computePlaybackDurationMs`/`computePlaybackProgress` stay in `domain/playback.ts` as pure
  helpers, but end up called from inside the engine boundary (or the one place that owns
  playback state), not duplicated across `App` and `PlaybackBar`
- [x] Manual check: play a slip, let it run to completion without touching anything — confirm the
  bar's progress reaches 100% and stops at the same moment audio actually stops (this is the drift
  this ticket removes — no `setTimeout` vs `AudioContext` gap to check against, but eyeball it)
- [x] `npm run build` and `npm run test` pass
