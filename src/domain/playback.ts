import type { Arrangement } from './arrangement'
import { clamp, snapToGrid, type GridConfig, type Note, type Slip } from './slip'

// Mirrors createVariation's pitch-clamping so a transposed clip's notes stay
// within the slip's own grid bounds rather than drifting off-screen.
function transposePitch(pitch: number, semitones: number, grid: GridConfig): number {
  return clamp(snapToGrid(pitch + semitones), grid.lowPitch, grid.highPitch)
}

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

export interface ArrangementNoteTrigger extends NoteTrigger {
  trackId: string
}

export interface ArrangementPlayback {
  triggers: ArrangementNoteTrigger[]
  durationMs: number
}

// A clip's own step data repeats/truncates to fill its lengthBars, then gets
// reinterpreted at the arrangement's tempo (not the slip's own) — tempo-fit
// is purely "replay these steps at a different speed," no time-stretch DSP.
export function computeArrangementPlayback(arrangement: Arrangement, slipsById: Map<string, Slip>): ArrangementPlayback {
  const anySolo = arrangement.tracks.some((track) => track.solo)
  const audibleTracks = arrangement.tracks.filter((track) => !track.muted && (!anySolo || track.solo))

  const triggers: ArrangementNoteTrigger[] = []
  let furthestStep = 0

  for (const track of audibleTracks) {
    for (const clip of track.clips) {
      const slip = slipsById.get(clip.slipId)
      if (!slip) continue

      const stepsPerBar = slip.grid.stepsPerBar
      const slipSteps = slip.grid.bars * stepsPerBar
      const clipSteps = clip.lengthBars * stepsPerBar
      const clipStartSeconds = computePlaybackDurationMs(arrangement.tempo, clip.startBar * stepsPerBar) / 1000

      const repeatedNotes: Note[] = []
      if (slipSteps > 0) {
        for (let offsetSteps = 0; offsetSteps < clipSteps; offsetSteps += slipSteps) {
          for (const note of slip.notes) {
            const start = note.start + offsetSteps
            if (start >= clipSteps) continue
            const pitch = clip.transposeSemitones
              ? transposePitch(note.pitch, clip.transposeSemitones, slip.grid)
              : note.pitch
            repeatedNotes.push({ ...note, start, pitch })
          }
        }
      }

      const trackVolume = track.volume ?? 1
      for (const trigger of computeTriggerTimes(repeatedNotes, arrangement.tempo)) {
        triggers.push({
          ...trigger,
          velocity: trigger.velocity * trackVolume,
          time: trigger.time + clipStartSeconds,
          trackId: track.id,
        })
      }

      furthestStep = Math.max(furthestStep, (clip.startBar + clip.lengthBars) * stepsPerBar)
    }
  }

  return { triggers, durationMs: computePlaybackDurationMs(arrangement.tempo, furthestStep) }
}
