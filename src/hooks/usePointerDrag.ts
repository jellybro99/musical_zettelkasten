import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

export interface UsePointerDragResult {
  startDrag: (event: ReactMouseEvent, onMove: (dx: number, dy: number) => void) => void
}

/**
 * Tracks a mousedown-to-mouseup drag and reports the pixel delta from the
 * origin on each move; unit conversion (bars, steps, pitch...) is the
 * caller's job via `onMove`. One listener pair for the component's whole
 * lifetime (guarded by originRef, cleared on mouseup) rather than one per
 * drag, so an unmount mid-drag or a missed mouseup can't leak or stack them.
 */
export function usePointerDrag(): UsePointerDragResult {
  const originRef = useRef<{ x: number; y: number } | null>(null)
  const onMoveRef = useRef<((dx: number, dy: number) => void) | null>(null)

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const origin = originRef.current
      if (!origin) return
      onMoveRef.current?.(event.clientX - origin.x, event.clientY - origin.y)
    }

    function handleMouseUp() {
      originRef.current = null
      onMoveRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const startDrag = useCallback((event: ReactMouseEvent, onMove: (dx: number, dy: number) => void) => {
    originRef.current = { x: event.clientX, y: event.clientY }
    onMoveRef.current = onMove
  }, [])

  return { startDrag }
}
