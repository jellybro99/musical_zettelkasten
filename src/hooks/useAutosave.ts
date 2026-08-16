import { useCallback, useEffect, useRef, useState } from 'react'

export const AUTOSAVE_DELAY_MS = 400

export interface UseAutosaveOptions<T> {
  load: (id: string) => Promise<T | null>
  save: (value: T) => Promise<void>
  onLoaded: (value: T) => void
}

export interface UseAutosaveResult {
  isLoaded: boolean
  isPersisted: boolean
  markSaved: () => void
  cancelPending: () => void
}

/**
 * Save policy for an editor: load once on mount, autosave via debounced
 * JSON-diff against the last-persisted snapshot, only once loaded and
 * previously persisted. Manual saves and deletes hook in via `markSaved`
 * and `cancelPending` so this is the single place that owns the policy.
 */
export function useAutosave<T>(
  value: T,
  id: string,
  { load, save, onLoaded }: UseAutosaveOptions<T>,
): UseAutosaveResult {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPersisted, setIsPersisted] = useState(false)
  const pristineJsonRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  if (pristineJsonRef.current === null) pristineJsonRef.current = JSON.stringify(value)

  useEffect(() => {
    let cancelled = false
    load(id)
      .then((saved) => {
        if (cancelled) return
        if (saved) {
          pristineJsonRef.current = JSON.stringify(saved)
          setIsPersisted(true)
          onLoaded(saved)
        }
      })
      .catch((error) => {
        console.error('Failed to load saved value', error)
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!isLoaded || !isPersisted) return
    if (JSON.stringify(value) === pristineJsonRef.current) return
    const timeout = setTimeout(() => {
      save(value).catch((error) => {
        console.error('Failed to autosave', error)
      })
    }, AUTOSAVE_DELAY_MS)
    timeoutRef.current = timeout
    return () => clearTimeout(timeout)
  }, [value, isLoaded, isPersisted])

  const markSaved = useCallback(() => {
    pristineJsonRef.current = JSON.stringify(value)
    setIsPersisted(true)
  }, [value])

  const cancelPending = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  return { isLoaded, isPersisted, markSaved, cancelPending }
}
