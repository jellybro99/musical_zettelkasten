import { describe, expect, it } from 'vitest'
import { computePlaybackDurationMs, computePlaybackProgress, computeTriggerTimes, formatPlaybackTime } from './playback'
import type { Note } from './slip'

function note(overrides: Partial<Note>): Note {
  return { id: 'n1', pitch: 60, start: 0, length: 4, velocity: 0.8, ...overrides }
}

describe('computeTriggerTimes', () => {
  it('converts a note starting at step 0 to time 0', () => {
    const [trigger] = computeTriggerTimes([note({ start: 0 })], 120)
    expect(trigger.time).toBe(0)
  })

  it('converts step offset to seconds using 4 steps per beat', () => {
    const [trigger] = computeTriggerTimes([note({ start: 4 })], 120)

    expect(trigger.time).toBeCloseTo(0.5)
  })

  it('scales trigger time with tempo', () => {
    const [trigger] = computeTriggerTimes([note({ start: 4 })], 60)

    expect(trigger.time).toBeCloseTo(1)
  })

  it('converts note length to a duration in seconds', () => {
    const [trigger] = computeTriggerTimes([note({ length: 8 })], 120)

    expect(trigger.duration).toBeCloseTo(1)
  })

  it('carries id, pitch, and velocity through unchanged', () => {
    const [trigger] = computeTriggerTimes([note({ id: 'abc', pitch: 67, velocity: 0.5 })], 120)

    expect(trigger).toMatchObject({ id: 'abc', pitch: 67, velocity: 0.5 })
  })

  it('computes independent trigger times for multiple notes', () => {
    const notes = [note({ id: 'a', start: 0 }), note({ id: 'b', start: 8 })]
    const triggers = computeTriggerTimes(notes, 120)

    expect(triggers.map((t) => t.time)).toEqual([0, 1])
  })

  it('returns an empty array for no notes', () => {
    expect(computeTriggerTimes([], 120)).toEqual([])
  })
})

describe('computePlaybackDurationMs', () => {
  it('scales duration with step count at a fixed tempo', () => {
    expect(computePlaybackDurationMs(120, 32)).toBeCloseTo(4000)
  })

  it('scales duration inversely with tempo', () => {
    expect(computePlaybackDurationMs(60, 32)).toBeCloseTo(8000)
  })

  it('returns 0 for a zero step count', () => {
    expect(computePlaybackDurationMs(120, 0)).toBe(0)
  })
})

describe('computePlaybackProgress', () => {
  it('reports zero elapsed and full remaining at the start', () => {
    expect(computePlaybackProgress(4000, 0)).toEqual({ elapsedMs: 0, remainingMs: 4000, ratio: 0 })
  })

  it('reports elapsed/remaining/ratio partway through', () => {
    expect(computePlaybackProgress(4000, 1000)).toEqual({ elapsedMs: 1000, remainingMs: 3000, ratio: 0.25 })
  })

  it('clamps elapsed to the duration once playback should have finished', () => {
    expect(computePlaybackProgress(4000, 5000)).toEqual({ elapsedMs: 4000, remainingMs: 0, ratio: 1 })
  })

  it('clamps elapsed to zero for a negative offset', () => {
    expect(computePlaybackProgress(4000, -50)).toEqual({ elapsedMs: 0, remainingMs: 4000, ratio: 0 })
  })

  it('treats a zero duration as fully elapsed with a safe ratio', () => {
    expect(computePlaybackProgress(0, 0)).toEqual({ elapsedMs: 0, remainingMs: 0, ratio: 0 })
  })
})

describe('formatPlaybackTime', () => {
  it('formats sub-minute durations as seconds with one decimal', () => {
    expect(formatPlaybackTime(800)).toBe('0:00.8')
  })

  it('formats durations at or above a minute with the minute component', () => {
    expect(formatPlaybackTime(65000)).toBe('1:05.0')
  })

  it('pads seconds under ten', () => {
    expect(formatPlaybackTime(3000)).toBe('0:03.0')
  })

  it('formats zero as 0:00.0', () => {
    expect(formatPlaybackTime(0)).toBe('0:00.0')
  })
})
