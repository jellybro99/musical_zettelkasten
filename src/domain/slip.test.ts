import { describe, expect, it } from 'vitest'
import { DEFAULT_GRID, placeNote, snapToGrid, totalSteps } from './slip'

describe('snapToGrid', () => {
  it('rounds a value down to the nearest step', () => {
    expect(snapToGrid(3.2)).toBe(3)
  })

  it('rounds a value up to the nearest step', () => {
    expect(snapToGrid(3.6)).toBe(4)
  })

  it('leaves an already-on-grid value unchanged', () => {
    expect(snapToGrid(5)).toBe(5)
  })
})

describe('placeNote', () => {
  it('adds a note at the given pitch and start', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: 64, start: 4 })

    expect(notes).toMatchObject([{ pitch: 64, start: 4, length: 1, velocity: 0.8 }])
    expect(notes[0].id).toEqual(expect.any(String))
  })

  it('assigns each note a unique id', () => {
    const first = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0 })
    const both = placeNote(first, DEFAULT_GRID, { pitch: 67, start: 8 })

    expect(both[0].id).not.toBe(both[1].id)
  })

  it('does not add a duplicate note when the target cell is already occupied', () => {
    const first = placeNote([], DEFAULT_GRID, { pitch: 64, start: 4 })
    const second = placeNote(first, DEFAULT_GRID, { pitch: 64, start: 4 })

    expect(second).toHaveLength(1)
  })

  it('does not mutate the input notes array', () => {
    const original = [{ id: 'existing', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = placeNote(original, DEFAULT_GRID, { pitch: 62, start: 2 })

    expect(original).toHaveLength(1)
    expect(result).toHaveLength(2)
  })

  it('appends to existing notes rather than replacing them', () => {
    const first = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0 })
    const both = placeNote(first, DEFAULT_GRID, { pitch: 67, start: 8 })

    expect(both).toHaveLength(2)
  })

  it('snaps a fractional pitch and start to the grid', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: 64.4, start: 3.6 })

    expect(notes[0]).toMatchObject({ pitch: 64, start: 4 })
  })

  it('clamps a pitch above the visible range down to the highest visible pitch', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: DEFAULT_GRID.highPitch + 5, start: 0 })

    expect(notes[0].pitch).toBe(DEFAULT_GRID.highPitch)
  })

  it('clamps a pitch below the visible range up to the lowest visible pitch', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: DEFAULT_GRID.lowPitch - 5, start: 0 })

    expect(notes[0].pitch).toBe(DEFAULT_GRID.lowPitch)
  })

  it('clamps a negative start up to the beginning of the grid', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: 60, start: -10 })

    expect(notes[0].start).toBe(0)
  })

  it('clamps a start past the end of the grid so the note still fits', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: 60, start: totalSteps(DEFAULT_GRID) + 10 })

    expect(notes[0].start).toBe(totalSteps(DEFAULT_GRID) - notes[0].length)
  })

  it('clamps velocity into the 0-1 range', () => {
    const tooLoud = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0, velocity: 2 })
    const tooQuiet = placeNote([], DEFAULT_GRID, { pitch: 60, start: 1, velocity: -1 })

    expect(tooLoud[0].velocity).toBe(1)
    expect(tooQuiet[0].velocity).toBe(0)
  })

  it('accepts a custom length', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0, length: 4 })

    expect(notes[0].length).toBe(4)
  })
})
