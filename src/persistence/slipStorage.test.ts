import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { createSlip, DEFAULT_GRID, placeNote } from '../domain/slip'
import { loadSlip, saveSlip } from './slipStorage'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('slip persistence', () => {
  it('returns null when nothing has been saved yet', async () => {
    await expect(loadSlip()).resolves.toBeNull()
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

    await expect(loadSlip()).resolves.toEqual(slip)
  })
})
