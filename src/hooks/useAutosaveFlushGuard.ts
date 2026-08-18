import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, type NavigateFunction } from 'react-router'

export interface UseAutosaveFlushGuardOptions {
  navigate: NavigateFunction
  fallbackPath: string
  isLoaded: boolean
  isPersisted: boolean
  isNewCapture: boolean
  cancelPending: () => void
  persist: () => Promise<boolean>
}

export interface UseAutosaveFlushGuardResult {
  showDiscardConfirm: boolean
  confirmDiscard: () => void
  keepEditing: () => void
  skipGuardRef: React.RefObject<boolean>
}

/**
 * The single seam for "leaving this screen safely": intercepts any attempted
 * navigation away (Back, a provenance link, browser Back/Forward — whichever
 * triggered it) and either flushes a persisted value's pending autosave
 * silently, or blocks and asks for discard confirmation if it's never been
 * persisted. Also owns the "unknown/deleted id" redirect, which shares the
 * same skip-the-guard escape hatch (nothing to flush or confirm there).
 */
export function useAutosaveFlushGuard({
  navigate,
  fallbackPath,
  isLoaded,
  isPersisted,
  isNewCapture,
  cancelPending,
  persist,
}: UseAutosaveFlushGuardOptions): UseAutosaveFlushGuardResult {
  const skipGuardRef = useRef(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        !skipGuardRef.current && currentLocation.pathname !== nextLocation.pathname,
      [],
    ),
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (isPersisted) {
      cancelPending()
      persist().then((saved) => {
        if (saved) blocker.proceed()
        else blocker.reset()
      })
    } else {
      setShowDiscardConfirm(true)
    }
    // Reacts only to blocker.state transitions; isPersisted/cancelPending/persist
    // are read fresh from the latest render's closure each time it fires.
  }, [blocker.state])

  useEffect(() => {
    if (isLoaded && !isPersisted && !isNewCapture) {
      skipGuardRef.current = true
      navigate(fallbackPath, { replace: true })
    }
  }, [isLoaded, isPersisted, isNewCapture, navigate, fallbackPath])

  function confirmDiscard() {
    setShowDiscardConfirm(false)
    cancelPending()
    blocker.proceed?.()
  }

  function keepEditing() {
    setShowDiscardConfirm(false)
    blocker.reset?.()
  }

  return { showDiscardConfirm, confirmDiscard, keepEditing, skipGuardRef }
}
