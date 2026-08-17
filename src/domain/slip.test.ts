import { describe, expect, it } from 'vitest'
import {
  addReference,
  addTag,
  createSlip,
  DEFAULT_GRID,
  deleteNote,
  filterSlips,
  formatSlipMeta,
  moveNote,
  placeNote,
  referenceCandidates,
  removeReference,
  removeTag,
  resizeNote,
  resolveSlipNotes,
  snapToGrid,
  totalSteps,
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
      referencedSlipIds: [],
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
})

describe('formatSlipMeta', () => {
  it('joins tempo, key, and bar count into one metadata line', () => {
    const slip = createSlip({ tempo: 96, key: 'E min', grid: { ...DEFAULT_GRID, bars: 4 } })

    expect(formatSlipMeta(slip)).toBe('96 BPM · E min · 4 bars')
  })
})

describe('addReference', () => {
  it('adds a reference to a slip with none', () => {
    const a = createSlip({ id: 'a' })
    const b = createSlip({ id: 'b' })

    const result = addReference(a, [a, b], 'b')

    expect(result.referencedSlipIds).toEqual(['b'])
  })

  it('appends to existing references rather than replacing them', () => {
    const a = createSlip({ id: 'a', referencedSlipIds: ['b'] })
    const b = createSlip({ id: 'b' })
    const c = createSlip({ id: 'c' })

    const result = addReference(a, [a, b, c], 'c')

    expect(result.referencedSlipIds).toEqual(['b', 'c'])
  })

  it('is a safe no-op for a self-reference', () => {
    const a = createSlip({ id: 'a' })

    const result = addReference(a, [a], 'a')

    expect(result.referencedSlipIds).toEqual([])
  })

  it('is a safe no-op when the id is already referenced', () => {
    const a = createSlip({ id: 'a', referencedSlipIds: ['b'] })
    const b = createSlip({ id: 'b' })

    const result = addReference(a, [a, b], 'b')

    expect(result.referencedSlipIds).toEqual(['b'])
  })

  it('is a safe no-op when the addition would create a direct cycle', () => {
    const a = createSlip({ id: 'a' })
    const b = createSlip({ id: 'b', referencedSlipIds: ['a'] })

    const result = addReference(a, [a, b], 'b')

    expect(result.referencedSlipIds).toEqual([])
  })

  it('is a safe no-op when the addition would create a multi-hop cycle', () => {
    const a = createSlip({ id: 'a' })
    const b = createSlip({ id: 'b', referencedSlipIds: ['c'] })
    const c = createSlip({ id: 'c', referencedSlipIds: ['a'] })

    const result = addReference(a, [a, b, c], 'b')

    expect(result.referencedSlipIds).toEqual([])
  })

  it('does not mutate the input slip', () => {
    const a = createSlip({ id: 'a' })
    const b = createSlip({ id: 'b' })

    addReference(a, [a, b], 'b')

    expect(a.referencedSlipIds).toEqual([])
  })
})

describe('removeReference', () => {
  it('removes a present reference', () => {
    const a = createSlip({ id: 'a', referencedSlipIds: ['b', 'c'] })

    const result = removeReference(a, 'b')

    expect(result.referencedSlipIds).toEqual(['c'])
  })

  it('is a safe no-op when the id is not referenced', () => {
    const a = createSlip({ id: 'a', referencedSlipIds: ['b'] })

    const result = removeReference(a, 'missing')

    expect(result.referencedSlipIds).toEqual(['b'])
  })

  it('does not mutate the input slip', () => {
    const a = createSlip({ id: 'a', referencedSlipIds: ['b'] })

    removeReference(a, 'b')

    expect(a.referencedSlipIds).toEqual(['b'])
  })
})

describe('referenceCandidates', () => {
  it('excludes the slip itself', () => {
    const a = createSlip({ id: 'a' })
    const b = createSlip({ id: 'b' })

    const result = referenceCandidates(a, [a, b])

    expect(result).toEqual([b])
  })

  it('excludes already-referenced slips', () => {
    const a = createSlip({ id: 'a', referencedSlipIds: ['b'] })
    const b = createSlip({ id: 'b' })
    const c = createSlip({ id: 'c' })

    const result = referenceCandidates(a, [a, b, c])

    expect(result).toEqual([c])
  })

  it('excludes a slip that would close a direct cycle', () => {
    const a = createSlip({ id: 'a' })
    const b = createSlip({ id: 'b', referencedSlipIds: ['a'] })

    const result = referenceCandidates(a, [a, b])

    expect(result).toEqual([])
  })

  it('excludes a slip that would close a multi-hop cycle', () => {
    const a = createSlip({ id: 'a' })
    const b = createSlip({ id: 'b', referencedSlipIds: ['c'] })
    const c = createSlip({ id: 'c', referencedSlipIds: ['a'] })
    const d = createSlip({ id: 'd' })

    const result = referenceCandidates(a, [a, b, c, d])

    expect(result).toEqual([d])
  })

  it('includes every other slip when there is nothing to exclude', () => {
    const a = createSlip({ id: 'a' })
    const b = createSlip({ id: 'b' })
    const c = createSlip({ id: 'c' })

    const result = referenceCandidates(a, [a, b, c])

    expect(result).toEqual([b, c])
  })
})

describe('resolveSlipNotes', () => {
  it('returns a slip\'s own notes unchanged when it has no references', () => {
    const notes = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0 })
    const a = createSlip({ id: 'a', notes })

    const result = resolveSlipNotes(a, [a])

    expect(result).toEqual(notes)
  })

  it('unions in a single referenced slip\'s notes', () => {
    const aNotes = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0 })
    const bNotes = placeNote([], DEFAULT_GRID, { pitch: 64, start: 4 })
    const a = createSlip({ id: 'a', notes: aNotes, referencedSlipIds: ['b'] })
    const b = createSlip({ id: 'b', notes: bNotes })

    const result = resolveSlipNotes(a, [a, b])

    expect(result).toEqual([...aNotes, ...bNotes])
  })

  it('resolves multiple levels deep', () => {
    const aNotes = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0 })
    const bNotes = placeNote([], DEFAULT_GRID, { pitch: 62, start: 2 })
    const cNotes = placeNote([], DEFAULT_GRID, { pitch: 64, start: 4 })
    const a = createSlip({ id: 'a', notes: aNotes, referencedSlipIds: ['b'] })
    const b = createSlip({ id: 'b', notes: bNotes, referencedSlipIds: ['c'] })
    const c = createSlip({ id: 'c', notes: cNotes })

    const result = resolveSlipNotes(a, [a, b, c])

    expect(result).toEqual([...aNotes, ...bNotes, ...cNotes])
  })

  it('skips a referenced id that is missing from allSlips', () => {
    const aNotes = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0 })
    const a = createSlip({ id: 'a', notes: aNotes, referencedSlipIds: ['deleted'] })

    const result = resolveSlipNotes(a, [a])

    expect(result).toEqual(aNotes)
  })

  it('does not infinite-loop or duplicate-resolve on a corrupt cyclical reference graph', () => {
    const aNotes = placeNote([], DEFAULT_GRID, { pitch: 60, start: 0 })
    const bNotes = placeNote([], DEFAULT_GRID, { pitch: 62, start: 2 })
    const a = createSlip({ id: 'a', notes: aNotes, referencedSlipIds: ['b'] })
    const b = createSlip({ id: 'b', notes: bNotes, referencedSlipIds: ['a'] })

    const result = resolveSlipNotes(a, [a, b])

    expect(result).toEqual([...aNotes, ...bNotes])
  })

  it('drops a referenced note that starts at or past the resolving slip\'s grid length', () => {
    const grid = { ...DEFAULT_GRID, bars: 1, stepsPerBar: 4 }
    const limit = totalSteps(grid)
    const a = createSlip({ id: 'a', grid, referencedSlipIds: ['b'] })
    const bNotes = [
      { id: 'in-range', pitch: 60, start: limit - 1, length: 1, velocity: 0.8 },
      { id: 'out-of-range', pitch: 60, start: limit, length: 1, velocity: 0.8 },
    ]
    const b = createSlip({ id: 'b', notes: bNotes })

    const result = resolveSlipNotes(a, [a, b])

    expect(result).toEqual([bNotes[0]])
  })

  it('shortens a referenced note that starts inside the grid but runs past its end', () => {
    const grid = { ...DEFAULT_GRID, bars: 1, stepsPerBar: 4 }
    const limit = totalSteps(grid)
    const a = createSlip({ id: 'a', grid, referencedSlipIds: ['b'] })
    const bNotes = [{ id: 'overhang', pitch: 60, start: limit - 2, length: 5, velocity: 0.8 }]
    const b = createSlip({ id: 'b', notes: bNotes })

    const result = resolveSlipNotes(a, [a, b])

    expect(result).toEqual([{ ...bNotes[0], length: 2 }])
  })
})
