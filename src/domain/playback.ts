import type { Note } from './slip'

// Matches the 4-steps-per-beat grid convention used by PianoRoll's beat lines.
const STEPS_PER_BEAT = 4

export interface NoteTrigger {
  id: string
  pitch: number
  velocity: number
  time: number
  duration: number
}

function secondsPerStep(tempo: number): number {
  return 60 / tempo / STEPS_PER_BEAT
}

export function computeTriggerTimes(notes: Note[], tempo: number): NoteTrigger[] {
  const step = secondsPerStep(tempo)

  return notes.map((note) => ({
    id: note.id,
    pitch: note.pitch,
    velocity: note.velocity,
    time: note.start * step,
    duration: note.length * step,
  }))
}

export function computePlaybackDurationMs(tempo: number, stepCount: number): number {
  return stepCount * secondsPerStep(tempo) * 1000
}

export interface PlaybackProgress {
  elapsedMs: number
  remainingMs: number
  ratio: number
}

export function computePlaybackProgress(durationMs: number, elapsedSinceStartMs: number): PlaybackProgress {
  const elapsedMs = Math.min(durationMs, Math.max(0, elapsedSinceStartMs))
  const remainingMs = Math.max(0, durationMs - elapsedMs)
  const ratio = durationMs > 0 ? elapsedMs / durationMs : 0
  return { elapsedMs, remainingMs, ratio }
}

export function formatPlaybackTime(ms: number): string {
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds - minutes * 60
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`
}
