export const DB_NAME = 'musical-zettelkasten'
export const DB_VERSION = 4

export const SLIPS_STORE = 'slips'
export const ARRANGEMENTS_STORE = 'arrangements'

// Both slipStorage and arrangementStorage share one openDatabase/DB_VERSION so
// a single onupgradeneeded call creates every store — if each store's creation
// lived in its own file-local upgrade handler, whichever store's file happened
// to open the connection first would upgrade the database without the other
// file's store ever being created.
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of [SLIPS_STORE, ARRANGEMENTS_STORE]) {
        if (db.objectStoreNames.contains(store)) {
          db.deleteObjectStore(store)
        }
        db.createObjectStore(store, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
