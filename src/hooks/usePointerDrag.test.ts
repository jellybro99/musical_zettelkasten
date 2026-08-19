// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePointerDrag } from './usePointerDrag'

function fakeMouseDown(clientX: number, clientY: number) {
  return { clientX, clientY } as React.MouseEvent
}

function dispatchWindowMouse(type: 'mousemove' | 'mouseup', clientX = 0, clientY = 0) {
  window.dispatchEvent(new MouseEvent(type, { clientX, clientY }))
}

describe('usePointerDrag', () => {
  it('calls onMove with the pixel delta from the drag origin', () => {
    const { result } = renderHook(() => usePointerDrag())
    const onMove = vi.fn()

    act(() => {
      result.current.startDrag(fakeMouseDown(100, 50), onMove)
    })
    act(() => {
      dispatchWindowMouse('mousemove', 130, 40)
    })

    expect(onMove).toHaveBeenCalledWith(30, -10)
  })

  it('stops calling onMove after mouseup', () => {
    const { result } = renderHook(() => usePointerDrag())
    const onMove = vi.fn()

    act(() => {
      result.current.startDrag(fakeMouseDown(0, 0), onMove)
    })
    act(() => {
      dispatchWindowMouse('mouseup')
    })
    onMove.mockClear()
    act(() => {
      dispatchWindowMouse('mousemove', 50, 50)
    })

    expect(onMove).not.toHaveBeenCalled()
  })

  it('resets the origin on a fresh startDrag call', () => {
    const { result } = renderHook(() => usePointerDrag())
    const firstOnMove = vi.fn()
    const secondOnMove = vi.fn()

    act(() => {
      result.current.startDrag(fakeMouseDown(0, 0), firstOnMove)
    })
    act(() => {
      dispatchWindowMouse('mouseup')
    })
    act(() => {
      result.current.startDrag(fakeMouseDown(200, 200), secondOnMove)
    })
    act(() => {
      dispatchWindowMouse('mousemove', 210, 190)
    })

    expect(secondOnMove).toHaveBeenCalledWith(10, -10)
    expect(firstOnMove).not.toHaveBeenCalled()
  })
})
