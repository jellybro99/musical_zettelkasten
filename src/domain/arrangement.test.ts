import { describe, expect, it } from 'vitest'
import { addTrack, createArrangement, placeClip, updateArrangementMetadata } from './arrangement'

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

    expect(result.tracks).toMatchObject([{ name: 'New track', muted: false, solo: false, clips: [] }])
  })

  it('assigns the new track a unique id', () => {
    const arrangement = addTrack(createArrangement())

    const result = addTrack(arrangement)

    expect(result.tracks[1].id).not.toBe(result.tracks[0].id)
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
