import { describe, expect, it } from 'vitest'
import {
  addTrack,
  computeLoopMarks,
  createArrangement,
  findArrangementsUsingSlip,
  moveClip,
  placeClip,
  removeClip,
  removeTrack,
  renameTrack,
  resizeClipLoop,
  setClipSlip,
  setClipTranspose,
  setTrackVolume,
  toggleTrackMute,
  toggleTrackSolo,
  trackIdAtY,
  updateArrangementMetadata,
  type Clip,
  type Track,
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

    expect(result.tracks).toMatchObject([{ name: 'Track 1', muted: false, solo: false, volume: 1, clips: [] }])
  })

  it('assigns the new track a unique id', () => {
    const arrangement = addTrack(createArrangement())

    const result = addTrack(arrangement)

    expect(result.tracks[1].id).not.toBe(result.tracks[0].id)
  })

  it('auto-increments the default name for each new track', () => {
    const withOne = addTrack(createArrangement())

    const result = addTrack(withOne)

    expect(result.tracks.map((track) => track.name)).toEqual(['Track 1', 'Track 2'])
  })

  it('does not reuse a default name still in use after an earlier track is removed', () => {
    const withTwo = addTrack(addTrack(createArrangement()))
    const withFirstRemoved = removeTrack(withTwo, withTwo.tracks[0].id)

    const result = addTrack(withFirstRemoved)

    expect(result.tracks.map((track) => track.name)).toEqual(['Track 2', 'Track 3'])
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

  it('resets a previously-set transpose offset back to zero', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id
    const transposed = setClipTranspose(placed, { clipId, semitones: 5 })

    const result = setClipSlip(transposed, { clipId, slipId: 'slip-b' })

    expect(result.tracks[0].clips[0].transposeSemitones).toBe(0)
  })
})

describe('setClipTranspose', () => {
  it('sets an offset on a clip with no prior offset', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    const result = setClipTranspose(placed, { clipId, semitones: 3 })

    expect(result.tracks[0].clips[0].transposeSemitones).toBe(3)
  })

  it('overwrites a previously-set offset', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id
    const first = setClipTranspose(placed, { clipId, semitones: 3 })

    const result = setClipTranspose(first, { clipId, semitones: -2 })

    expect(result.tracks[0].clips[0].transposeSemitones).toBe(-2)
  })

  it('is a safe no-op when the clip does not exist', () => {
    const arrangement = addTrack(createArrangement())

    const result = setClipTranspose(arrangement, { clipId: 'missing', semitones: 3 })

    expect(result).toEqual(arrangement)
  })

  it('leaves other clips and tracks untouched', () => {
    const withFirst = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const trackId = withFirst.tracks[0].id
    const withSecond = placeClip(withFirst, { trackId, slipId: 'slip-b', startBar: 4, slipBars: 4 })
    const untouchedClipId = withSecond.tracks[0].clips[0].id
    const targetClipId = withSecond.tracks[0].clips[1].id

    const result = setClipTranspose(withSecond, { clipId: targetClipId, semitones: 3 })

    expect(result.tracks[0].clips.find((clip) => clip.id === untouchedClipId)?.transposeSemitones).toBeUndefined()
  })

  it('does not mutate the input arrangement', () => {
    const placed = placeClip(createArrangement(), { trackId: 'new-track', slipId: 'slip-a', startBar: 0, slipBars: 4 })
    const clipId = placed.tracks[0].clips[0].id

    setClipTranspose(placed, { clipId, semitones: 3 })

    expect(placed.tracks[0].clips[0].transposeSemitones).toBeUndefined()
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

describe('setTrackVolume', () => {
  it('sets the target track volume', () => {
    const arrangement = addTrack(createArrangement())
    const trackId = arrangement.tracks[0].id

    const result = setTrackVolume(arrangement, trackId, 0.5)

    expect(result.tracks[0].volume).toBe(0.5)
  })

  it('clamps volume above 1 down to 1', () => {
    const arrangement = addTrack(createArrangement())
    const trackId = arrangement.tracks[0].id

    const result = setTrackVolume(arrangement, trackId, 1.5)

    expect(result.tracks[0].volume).toBe(1)
  })

  it('clamps volume below 0 up to 0', () => {
    const arrangement = addTrack(createArrangement())
    const trackId = arrangement.tracks[0].id

    const result = setTrackVolume(arrangement, trackId, -0.5)

    expect(result.tracks[0].volume).toBe(0)
  })

  it('leaves other tracks untouched', () => {
    const arrangement = addTrack(addTrack(createArrangement(), { volume: 0.8 }), { volume: 0.8 })

    const result = setTrackVolume(arrangement, arrangement.tracks[0].id, 0.2)

    expect(result.tracks[1].volume).toBe(0.8)
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

describe('trackIdAtY', () => {
  function track(id: string): Track {
    return { id, name: id, muted: false, solo: false, volume: 1, clips: [] }
  }

  const tracks = [track('t1'), track('t2')]
  const rulerHeight = 24
  const rowHeight = 60

  it('returns null above the ruler', () => {
    expect(trackIdAtY(tracks, 0, rulerHeight, rowHeight)).toBeNull()
  })

  it('returns the first track for a y inside its row', () => {
    expect(trackIdAtY(tracks, 30, rulerHeight, rowHeight)).toBe('t1')
  })

  it('returns the second track for a y inside its row', () => {
    expect(trackIdAtY(tracks, 90, rulerHeight, rowHeight)).toBe('t2')
  })

  it('returns NEW_TRACK for a y inside the synthetic add-track row', () => {
    expect(trackIdAtY(tracks, 150, rulerHeight, rowHeight)).toBe('new-track')
  })

  it('returns null below the add-track row', () => {
    expect(trackIdAtY(tracks, 210, rulerHeight, rowHeight)).toBeNull()
  })

  it('returns NEW_TRACK for the whole row when there are no real tracks', () => {
    expect(trackIdAtY([], 30, rulerHeight, rowHeight)).toBe('new-track')
  })
})

describe('findArrangementsUsingSlip', () => {
  it('returns an arrangement that places the slip on a track', () => {
    const arrangement = placeClip(createArrangement({ name: 'A' }), {
      trackId: 'new-track',
      slipId: 'slip-a',
      startBar: 0,
      slipBars: 4,
    })

    const result = findArrangementsUsingSlip([arrangement], 'slip-a')

    expect(result).toMatchObject([{ name: 'A' }])
  })

  it('returns every arrangement that places the slip', () => {
    const first = placeClip(createArrangement({ name: 'A' }), {
      trackId: 'new-track',
      slipId: 'slip-a',
      startBar: 0,
      slipBars: 4,
    })
    const second = placeClip(createArrangement({ name: 'B' }), {
      trackId: 'new-track',
      slipId: 'slip-a',
      startBar: 0,
      slipBars: 4,
    })

    const result = findArrangementsUsingSlip([first, second], 'slip-a')

    expect(result).toMatchObject([{ name: 'A' }, { name: 'B' }])
  })

  it('dedupes an arrangement that places the slip on multiple clips', () => {
    const withFirst = placeClip(createArrangement({ name: 'A' }), {
      trackId: 'new-track',
      slipId: 'slip-a',
      startBar: 0,
      slipBars: 4,
    })
    const trackId = withFirst.tracks[0].id
    const withSecond = placeClip(withFirst, { trackId, slipId: 'slip-a', startBar: 4, slipBars: 4 })

    const result = findArrangementsUsingSlip([withSecond], 'slip-a')

    expect(result).toMatchObject([{ name: 'A' }])
  })

  it('excludes an arrangement that does not use the slip', () => {
    const arrangement = placeClip(createArrangement({ name: 'A' }), {
      trackId: 'new-track',
      slipId: 'slip-b',
      startBar: 0,
      slipBars: 4,
    })

    const result = findArrangementsUsingSlip([arrangement], 'slip-a')

    expect(result).toEqual([])
  })

  it('returns an empty result for an empty arrangement list', () => {
    expect(findArrangementsUsingSlip([], 'slip-a')).toEqual([])
  })
})
