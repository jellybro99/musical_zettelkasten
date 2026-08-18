import { describe, expect, it } from 'vitest'
import { addTrack, createArrangement, placeClip, setClipTranspose, toggleTrackMute, toggleTrackSolo } from './arrangement'
import {
  computeArrangementPlayback,
  computePlaybackDurationMs,
  computePlaybackProgress,
  computeTriggerTimes,
  formatPlaybackTime,
} from './playback'
import { createSlip, DEFAULT_GRID, type Note, type Slip } from './slip'

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

describe('computeArrangementPlayback', () => {
  function slip(overrides: Partial<Slip>): Slip {
    return createSlip({ tempo: 120, grid: DEFAULT_GRID, ...overrides })
  }

  it('returns no triggers and zero duration for an arrangement with no tracks', () => {
    const result = computeArrangementPlayback(createArrangement({ tempo: 120 }), new Map())

    expect(result).toEqual({ triggers: [], durationMs: 0 })
  })

  it('mixes triggers from multiple tracks, tagged with their track id', () => {
    const slipA = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0 })] })
    const slipB = slip({ id: 'slip-b', notes: [note({ id: 'b1', start: 0 })] })
    const slipsById = new Map([
      [slipA.id, slipA],
      [slipB.id, slipB],
    ])

    let arrangement = addTrack(addTrack(createArrangement({ tempo: 120 }), { name: 'A' }), { name: 'B' })
    const [trackA, trackB] = arrangement.tracks
    arrangement = placeClip(arrangement, { trackId: trackA.id, slipId: slipA.id, startBar: 0, slipBars: 2 })
    arrangement = placeClip(arrangement, { trackId: trackB.id, slipId: slipB.id, startBar: 0, slipBars: 2 })

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers).toHaveLength(2)
    expect(triggers.map((t) => t.trackId).sort()).toEqual([trackA.id, trackB.id].sort())
  })

  it('excludes a muted track\'s triggers', () => {
    const slipA = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0 })] })
    const slipB = slip({ id: 'slip-b', notes: [note({ id: 'b1', start: 0 })] })
    const slipsById = new Map([
      [slipA.id, slipA],
      [slipB.id, slipB],
    ])

    let arrangement = addTrack(addTrack(createArrangement({ tempo: 120 }), { name: 'A' }), { name: 'B' })
    const [trackA, trackB] = arrangement.tracks
    arrangement = placeClip(arrangement, { trackId: trackA.id, slipId: slipA.id, startBar: 0, slipBars: 2 })
    arrangement = placeClip(arrangement, { trackId: trackB.id, slipId: slipB.id, startBar: 0, slipBars: 2 })
    arrangement = toggleTrackMute(arrangement, trackA.id)

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers).toHaveLength(1)
    expect(triggers[0].trackId).toBe(trackB.id)
  })

  it('when any track is soloed, only soloed tracks\' triggers are present', () => {
    const slipA = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0 })] })
    const slipB = slip({ id: 'slip-b', notes: [note({ id: 'b1', start: 0 })] })
    const slipC = slip({ id: 'slip-c', notes: [note({ id: 'c1', start: 0 })] })
    const slipsById = new Map([
      [slipA.id, slipA],
      [slipB.id, slipB],
      [slipC.id, slipC],
    ])

    let arrangement = addTrack(addTrack(addTrack(createArrangement({ tempo: 120 }), { name: 'A' }), { name: 'B' }), {
      name: 'C',
    })
    const [trackA, trackB, trackC] = arrangement.tracks
    arrangement = placeClip(arrangement, { trackId: trackA.id, slipId: slipA.id, startBar: 0, slipBars: 2 })
    arrangement = placeClip(arrangement, { trackId: trackB.id, slipId: slipB.id, startBar: 0, slipBars: 2 })
    arrangement = placeClip(arrangement, { trackId: trackC.id, slipId: slipC.id, startBar: 0, slipBars: 2 })
    arrangement = toggleTrackSolo(arrangement, trackB.id)

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers).toHaveLength(1)
    expect(triggers[0].trackId).toBe(trackB.id)
  })

  it('a muted track stays silent even if it is also soloed', () => {
    const slipA = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0 })] })
    const slipsById = new Map([[slipA.id, slipA]])

    let arrangement = addTrack(createArrangement({ tempo: 120 }))
    const trackId = arrangement.tracks[0].id
    arrangement = placeClip(arrangement, { trackId, slipId: slipA.id, startBar: 0, slipBars: 2 })
    arrangement = toggleTrackSolo(arrangement, trackId)
    arrangement = toggleTrackMute(arrangement, trackId)

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers).toEqual([])
  })

  it('reinterprets note timing at the arrangement tempo, not the slip\'s own', () => {
    const slowSlip = slip({ id: 'slip-a', tempo: 60, notes: [note({ start: 4 })] })
    const slipsById = new Map([[slowSlip.id, slowSlip]])

    const arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: slowSlip.id,
      startBar: 0,
      slipBars: 2,
    })

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers[0].time).toBeCloseTo(0.5)
  })

  it('repeats a clip longer than its slip to fill the extra bars', () => {
    const twoBarSlip = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0 })] })
    const slipsById = new Map([[twoBarSlip.id, twoBarSlip]])

    const arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: twoBarSlip.id,
      startBar: 0,
      slipBars: 4,
    })

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers.map((t) => t.time)).toEqual([0, 4])
  })

  it('truncates a clip shorter than its slip to only the first part of the pattern', () => {
    const twoBarSlip = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0 }), note({ id: 'a2', start: 20 })] })
    const slipsById = new Map([[twoBarSlip.id, twoBarSlip]])

    const arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: twoBarSlip.id,
      startBar: 0,
      slipBars: 1,
    })

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers.map((t) => t.id)).toEqual(['a1'])
  })

  it('offsets a clip\'s triggers by its startBar converted to time at the arrangement tempo', () => {
    const twoBarSlip = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0 })] })
    const slipsById = new Map([[twoBarSlip.id, twoBarSlip]])

    const arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: twoBarSlip.id,
      startBar: 2,
      slipBars: 2,
    })

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers[0].time).toBeCloseTo(4)
  })

  it('durationMs reflects the furthest clip\'s extent', () => {
    const twoBarSlip = slip({ id: 'slip-a', notes: [note({ start: 0 })] })
    const slipsById = new Map([[twoBarSlip.id, twoBarSlip]])

    let arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: twoBarSlip.id,
      startBar: 0,
      slipBars: 2,
    })
    const trackId = arrangement.tracks[0].id
    arrangement = placeClip(arrangement, { trackId, slipId: twoBarSlip.id, startBar: 4, slipBars: 2 })

    const { durationMs } = computeArrangementPlayback(arrangement, slipsById)

    expect(durationMs).toBeCloseTo(computePlaybackDurationMs(120, 6 * DEFAULT_GRID.stepsPerBar))
  })

  it('shifts trigger pitches by a clip\'s transpose offset', () => {
    const slipA = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0, pitch: 60 })] })
    const slipsById = new Map([[slipA.id, slipA]])

    let arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: slipA.id,
      startBar: 0,
      slipBars: 2,
    })
    const clipId = arrangement.tracks[0].clips[0].id
    arrangement = setClipTranspose(arrangement, { clipId, semitones: 3 })

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers[0].pitch).toBe(63)
  })

  it('leaves trigger pitches unchanged for a zero/absent transpose offset', () => {
    const slipA = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0, pitch: 60 })] })
    const slipsById = new Map([[slipA.id, slipA]])

    const arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: slipA.id,
      startBar: 0,
      slipBars: 2,
    })

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers[0].pitch).toBe(60)
  })

  it('clamps a transposed pitch to the slip grid bounds, same as createVariation', () => {
    const slipA = slip({
      id: 'slip-a',
      grid: { ...DEFAULT_GRID, lowPitch: 60, highPitch: 71 },
      notes: [note({ id: 'a1', start: 0, pitch: 70 })],
    })
    const slipsById = new Map([[slipA.id, slipA]])

    let arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: slipA.id,
      startBar: 0,
      slipBars: 2,
    })
    const clipId = arrangement.tracks[0].clips[0].id
    arrangement = setClipTranspose(arrangement, { clipId, semitones: 5 })

    const { triggers } = computeArrangementPlayback(arrangement, slipsById)

    expect(triggers[0].pitch).toBe(71)
  })

  it('never mutates the underlying slip\'s notes when a clip has a transpose offset', () => {
    const slipA = slip({ id: 'slip-a', notes: [note({ id: 'a1', start: 0, pitch: 60 })] })
    const slipsById = new Map([[slipA.id, slipA]])

    let arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: slipA.id,
      startBar: 0,
      slipBars: 2,
    })
    const clipId = arrangement.tracks[0].clips[0].id
    arrangement = setClipTranspose(arrangement, { clipId, semitones: 3 })

    computeArrangementPlayback(arrangement, slipsById)

    expect(slipA.notes[0].pitch).toBe(60)
  })

  it('silently omits a clip whose slip is missing, matching provenance semantics elsewhere', () => {
    const arrangement = placeClip(createArrangement({ tempo: 120 }), {
      trackId: 'new-track',
      slipId: 'missing-slip',
      startBar: 0,
      slipBars: 2,
    })

    const result = computeArrangementPlayback(arrangement, new Map())

    expect(result).toEqual({ triggers: [], durationMs: 0 })
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
