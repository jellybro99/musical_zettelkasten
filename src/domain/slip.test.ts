import { describe, expect, it } from 'vitest'
import {
  addTag,
  copySlip,
  createSlip,
  createVariation,
  DEFAULT_GRID,
  deleteNote,
  filterSlips,
  formatSlipMeta,
  moveNote,
  notesOutOfGridBounds,
  octaveCountToHighPitch,
  placeNote,
  removeTag,
  resizeNote,
  resizeSlipGrid,
  snapToGrid,
  totalSteps,
  transposeKey,
  updateSlipMetadata,
} from './slip'

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

describe('moveNote', () => {
  it('moves a note to the given pitch and start', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = moveNote(notes, DEFAULT_GRID, { id: 'a', pitch: 64, start: 4 })

    expect(result).toMatchObject([{ id: 'a', pitch: 64, start: 4, length: 1, velocity: 0.8 }])
  })

  it('snaps a fractional pitch and start to the grid', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = moveNote(notes, DEFAULT_GRID, { id: 'a', pitch: 64.4, start: 3.6 })

    expect(result[0]).toMatchObject({ pitch: 64, start: 4 })
  })

  it('clamps pitch and start within grid bounds', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = moveNote(notes, DEFAULT_GRID, {
      id: 'a',
      pitch: DEFAULT_GRID.highPitch + 10,
      start: totalSteps(DEFAULT_GRID) + 10,
    })

    expect(result[0].pitch).toBe(DEFAULT_GRID.highPitch)
    expect(result[0].start).toBe(totalSteps(DEFAULT_GRID) - 1)
  })

  it('does not mutate the input notes array', () => {
    const original = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = moveNote(original, DEFAULT_GRID, { id: 'a', pitch: 64, start: 4 })

    expect(original[0]).toMatchObject({ pitch: 60, start: 0 })
    expect(result[0]).toMatchObject({ pitch: 64, start: 4 })
  })

  it('leaves other notes untouched', () => {
    const notes = [
      { id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 },
      { id: 'b', pitch: 62, start: 2, length: 1, velocity: 0.8 },
    ]

    const result = moveNote(notes, DEFAULT_GRID, { id: 'a', pitch: 64, start: 4 })

    expect(result[1]).toMatchObject({ id: 'b', pitch: 62, start: 2 })
  })

  it('is a safe no-op when moving a note that does not exist', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = moveNote(notes, DEFAULT_GRID, { id: 'missing', pitch: 64, start: 4 })

    expect(result).toEqual(notes)
  })

  it('allows moving a note onto another note without crashing or corrupting state', () => {
    const notes = [
      { id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 },
      { id: 'b', pitch: 64, start: 4, length: 1, velocity: 0.8 },
    ]

    const result = moveNote(notes, DEFAULT_GRID, { id: 'a', pitch: 64, start: 4 })

    expect(result[0]).toMatchObject({ id: 'a', pitch: 64, start: 4 })
    expect(result[1]).toMatchObject({ id: 'b', pitch: 64, start: 4 })
  })
})

describe('resizeNote', () => {
  it('changes a note length', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = resizeNote(notes, DEFAULT_GRID, { id: 'a', length: 4 })

    expect(result[0].length).toBe(4)
  })

  it('snaps a fractional length to the grid', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = resizeNote(notes, DEFAULT_GRID, { id: 'a', length: 3.6 })

    expect(result[0].length).toBe(4)
  })

  it('clamps a zero or negative length to the minimum length', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 4, velocity: 0.8 }]

    const zero = resizeNote(notes, DEFAULT_GRID, { id: 'a', length: 0 })
    const negative = resizeNote(notes, DEFAULT_GRID, { id: 'a', length: -5 })

    expect(zero[0].length).toBe(1)
    expect(negative[0].length).toBe(1)
  })

  it('clamps a length that would run past the end of the grid', () => {
    const notes = [
      { id: 'a', pitch: 60, start: totalSteps(DEFAULT_GRID) - 2, length: 1, velocity: 0.8 },
    ]

    const result = resizeNote(notes, DEFAULT_GRID, { id: 'a', length: 10 })

    expect(result[0].length).toBe(2)
  })

  it('does not mutate the input notes array', () => {
    const original = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = resizeNote(original, DEFAULT_GRID, { id: 'a', length: 4 })

    expect(original[0].length).toBe(1)
    expect(result[0].length).toBe(4)
  })

  it('leaves other notes untouched', () => {
    const notes = [
      { id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 },
      { id: 'b', pitch: 62, start: 2, length: 1, velocity: 0.8 },
    ]

    const result = resizeNote(notes, DEFAULT_GRID, { id: 'a', length: 4 })

    expect(result[1]).toMatchObject({ id: 'b', pitch: 62, start: 2, length: 1 })
  })

  it('is a safe no-op when resizing a note that does not exist', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = resizeNote(notes, DEFAULT_GRID, { id: 'missing', length: 4 })

    expect(result).toEqual(notes)
  })

  it('allows resizing a note through another note without crashing or corrupting state', () => {
    const notes = [
      { id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 },
      { id: 'b', pitch: 60, start: 2, length: 1, velocity: 0.8 },
    ]

    const result = resizeNote(notes, DEFAULT_GRID, { id: 'a', length: 4 })

    expect(result[0]).toMatchObject({ id: 'a', length: 4 })
    expect(result[1]).toMatchObject({ id: 'b', pitch: 60, start: 2, length: 1 })
  })
})

describe('deleteNote', () => {
  it('removes the note with the given id', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = deleteNote(notes, 'a')

    expect(result).toHaveLength(0)
  })

  it('leaves other notes untouched', () => {
    const notes = [
      { id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 },
      { id: 'b', pitch: 62, start: 2, length: 1, velocity: 0.8 },
    ]

    const result = deleteNote(notes, 'a')

    expect(result).toEqual([notes[1]])
  })

  it('does not mutate the input notes array', () => {
    const original = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = deleteNote(original, 'a')

    expect(original).toHaveLength(1)
    expect(result).toHaveLength(0)
  })

  it('is a safe no-op when deleting a note that does not exist', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]

    const result = deleteNote(notes, 'missing')

    expect(result).toEqual(notes)
  })
})

describe('octaveCountToHighPitch', () => {
  it('maps an octave count of 1 to a single octave above the low anchor', () => {
    expect(octaveCountToHighPitch(60, 1)).toBe(71)
  })

  it('maps an octave count of 2 to two octaves above the low anchor', () => {
    expect(octaveCountToHighPitch(60, 2)).toBe(83)
  })

  it('maps an octave count of 3 to three octaves above the low anchor', () => {
    expect(octaveCountToHighPitch(60, 3)).toBe(95)
  })

  it('is anchored at whatever low pitch is passed in', () => {
    expect(octaveCountToHighPitch(48, 1)).toBe(59)
  })
})

describe('notesOutOfGridBounds', () => {
  it('excludes notes whose pitch and span both fall within the grid', () => {
    const notes = [{ id: 'a', pitch: 64, start: 4, length: 2, velocity: 0.8 }]

    const result = notesOutOfGridBounds(notes, DEFAULT_GRID)

    expect(result).toEqual([])
  })

  it('includes a note whose pitch is above the grid highPitch', () => {
    const notes = [{ id: 'a', pitch: DEFAULT_GRID.highPitch + 1, start: 0, length: 1, velocity: 0.8 }]

    const result = notesOutOfGridBounds(notes, DEFAULT_GRID)

    expect(result).toEqual(notes)
  })

  it('includes a note whose pitch is below the grid lowPitch', () => {
    const notes = [{ id: 'a', pitch: DEFAULT_GRID.lowPitch - 1, start: 0, length: 1, velocity: 0.8 }]

    const result = notesOutOfGridBounds(notes, DEFAULT_GRID)

    expect(result).toEqual(notes)
  })

  it('includes a note whose start plus length exceeds the grid total steps', () => {
    const notes = [
      { id: 'a', pitch: 60, start: totalSteps(DEFAULT_GRID) - 1, length: 2, velocity: 0.8 },
    ]

    const result = notesOutOfGridBounds(notes, DEFAULT_GRID)

    expect(result).toEqual(notes)
  })

  it('evaluates notes against the given candidate grid, not any stored grid', () => {
    const notes = [{ id: 'a', pitch: 60, start: 20, length: 1, velocity: 0.8 }]
    const shrunkGrid = { ...DEFAULT_GRID, bars: 1 }

    const result = notesOutOfGridBounds(notes, shrunkGrid)

    expect(result).toEqual(notes)
  })

  it('returns multiple out-of-bounds notes and skips in-bounds ones', () => {
    const notes = [
      { id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 },
      { id: 'b', pitch: DEFAULT_GRID.highPitch + 3, start: 0, length: 1, velocity: 0.8 },
      { id: 'c', pitch: 62, start: totalSteps(DEFAULT_GRID), length: 1, velocity: 0.8 },
    ]

    const result = notesOutOfGridBounds(notes, DEFAULT_GRID)

    expect(result).toEqual([notes[1], notes[2]])
  })
})

describe('resizeSlipGrid', () => {
  it('merges the grid patch into the slip grid', () => {
    const slip = createSlip({ grid: DEFAULT_GRID })

    const result = resizeSlipGrid(slip, { bars: 4 })

    expect(result.grid).toEqual({ ...DEFAULT_GRID, bars: 4 })
  })

  it('drops notes that fall outside the new grid', () => {
    const notes = [
      { id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 },
      { id: 'b', pitch: DEFAULT_GRID.highPitch + 5, start: 0, length: 1, velocity: 0.8 },
    ]
    const slip = createSlip({ notes, grid: DEFAULT_GRID })

    const result = resizeSlipGrid(slip, { highPitch: DEFAULT_GRID.highPitch })

    expect(result.notes).toEqual([notes[0]])
  })

  it('keeps notes that remain within the new grid', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]
    const slip = createSlip({ notes, grid: DEFAULT_GRID })

    const result = resizeSlipGrid(slip, { bars: 4 })

    expect(result.notes).toEqual(notes)
  })

  it('drops notes made a shrink invalid by a smaller bar count', () => {
    const notes = [{ id: 'a', pitch: 60, start: 20, length: 1, velocity: 0.8 }]
    const slip = createSlip({ notes, grid: DEFAULT_GRID })

    const result = resizeSlipGrid(slip, { bars: 1 })

    expect(result.notes).toEqual([])
  })

  it('does not mutate the input slip', () => {
    const notes = [{ id: 'a', pitch: 60, start: 0, length: 1, velocity: 0.8 }]
    const slip = createSlip({ notes, grid: DEFAULT_GRID })

    resizeSlipGrid(slip, { bars: 4 })

    expect(slip.grid).toEqual(DEFAULT_GRID)
    expect(slip.notes).toEqual(notes)
  })

  it('leaves other slip fields untouched', () => {
    const slip = createSlip({ title: 'Keep me', tempo: 90 })

    const result = resizeSlipGrid(slip, { bars: 4 })

    expect(result.title).toBe('Keep me')
    expect(result.tempo).toBe(90)
  })
})

describe('createSlip', () => {
  it('creates a slip with default metadata and an empty note list', () => {
    const slip = createSlip()

    expect(slip).toMatchObject({
      notes: [],
      grid: DEFAULT_GRID,
      title: 'Untitled slip',
      tempo: 120,
      key: '',
      kind: 'Phrase',
      tags: [],
      copiedFromId: null,
      instrument: 'triangle',
    })
  })

  it('applies overrides on top of the defaults', () => {
    const slip = createSlip({ title: 'Rhodes Chord Stab', kind: 'Loop' })

    expect(slip.title).toBe('Rhodes Chord Stab')
    expect(slip.kind).toBe('Loop')
    expect(slip.tempo).toBe(120)
  })

  it('assigns an id', () => {
    const slip = createSlip()

    expect(slip.id).toEqual(expect.any(String))
  })

  it('assigns each slip a unique id', () => {
    const first = createSlip()
    const second = createSlip()

    expect(first.id).not.toBe(second.id)
  })

  it('sets createdAt', () => {
    const slip = createSlip()

    expect(slip.createdAt).toEqual(expect.any(Number))
  })
})

describe('copySlip', () => {
  it('copies notes, grid, tempo, key, kind, and tags verbatim', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: 64, start: 4 })
    const original = createSlip({
      notes,
      grid: { ...DEFAULT_GRID, bars: 4 },
      tempo: 96,
      key: 'E min',
      kind: 'Loop',
      tags: ['keys', 'warm'],
    })

    const copy = copySlip(original)

    expect(copy.notes).toEqual(original.notes)
    expect(copy.grid).toEqual(original.grid)
    expect(copy.tempo).toBe(original.tempo)
    expect(copy.key).toBe(original.key)
    expect(copy.kind).toBe(original.kind)
    expect(copy.tags).toEqual(original.tags)
  })

  it('prefixes the title with "Copy of "', () => {
    const original = createSlip({ title: 'Rhodes Chord Stab' })

    const copy = copySlip(original)

    expect(copy.title).toBe('Copy of Rhodes Chord Stab')
  })

  it('assigns a fresh id, distinct from the original', () => {
    const original = createSlip()

    const copy = copySlip(original)

    expect(copy.id).toEqual(expect.any(String))
    expect(copy.id).not.toBe(original.id)
  })

  it('assigns a fresh createdAt', () => {
    const original = createSlip({ createdAt: 1000 })

    const copy = copySlip(original)

    expect(copy.createdAt).toEqual(expect.any(Number))
  })

  it('does not mutate the original slip', () => {
    const original = createSlip({ title: 'Original' })

    copySlip(original)

    expect(original.title).toBe('Original')
  })

  it('sets copiedFromId to the original slip\'s id', () => {
    const original = createSlip({ id: 'original' })

    const copy = copySlip(original)

    expect(copy.copiedFromId).toBe('original')
  })

  it('does not add a reciprocal pointer to the original', () => {
    const original = createSlip({ id: 'original' })

    copySlip(original)

    expect(original.copiedFromId).toBeNull()
  })
})

describe('updateSlipMetadata', () => {
  it('updates the title', () => {
    const slip = createSlip()

    const result = updateSlipMetadata(slip, { title: 'New name' })

    expect(result.title).toBe('New name')
  })

  it('updates the tempo, snapped to a whole number', () => {
    const slip = createSlip()

    const result = updateSlipMetadata(slip, { tempo: 128.4 })

    expect(result.tempo).toBe(128)
  })

  it('clamps a non-positive tempo up to the minimum', () => {
    const slip = createSlip()

    const result = updateSlipMetadata(slip, { tempo: 0 })

    expect(result.tempo).toBe(1)
  })

  it('updates the key', () => {
    const slip = createSlip()

    const result = updateSlipMetadata(slip, { key: 'E min' })

    expect(result.key).toBe('E min')
  })

  it('updates the kind', () => {
    const slip = createSlip()

    const result = updateSlipMetadata(slip, { kind: 'Texture' })

    expect(result.kind).toBe('Texture')
  })

  it('updates the instrument', () => {
    const slip = createSlip()

    const result = updateSlipMetadata(slip, { instrument: 'square' })

    expect(result.instrument).toBe('square')
  })

  it('leaves fields not present in the input untouched', () => {
    const slip = createSlip({ title: 'Keep me', tempo: 90 })

    const result = updateSlipMetadata(slip, { key: 'C' })

    expect(result.title).toBe('Keep me')
    expect(result.tempo).toBe(90)
  })

  it('does not mutate the input slip', () => {
    const slip = createSlip({ title: 'Original' })

    updateSlipMetadata(slip, { title: 'Changed' })

    expect(slip.title).toBe('Original')
  })

  it('does not touch the notes or grid', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0 })
    const slip = createSlip({ notes })

    const result = updateSlipMetadata(slip, { title: 'Renamed' })

    expect(result.notes).toBe(notes)
    expect(result.grid).toBe(DEFAULT_GRID)
  })
})

describe('addTag', () => {
  it('adds a tag to an untagged slip', () => {
    const slip = createSlip()

    const result = addTag(slip, 'keys')

    expect(result.tags).toEqual(['keys'])
  })

  it('appends to existing tags rather than replacing them', () => {
    const slip = createSlip({ tags: ['keys'] })

    const result = addTag(slip, 'rhodes')

    expect(result.tags).toEqual(['keys', 'rhodes'])
  })

  it('trims whitespace from the tag', () => {
    const slip = createSlip()

    const result = addTag(slip, '  chord  ')

    expect(result.tags).toEqual(['chord'])
  })

  it('does not add a duplicate tag', () => {
    const slip = createSlip({ tags: ['keys'] })

    const result = addTag(slip, 'keys')

    expect(result.tags).toEqual(['keys'])
  })

  it('is a safe no-op for a blank tag', () => {
    const slip = createSlip({ tags: ['keys'] })

    const result = addTag(slip, '   ')

    expect(result.tags).toEqual(['keys'])
  })

  it('does not mutate the input slip', () => {
    const slip = createSlip({ tags: ['keys'] })

    addTag(slip, 'rhodes')

    expect(slip.tags).toEqual(['keys'])
  })
})

describe('removeTag', () => {
  it('removes the given tag', () => {
    const slip = createSlip({ tags: ['keys', 'rhodes'] })

    const result = removeTag(slip, 'keys')

    expect(result.tags).toEqual(['rhodes'])
  })

  it('is a safe no-op when the tag does not exist', () => {
    const slip = createSlip({ tags: ['keys'] })

    const result = removeTag(slip, 'missing')

    expect(result.tags).toEqual(['keys'])
  })

  it('does not mutate the input slip', () => {
    const slip = createSlip({ tags: ['keys', 'rhodes'] })

    removeTag(slip, 'keys')

    expect(slip.tags).toEqual(['keys', 'rhodes'])
  })
})

describe('filterSlips', () => {
  const slips = [
    createSlip({ title: 'Rhodes Chord Stab', kind: 'Loop', tags: ['keys', 'warm'] }),
    createSlip({ title: 'Kick Hit', kind: 'One-shot', tags: ['drums'] }),
    createSlip({ title: 'Vocal Chop', kind: 'Phrase', tags: ['vocal', 'warm'] }),
  ]

  it('matches search against the title', () => {
    const result = filterSlips(slips, { search: 'rhodes', tags: [], kind: 'all' })

    expect(result).toEqual([slips[0]])
  })

  it('matches search against a tag, case-insensitively', () => {
    const result = filterSlips(slips, { search: 'DRUMS', tags: [], kind: 'all' })

    expect(result).toEqual([slips[1]])
  })

  it('returns every slip for an empty search', () => {
    const result = filterSlips(slips, { search: '', tags: [], kind: 'all' })

    expect(result).toEqual(slips)
  })

  it('excludes a slip that only matches some of the selected tags', () => {
    const result = filterSlips(slips, { search: '', tags: ['warm', 'vocal'], kind: 'all' })

    expect(result).toEqual([slips[2]])
  })

  it('narrows to a single kind', () => {
    const result = filterSlips(slips, { search: '', tags: [], kind: 'One-shot' })

    expect(result).toEqual([slips[1]])
  })

  it('returns every slip for kind "all"', () => {
    const result = filterSlips(slips, { search: '', tags: [], kind: 'all' })

    expect(result).toEqual(slips)
  })

  it('combines search, tags, and kind together', () => {
    const result = filterSlips(slips, { search: 'chop', tags: ['warm'], kind: 'Phrase' })

    expect(result).toEqual([slips[2]])
  })

  it('excludes a slip whose tempo is below minTempo', () => {
    const tempoSlips = [createSlip({ tempo: 90 }), createSlip({ tempo: 120 })]

    const result = filterSlips(tempoSlips, { search: '', tags: [], kind: 'all', minTempo: 100 })

    expect(result).toEqual([tempoSlips[1]])
  })

  it('excludes a slip whose tempo is above maxTempo', () => {
    const tempoSlips = [createSlip({ tempo: 90 }), createSlip({ tempo: 120 })]

    const result = filterSlips(tempoSlips, { search: '', tags: [], kind: 'all', maxTempo: 100 })

    expect(result).toEqual([tempoSlips[0]])
  })

  it('includes a slip whose tempo exactly matches a min/max bound', () => {
    const tempoSlips = [createSlip({ tempo: 100 })]

    const result = filterSlips(tempoSlips, { search: '', tags: [], kind: 'all', minTempo: 100, maxTempo: 100 })

    expect(result).toEqual(tempoSlips)
  })

  it('treats unset minTempo/maxTempo as no-ops', () => {
    const result = filterSlips(slips, { search: '', tags: [], kind: 'all' })

    expect(result).toEqual(slips)
  })
})

describe('transposeKey', () => {
  it('transposes a sharp-free major key up', () => {
    expect(transposeKey('E min', 3)).toBe('G min')
  })

  it('transposes down, wrapping around the octave', () => {
    expect(transposeKey('C maj', -1)).toBe('B maj')
  })

  it('wraps forward past B back to C', () => {
    expect(transposeKey('B min', 1)).toBe('C min')
  })

  it('normalizes a flat root to its sharp equivalent', () => {
    expect(transposeKey('Bb maj', 0)).toBe('A# maj')
  })

  it('leaves a zero-semitone transpose\'s root unchanged in pitch class', () => {
    expect(transposeKey('E min', 0)).toBe('E min')
  })

  it('leaves an unparseable key untouched', () => {
    expect(transposeKey('', 3)).toBe('')
    expect(transposeKey('unknown', 3)).toBe('unknown')
  })
})

describe('createVariation', () => {
  it('transposes every note by the given semitone count', () => {
    const slip = createSlip({ notes: [{ id: 'a', pitch: 64, start: 0, length: 1, velocity: 0.8 }] })

    const variation = createVariation(slip, { transposeSemitones: 3 }, [])

    expect(variation.notes[0].pitch).toBe(67)
  })

  it('clamps transposed pitch to the slip\'s own grid bounds', () => {
    const slip = createSlip({
      grid: DEFAULT_GRID,
      notes: [{ id: 'a', pitch: DEFAULT_GRID.highPitch, start: 0, length: 1, velocity: 0.8 }],
    })

    const variation = createVariation(slip, { transposeSemitones: 5 }, [])

    expect(variation.notes[0].pitch).toBe(DEFAULT_GRID.highPitch)
  })

  it('transposes the key metadata alongside the notes', () => {
    const slip = createSlip({ key: 'E min' })

    const variation = createVariation(slip, { transposeSemitones: 3 }, [])

    expect(variation.key).toBe('G min')
  })

  it('sets copiedFromId to the source id', () => {
    const slip = createSlip({ id: 'source' })

    const variation = createVariation(slip, { transposeSemitones: 0 }, [])

    expect(variation.copiedFromId).toBe('source')
  })

  it('numbers the title "var. 1" for the first variation of a source', () => {
    const slip = createSlip({ id: 'source', title: 'Rhodes Chord Stab' })

    const variation = createVariation(slip, { transposeSemitones: 0 }, [])

    expect(variation.title).toBe('Rhodes Chord Stab var. 1')
  })

  it('increments the variation number across repeated variations of the same source', () => {
    const slip = createSlip({ id: 'source', title: 'Rhodes Chord Stab' })
    const existingVariation = createSlip({ title: 'Rhodes Chord Stab var. 1', copiedFromId: 'source' })

    const variation = createVariation(slip, { transposeSemitones: 0 }, [slip, existingVariation])

    expect(variation.title).toBe('Rhodes Chord Stab var. 2')
  })

  it('assigns a fresh id and createdAt, distinct from the source', () => {
    const slip = createSlip({ id: 'source', createdAt: 1000 })

    const variation = createVariation(slip, { transposeSemitones: 0 }, [])

    expect(variation.id).not.toBe('source')
    expect(variation.createdAt).toEqual(expect.any(Number))
  })

  it('does not mutate the source slip', () => {
    const slip = createSlip({ notes: [{ id: 'a', pitch: 64, start: 0, length: 1, velocity: 0.8 }], key: 'E min' })

    createVariation(slip, { transposeSemitones: 3 }, [])

    expect(slip.notes[0].pitch).toBe(64)
    expect(slip.key).toBe('E min')
    expect(slip.copiedFromId).toBeNull()
  })
})

describe('formatSlipMeta', () => {
  it('joins tempo, key, and bar count into one metadata line', () => {
    const slip = createSlip({ tempo: 96, key: 'E min', grid: { ...DEFAULT_GRID, bars: 4 } })

    expect(formatSlipMeta(slip)).toBe('96 BPM · E min · 4 bars')
  })
})
