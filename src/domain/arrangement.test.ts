import { describe, expect, it } from 'vitest'
import {
  addTrack,
  computeLoopMarks,
  createArrangement,
  moveClip,
  placeClip,
  removeClip,
  removeTrack,
  renameTrack,
  resizeClipLoop,
  setClipSlip,
  toggleTrackMute,
  toggleTrackSolo,
  updateArrangementMetadata,
  type Clip,
} from './arrangement'

describe('createArrangement', () => {
  it('creates an arrangement with default metadata and no tracks', () => {
    const arrangement = createArrangement()

    expect(arrangement).toMatchObject({ name: 'Untitled arrangement', tempo: 120, tracks: [] })
  })

  it('applies overrides on top of the defaults', () => {
    const arrangement = createArrangement({ name: 'My Song', tempo: 96 })

    expect(arrangement.name).toBe('My Song')
    expect(arrangement.tempo).toBe(96)
  })

  it('assigns an id', () => {
    const arrangement = createArrangement()

    expect(arrangement.id).toEqual(expect.any(String))
  })

  it('assigns each arrangement a unique id', () => {
    const first = createArrangement()
    const second = createArrangement()

    expect(first.id).not.toBe(second.id)
  })

  it('sets createdAt', () => {
    const arrangement = createArrangement()

    expect(arrangement.createdAt).toEqual(expect.any(Number))
  })
})

describe('updateArrangementMetadata', () => {
  it('updates the name', () => {
    const arrangement = createArrangement()

    const result = updateArrangementMetadata(arrangement, { name: 'New name' })

    expect(result.name).toBe('New name')
  })

  it('updates the tempo, snapped to a whole number', () => {
    const arrangement = createArrangement()

    const result = updateArrangementMetadata(arrangement, { tempo: 128.4 })

    expect(result.tempo).toBe(128)
  })

  it('clamps a non-positive tempo up to the minimum', () => {
    const arrangement = createArrangement()

    const result = updateArrangementMetadata(arrangement, { tempo: 0 })

    expect(result.tempo).toBe(1)
  })

  it('leaves fields not present in the input untouched', () => {
    const arrangement = createArrangement({ name: 'Keep me', tempo: 90 })

    const result = updateArrangementMetadata(arrangement, {})

    expect(result.name).toBe('Keep me')
    expect(result.tempo).toBe(90)
  })

  it('does not mutate the input arrangement', () => {
    const arrangement = createArrangement({ name: 'Original' })

    updateArrangementMetadata(arrangement, { name: 'Changed' })

    expect(arrangement.name).toBe('Original')
  })

  it('does not touch tracks', () => {
    const arrangement = createArrangement()

    const result = updateArrangementMetadata(arrangement, { name: 'Renamed' })

    expect(result.tracks).toBe(arrangement.tracks)
  })
})

describe('addTrack', () => {
  it('appends a track with a default name and no clips', () => {
    const arrangement = createArrangement()

    const result = addTrack(arrangement)

    expect(result.tracks).toMatchObject([{ name: 'New track 1', muted: false, solo: false, clips: [] }])
  })

  it('assigns the new track a unique id', () => {
    const arrangement = addTrack(createArrangement())

    const result = addTrack(arrangement)

    expect(result.tracks[1].id).not.toBe(result.tracks[0].id)
  })

  it('auto-increments the default name for each new track', () => {
    const withOne = addTrack(createArrangement())

    const result = addTrack(withOne)

    expect(result.tracks.map((track) => track.name)).toEqual(['New track 1', 'New track 2'])
  })

  it('does not reuse a default name still in use after an earlier track is removed', () => {
    const withTwo = addTrack(addTrack(createArrangement()))
    const withFirstRemoved = removeTrack(withTwo, withTwo.tracks[0].id)

    const result = addTrack(withFirstRemoved)

    expect(result.tracks.map((track) => track.name)).toEqual(['New track 2', 'New track 3'])
  })

  it('applies overrides on top of the defaults', () => {
    const arrangement = createArrangement()

    const result = addTrack(arrangement, { name: 'Drums' })

    expect(result.tracks[0].name).toBe('Drums')
  })

  it('does not mutate the input arrangement', () => {
    const arrangement = createArrangement()

    addTrack(arrangement)

    expect(arrangement.tracks).toEqual([])
  })
})

describe('placeClip', () => {
  it('creates a new track and places the clip on it when trackId is "new-track"', () => {
    const arrangement = createArrangement()

    const result = placeClip(arrangement, { trackId: 'new-track', slipId: 'slip-a', startBar: 2, slipBars: 4 })

    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0].clips).toMatchObject([{ slipId: 'slip-a', startBar: 2, lengthBars: 4 }])
  })

  it('places the clip on an existing track by id', () => {
    const arrangement = addTrack(createArrangement(), { name: 'Drums' })
    const trackId = arrangement.tracks[0].id

    const result = placeClip(arrangement, { trackId, slipId: 'slip-a', startBar: 0, slipBars: 2 })

    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0].clips).toMatchObject([{ slipId: 'slip-a', startBar: 0, lengthBars: 2 }])
  })

  it('appends to a track that already has clips rather than replacing them', () => {
    const withFirst = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 2 })
    const trackId = withFirst.tracks[0].id

    const result = placeClip(withFirst, { trackId, slipId: 'slip-b', startBar: 4, slipBars: 2 })

    expect(result.tracks[0].clips).toHaveLength(2)
  })

  it('snaps a fractional startBar to the nearest whole bar', () => {
    const result = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 2.6, slipBars: 2 })

    expect(result.tracks[0].clips[0].startBar).toBe(3)
  })

  it('clamps a negative startBar up to bar 0', () => {
    const result = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: -3, slipBars: 2 })

    expect(result.tracks[0].clips[0].startBar).toBe(0)
  })

  it('assigns the clip a unique id', () => {
    const arrangement = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 2 })

    expect(arrangement.tracks[0].clips[0].id).toEqual(expect.any(String))
  })

  it('does not mutate the input arrangement', () => {
    const arrangement = addTrack(createArrangement())

    placeClip(arrangement, { trackId: arrangement.tracks[0].id, slipId: 'slip-a', startBar: 0, slipBars: 2 })

    expect(arrangement.tracks[0].clips).toEqual([])
  })

  it('leaves other tracks untouched', () => {
    const withTwo = addTrack(addTrack(createArrangement(), { name: 'A' }), { name: 'B' })
    const targetTrackId = withTwo.tracks[1].id

    const result = placeClip(withTwo, { trackId: targetTrackId, slipId: 'slip-a', startBar: 0, slipBars: 2 })

    expect(result.tracks[0].clips).toEqual([])
    expect(result.tracks[1].clips).toHaveLength(1)
  })
})

describe('moveClip', () => {
  it('repositions a clip within the same track', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 2 })
    const trackId = placed.tracks[0].id
    const clipId = placed.tracks[0].clips[0].id

    const result = moveClip(placed, { clipId, trackId, startBar: 4 })

    expect(result.tracks[0].clips).toMatchObject([{ id: clipId, startBar: 4 }])
  })

  it('moves a clip to a different track', () => {
    const withA = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 2 })
    const withB = addTrack(withA, { name: 'B' })
    const [trackA, trackB] = withB.tracks
    const clipId = trackA.clips[0].id

    const result = moveClip(withB, { clipId, trackId: trackB.id, startBar: 2 })

    expect(result.tracks[0].clips).toEqual([])
    expect(result.tracks[1].clips).toMatchObject([{ id: clipId, startBar: 2 }])
  })

  it('snaps a fractional startBar to the nearest whole bar', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 2 })
    const trackId = placed.tracks[0].id
    const clipId = placed.tracks[0].clips[0].id

    const result = moveClip(placed, { clipId, trackId, startBar: 3.6 })

    expect(result.tracks[0].clips[0].startBar).toBe(4)
  })

  it('clamps a negative startBar up to bar 0', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 4, slipBars: 2 })
    const trackId = placed.tracks[0].id
    const clipId = placed.tracks[0].clips[0].id

    const result = moveClip(placed, { clipId, trackId, startBar: -5 })

    expect(result.tracks[0].clips[0].startBar).toBe(0)
  })

  it('is a safe no-op when moving a clip that does not exist', () => {
    const arrangement = addTrack(createArrangement())

    const result = moveClip(arrangement, { clipId: 'missing', trackId: arrangement.tracks[0].id, startBar: 4 })

    expect(result).toEqual(arrangement)
  })

  it('leaves other clips on the source track untouched', () => {
    const withFirst = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 2 })
    const trackId = withFirst.tracks[0].id
    const withSecond = placeClip(withFirst, { trackId, slipId: 'slip-b', startBar: 4, slipBars: 2 })
    const movedClipId = withSecond.tracks[0].clips[0].id
    const otherClipId = withSecond.tracks[0].clips[1].id

    const result = moveClip(withSecond, { clipId: movedClipId, trackId, startBar: 8 })

    expect(result.tracks[0].clips).toHaveLength(2)
    expect(result.tracks[0].clips.find((clip) => clip.id === otherClipId)).toMatchObject({ startBar: 4 })
  })
})

describe('resizeClipLoop', () => {
  it('shrinks a clip length, truncating it', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    const result = resizeClipLoop(placed, { clipId, lengthBars: 2 })

    expect(result.tracks[0].clips[0].lengthBars).toBe(2)
  })

  it('grows a clip length past the slip length, looping it', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    const result = resizeClipLoop(placed, { clipId, lengthBars: 10 })

    expect(result.tracks[0].clips[0].lengthBars).toBe(10)
  })

  it('clamps a non-positive length up to 1 bar', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    const result = resizeClipLoop(placed, { clipId, lengthBars: 0 })

    expect(result.tracks[0].clips[0].lengthBars).toBe(1)
  })

  it('snaps a fractional length to the nearest whole bar', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    const result = resizeClipLoop(placed, { clipId, lengthBars: 5.6 })

    expect(result.tracks[0].clips[0].lengthBars).toBe(6)
  })

  it('leaves other clip fields untouched', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 2, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    const result = resizeClipLoop(placed, { clipId, lengthBars: 8 })

    expect(result.tracks[0].clips[0]).toMatchObject({ slipId: 'slip-a', startBar: 2 })
  })
})

describe('setClipSlip', () => {
  it('switches the clip to a different slip', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    const result = setClipSlip(placed, { clipId, slipId: 'slip-b' })

    expect(result.tracks[0].clips[0].slipId).toBe('slip-b')
  })

  it('leaves position and length untouched', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 2, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    const result = setClipSlip(placed, { clipId, slipId: 'slip-b' })

    expect(result.tracks[0].clips[0]).toMatchObject({ startBar: 2, lengthBars: 4 })
  })

  it('is a safe no-op when the clip does not exist', () => {
    const arrangement = addTrack(createArrangement())

    const result = setClipSlip(arrangement, { clipId: 'missing', slipId: 'slip-b' })

    expect(result).toEqual(arrangement)
  })
})

describe('removeClip', () => {
  it('removes the clip with the given id', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    const result = removeClip(placed, clipId)

    expect(result.tracks[0].clips).toEqual([])
  })

  it('leaves other clips and tracks untouched', () => {
    const withFirst = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const trackId = withFirst.tracks[0].id
    const withSecond = placeClip(withFirst, { trackId, slipId: 'slip-b', startBar: 4, slipBars: 4 })
    const removedId = withSecond.tracks[0].clips[0].id
    const keptId = withSecond.tracks[0].clips[1].id

    const result = removeClip(withSecond, removedId)

    expect(result.tracks[0].clips).toMatchObject([{ id: keptId }])
  })

  it('is a safe no-op when removing a clip that does not exist', () => {
    const arrangement = addTrack(createArrangement())

    const result = removeClip(arrangement, 'missing')

    expect(result).toEqual(arrangement)
  })
})

describe('removeTrack', () => {
  it('removes the track with the given id', () => {
    const arrangement = addTrack(createArrangement())
    const trackId = arrangement.tracks[0].id

    const result = removeTrack(arrangement, trackId)

    expect(result.tracks).toEqual([])
  })

  it('removes the track along with its clips', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const trackId = placed.tracks[0].id

    const result = removeTrack(placed, trackId)

    expect(result.tracks).toEqual([])
  })

  it('leaves other tracks and their clips untouched', () => {
    const withFirst = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const withSecond = placeClip(withFirst, { trackId: 'new-track', slipId: 'slip-b', startBar: 0, slipBars: 4 })
    const removedId = withSecond.tracks[0].id
    const keptId = withSecond.tracks[1].id
    const keptClipId = withSecond.tracks[1].clips[0].id

    const result = removeTrack(withSecond, removedId)

    expect(result.tracks).toMatchObject([{ id: keptId, clips: [{ id: keptClipId, slipId: 'slip-b' }] }])
  })

  it('is a safe no-op when removing a track that does not exist', () => {
    const arrangement = addTrack(createArrangement())

    const result = removeTrack(arrangement, 'missing')

    expect(result).toEqual(arrangement)
  })

  it('does not mutate the input arrangement', () => {
    const arrangement = addTrack(createArrangement())

    removeTrack(arrangement, arrangement.tracks[0].id)

    expect(arrangement.tracks).toHaveLength(1)
  })
})

describe('renameTrack', () => {
  it('renames the given track', () => {
    const arrangement = addTrack(createArrangement())
    const trackId = arrangement.tracks[0].id

    const result = renameTrack(arrangement, trackId, 'Drums')

    expect(result.tracks[0].name).toBe('Drums')
  })

  it('leaves other tracks untouched', () => {
    const arrangement = addTrack(addTrack(createArrangement(), { name: 'A' }), { name: 'B' })

    const result = renameTrack(arrangement, arrangement.tracks[0].id, 'Renamed')

    expect(result.tracks[1].name).toBe('B')
  })
})

describe('toggleTrackMute', () => {
  it('toggles muted on then off', () => {
    const arrangement = addTrack(createArrangement())
    const trackId = arrangement.tracks[0].id

    const muted = toggleTrackMute(arrangement, trackId)
    const unmuted = toggleTrackMute(muted, trackId)

    expect(muted.tracks[0].muted).toBe(true)
    expect(unmuted.tracks[0].muted).toBe(false)
  })

  it('leaves other track fields untouched', () => {
    const arrangement = addTrack(createArrangement(), { solo: true })
    const trackId = arrangement.tracks[0].id

    const result = toggleTrackMute(arrangement, trackId)

    expect(result.tracks[0].solo).toBe(true)
  })
})

describe('toggleTrackSolo', () => {
  it('toggles solo on then off', () => {
    const arrangement = addTrack(createArrangement())
    const trackId = arrangement.tracks[0].id

    const soloed = toggleTrackSolo(arrangement, trackId)
    const unsoloed = toggleTrackSolo(soloed, trackId)

    expect(soloed.tracks[0].solo).toBe(true)
    expect(unsoloed.tracks[0].solo).toBe(false)
  })
})

describe('computeLoopMarks', () => {
  function clip(overrides: Partial<Clip>): Clip {
    return { id: 'c1', slipId: 'slip-a', startBar: 0, lengthBars: 4, ...overrides }
  }

  it('returns no marks when the clip length does not exceed the slip length', () => {
    expect(computeLoopMarks(clip({ lengthBars: 4 }), 4)).toEqual([])
  })

  it('returns no marks when the clip is shorter than the slip length', () => {
    expect(computeLoopMarks(clip({ lengthBars: 2 }), 4)).toEqual([])
  })

  it('returns one mark per repeat boundary', () => {
    expect(computeLoopMarks(clip({ lengthBars: 10 }), 4)).toEqual([4, 8])
  })

  it('handles a slip length of 1 bar', () => {
    expect(computeLoopMarks(clip({ lengthBars: 4 }), 1)).toEqual([1, 2, 3])
  })

  it('returns no marks for a zero or negative slip length', () => {
    expect(computeLoopMarks(clip({ lengthBars: 10 }), 0)).toEqual([])
  })
})
