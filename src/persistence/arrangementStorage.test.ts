import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { createArrangement } from '../domain/arrangement'
import { deleteArrangement, getArrangement, listArrangements, saveArrangement } from './arrangementStorage'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('arrangement persistence', () => {
  it('returns an empty list when nothing has been saved yet', async () => {
    await expect(listArrangements()).resolves.toEqual([])
  })

  it('returns null from getArrangement when the id is unknown', async () => {
    await expect(getArrangement('missing')).resolves.toBeNull()
  })

  it('saves several arrangements and lists them all', async () => {
    const first = createArrangement({ name: 'Song A' })
    const second = createArrangement({ name: 'Song B' })

    await saveArrangement(first)
    await saveArrangement(second)

    const arrangements = await listArrangements()
    expect(arrangements).toHaveLength(2)
    expect(arrangements).toEqual(expect.arrayContaining([first, second]))
  })

  it('loads back the exact arrangement shape that was saved', async () => {
    const arrangement = createArrangement({ name: 'Song A', tempo: 96 })

    await saveArrangement(arrangement)

    await expect(getArrangement(arrangement.id)).resolves.toEqual(arrangement)
  })

  it('fetches the right arrangement among several saved ones', async () => {
    const first = createArrangement({ name: 'Song A' })
    const second = createArrangement({ name: 'Song B' })
    const third = createArrangement({ name: 'Song C' })
    await saveArrangement(first)
    await saveArrangement(second)
    await saveArrangement(third)

    await expect(getArrangement(second.id)).resolves.toEqual(second)
  })

  it('removes the given arrangement and leaves the rest', async () => {
    const first = createArrangement({ name: 'Song A' })
    const second = createArrangement({ name: 'Song B' })
    await saveArrangement(first)
    await saveArrangement(second)

    await deleteArrangement(first.id)

    await expect(getArrangement(first.id)).resolves.toBeNull()
    await expect(listArrangements()).resolves.toEqual([second])
  })

  it('upserts on saveArrangement rather than duplicating an existing id', async () => {
    const arrangement = createArrangement({ name: 'Song A' })
    await saveArrangement(arrangement)

    const renamed = { ...arrangement, name: 'Renamed' }
    await saveArrangement(renamed)

    const arrangements = await listArrangements()
    expect(arrangements).toHaveLength(1)
    expect(arrangements[0].name).toBe('Renamed')
  })
})
