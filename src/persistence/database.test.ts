import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { ARRANGEMENTS_STORE, DB_NAME, openDatabase, SLIPS_STORE } from './database'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

function seedLegacySlipsStore(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SLIPS_STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(SLIPS_STORE, 'readwrite')
      tx.objectStore(SLIPS_STORE).put({ id: 'existing-slip', title: 'Existing Slip' })
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  })
}

describe('openDatabase upgrade', () => {
  it('preserves an existing store\'s data when the version bumps to add a new store', async () => {
    await seedLegacySlipsStore()

    const db = await openDatabase()
    const slip = await new Promise((resolve, reject) => {
      const request = db.transaction(SLIPS_STORE, 'readonly').objectStore(SLIPS_STORE).get('existing-slip')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()

    expect(slip).toMatchObject({ id: 'existing-slip', title: 'Existing Slip' })
  })

  it('creates the new store alongside the preserved one', async () => {
    await seedLegacySlipsStore()

    const db = await openDatabase()
    const storeNames = Array.from(db.objectStoreNames)
    db.close()

    expect(storeNames).toEqual(expect.arrayContaining([SLIPS_STORE, ARRANGEMENTS_STORE]))
  })
})
