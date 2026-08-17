import { describe, expect, it } from 'vitest'
import { createArrangement, updateArrangementMetadata } from './arrangement'

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
