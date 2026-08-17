import type { Slip } from '../domain/slip'

const DB_NAME = 'musical-zettelkasten'
const DB_VERSION = 3
const STORE_NAME = 'slips'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME)
      }
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function normalizeSlip(slip: Slip): Slip {
  return { ...slip, copiedFromId: slip.copiedFromId ?? null }
}

export async function listSlips(): Promise<Slip[]> {
  const db = await openDatabase()
  try {
    const slips = await new Promise<Slip[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return slips.map(normalizeSlip)
  } finally {
    db.close()
  }
}

export async function getSlip(id: string): Promise<Slip | null> {
  const db = await openDatabase()
  try {
    const slip = await new Promise<Slip | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(id)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
    return slip ? normalizeSlip(slip) : null
  } finally {
    db.close()
  }
}

export async function saveSlip(slip: Slip): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(slip)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function deleteSlip(id: string): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
