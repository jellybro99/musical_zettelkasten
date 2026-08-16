// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from './useAutosave'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

// Fake timers pause the microtask-polling `waitFor` from testing-library relies
// on, so settle the load promise's `.then().catch().finally()` chain by hand.
async function flushLoad() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAutosave', () => {
  it('does not save before the load has resolved', async () => {
    const load = vi.fn().mockResolvedValue({ id: '1', title: 'A' })
    const save = vi.fn().mockResolvedValue(undefined)
    const onLoaded = vi.fn()

    const { rerender } = renderHook(
      ({ value }) => useAutosave(value, '1', { load, save, onLoaded }),
      { initialProps: { value: { id: '1', title: 'A' } } },
    )

    rerender({ value: { id: '1', title: 'B' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(save).not.toHaveBeenCalled()
  })

  it('does not save when there is nothing persisted yet, even once loaded', async () => {
    const load = vi.fn().mockResolvedValue(null)
    const save = vi.fn().mockResolvedValue(undefined)
    const onLoaded = vi.fn()

    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, '1', { load, save, onLoaded }),
      { initialProps: { value: { id: '1', title: 'A' } } },
    )

    await flushLoad()
    expect(result.current.isLoaded).toBe(true)
    expect(result.current.isPersisted).toBe(false)

    rerender({ value: { id: '1', title: 'B' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(save).not.toHaveBeenCalled()
  })

  it('saves 400ms after a change once loaded and persisted, and not before', async () => {
    const load = vi.fn().mockResolvedValue({ id: '1', title: 'A' })
    const save = vi.fn().mockResolvedValue(undefined)
    const onLoaded = vi.fn()

    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, '1', { load, save, onLoaded }),
      { initialProps: { value: { id: '1', title: 'A' } } },
    )

    await flushLoad()
    expect(result.current.isPersisted).toBe(true)

    rerender({ value: { id: '1', title: 'B' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399)
    })
    expect(save).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(save).toHaveBeenCalledWith({ id: '1', title: 'B' })
  })

  it('does not save when the value is unchanged from the pristine snapshot', async () => {
    const load = vi.fn().mockResolvedValue({ id: '1', title: 'A' })
    const save = vi.fn().mockResolvedValue(undefined)
    const onLoaded = vi.fn()

    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, '1', { load, save, onLoaded }),
      { initialProps: { value: { id: '1', title: 'A' } } },
    )

    await flushLoad()
    expect(result.current.isPersisted).toBe(true)

    rerender({ value: { id: '1', title: 'A' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(save).not.toHaveBeenCalled()
  })

  it('debounces rapid changes into a single save', async () => {
    const load = vi.fn().mockResolvedValue({ id: '1', title: 'A' })
    const save = vi.fn().mockResolvedValue(undefined)
    const onLoaded = vi.fn()

    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, '1', { load, save, onLoaded }),
      { initialProps: { value: { id: '1', title: 'A' } } },
    )

    await flushLoad()
    expect(result.current.isPersisted).toBe(true)

    rerender({ value: { id: '1', title: 'B' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    rerender({ value: { id: '1', title: 'C' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ id: '1', title: 'C' })
  })

  it('calls onLoaded and marks persisted when a saved value is found', async () => {
    const saved = { id: '1', title: 'Saved title' }
    const load = vi.fn().mockResolvedValue(saved)
    const save = vi.fn().mockResolvedValue(undefined)
    const onLoaded = vi.fn()

    const { result } = renderHook(
      ({ value }) => useAutosave(value, '1', { load, save, onLoaded }),
      { initialProps: { value: { id: '1', title: 'A' } } },
    )

    await flushLoad()
    expect(result.current.isLoaded).toBe(true)

    expect(onLoaded).toHaveBeenCalledWith(saved)
    expect(result.current.isPersisted).toBe(true)
  })

  it('markSaved marks the current value pristine so it is no longer dirty', async () => {
    const load = vi.fn().mockResolvedValue({ id: '1', title: 'A' })
    const save = vi.fn().mockResolvedValue(undefined)
    const onLoaded = vi.fn()

    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, '1', { load, save, onLoaded }),
      { initialProps: { value: { id: '1', title: 'A' } } },
    )

    await flushLoad()
    expect(result.current.isPersisted).toBe(true)

    rerender({ value: { id: '1', title: 'B' } })
    act(() => {
      // markSaved doesn't itself cancel an in-flight debounce (matches the
      // manual-Save button, which doesn't either); cancel it here so this
      // test isolates the pristine-snapshot behavior from timer cancellation.
      result.current.cancelPending()
      result.current.markSaved()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(save).not.toHaveBeenCalled()
  })

  it('cancelPending cancels a pending autosave', async () => {
    const load = vi.fn().mockResolvedValue({ id: '1', title: 'A' })
    const save = vi.fn().mockResolvedValue(undefined)
    const onLoaded = vi.fn()

    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, '1', { load, save, onLoaded }),
      { initialProps: { value: { id: '1', title: 'A' } } },
    )

    await flushLoad()
    expect(result.current.isPersisted).toBe(true)

    rerender({ value: { id: '1', title: 'B' } })
    act(() => {
      result.current.cancelPending()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(save).not.toHaveBeenCalled()
  })

  it('waits for a slow load to resolve before allowing an autosave to fire', async () => {
    const { promise, resolve } = deferred<{ id: string; title: string } | null>()
    const load = vi.fn().mockReturnValue(promise)
    const save = vi.fn().mockResolvedValue(undefined)
    const onLoaded = vi.fn()

    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, '1', { load, save, onLoaded }),
      { initialProps: { value: { id: '1', title: 'A' } } },
    )

    rerender({ value: { id: '1', title: 'B' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(save).not.toHaveBeenCalled()

    await act(async () => {
      resolve({ id: '1', title: 'A' })
      await vi.advanceTimersByTimeAsync(0)
    })
    await flushLoad()
    expect(result.current.isPersisted).toBe(true)

    rerender({ value: { id: '1', title: 'C' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(save).toHaveBeenCalledWith({ id: '1', title: 'C' })
  })
})
