import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { createSlip, DEFAULT_GRID, placeNote } from '../domain/slip'
import { deleteSlip, getSlip, listSlips, saveSlip } from './slipStorage'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('slip persistence', () => {
  it('returns an empty list when nothing has been saved yet', async () => {
    await expect(listSlips()).resolves.toEqual([])
  })

  it('returns null from getSlip when the id is unknown', async () => {
    await expect(getSlip('missing')).resolves.toBeNull()
  })

  it('saves several slips and lists them all', async () => {
    const first = createSlip({ title: 'Rhodes Chord Stab' })
    const second = createSlip({ title: 'Bass Loop' })

    await saveSlip(first)
    await saveSlip(second)

    const slips = await listSlips()
    expect(slips).toHaveLength(2)
    expect(slips).toEqual(expect.arrayContaining([first, second]))
  })

  it('loads back the exact slip shape that was saved', async () => {
    const slip = createSlip({
      title: 'Rhodes Chord Stab',
      tempo: 96,
      key: 'E min',
      kind: 'Loop',
      tags: ['keys', 'rhodes'],
      notes: placeNote([], DEFAULT_GRID, { pitch: 64, start: 4 }),
    })

    await saveSlip(slip)

    await expect(getSlip(slip.id)).resolves.toEqual(slip)
  })

  it('fetches the right slip among several saved ones', async () => {
    const first = createSlip({ title: 'Rhodes Chord Stab' })
    const second = createSlip({ title: 'Bass Loop' })
    const third = createSlip({ title: 'Hats' })
    await saveSlip(first)
    await saveSlip(second)
    await saveSlip(third)

    await expect(getSlip(second.id)).resolves.toEqual(second)
  })

  it('removes the given slip and leaves the rest', async () => {
    const first = createSlip({ title: 'Rhodes Chord Stab' })
    const second = createSlip({ title: 'Bass Loop' })
    await saveSlip(first)
    await saveSlip(second)

    await deleteSlip(first.id)

    await expect(getSlip(first.id)).resolves.toBeNull()
    await expect(listSlips()).resolves.toEqual([second])
  })

  it('upserts on saveSlip rather than duplicating an existing id', async () => {
    const slip = createSlip({ title: 'Rhodes Chord Stab' })
    await saveSlip(slip)

    const renamed = { ...slip, title: 'Renamed' }
    await saveSlip(renamed)

    const slips = await listSlips()
    expect(slips).toHaveLength(1)
    expect(slips[0].title).toBe('Renamed')
  })
})
