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

export function computeTriggerTimes(notes: Note[], tempo: number): NoteTrigger[] {
  const secondsPerStep = 60 / tempo / STEPS_PER_BEAT

  return notes.map((note) => ({
    id: note.id,
    pitch: note.pitch,
    velocity: note.velocity,
    time: note.start * secondsPerStep,
    duration: note.length * secondsPerStep,
  }))
}
