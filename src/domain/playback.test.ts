import { describe, expect, it } from 'vitest'
import { computeTriggerTimes } from './playback'
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
