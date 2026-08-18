// @vitest-environment jsdom
import { IDBFactory } from 'fake-indexeddb'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createArrangement } from './domain/arrangement'
import { createSlip } from './domain/slip'
import { saveArrangement } from './persistence/arrangementStorage'
import { saveSlip } from './persistence/slipStorage'
import { installFakeAudioContext } from './testUtils/fakeAudioContext'
import { renderApp } from './testUtils/renderApp'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  installFakeAudioContext()
})

describe('bookmarkable Slip-box filters', () => {
  it('reflects a search-text filter in the URL', async () => {
    const user = userEvent.setup()
    await saveSlip(createSlip({ title: 'Rhodes Chord Stab' }))
    await saveSlip(createSlip({ title: 'Bass Loop' }))

    const { router } = renderApp({ initialEntries: ['/slips'] })
    await user.type(await screen.findByPlaceholderText('Search title or tag'), 'rhodes')

    await waitFor(() => expect(router.state.location.search).toBe('?q=rhodes'))
  })

  it('reflects a Kind filter in the URL', async () => {
    const user = userEvent.setup()
    await saveSlip(createSlip({ title: 'Rhodes Chord Stab', kind: 'Loop' }))

    const { router } = renderApp({ initialEntries: ['/slips'] })
    await user.click(await screen.findByRole('button', { name: /^loop/i }))

    await waitFor(() => expect(router.state.location.search).toBe('?kind=Loop'))
  })

  it('restores a filtered view when reloading on a filtered URL', async () => {
    await saveSlip(createSlip({ title: 'Rhodes Chord Stab', kind: 'Loop' }))
    await saveSlip(createSlip({ title: 'One Shot Snap', kind: 'One-shot' }))

    renderApp({ initialEntries: ['/slips?kind=Loop'] })

    expect(await screen.findByText('Rhodes Chord Stab')).toBeInTheDocument()
    expect(screen.queryByText('One Shot Snap')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^loop/i })).toHaveClass('active')
  })

  it('removes filter params from the URL when clearing all filters', async () => {
    const user = userEvent.setup()
    await saveSlip(createSlip({ title: 'Rhodes Chord Stab', kind: 'Loop' }))

    const { router } = renderApp({ initialEntries: ['/slips?kind=Loop'] })
    await waitFor(() => expect(screen.getByRole('button', { name: /^loop/i })).toHaveClass('active'))

    await user.click(screen.getByRole('button', { name: /^loop/i }))

    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('reflects a Tag filter in the URL', async () => {
    const user = userEvent.setup()
    await saveSlip(createSlip({ title: 'Rhodes Chord Stab', tags: ['keys'] }))

    const { router } = renderApp({ initialEntries: ['/slips'] })
    await user.click(await screen.findByRole('button', { name: /^keys/i }))

    await waitFor(() => expect(router.state.location.search).toBe('?tag=keys'))
  })

  it('reflects a tempo-range filter in the URL', async () => {
    await saveSlip(createSlip({ title: 'Rhodes Chord Stab', tempo: 120 }))

    const { router } = renderApp({ initialEntries: ['/slips'] })
    fireEvent.change(await screen.findByLabelText('Minimum tempo'), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText('Maximum tempo'), { target: { value: '140' } })

    await waitFor(() => expect(router.state.location.search).toBe('?minTempo=90&maxTempo=140'))
  })

  it('restores Tag and tempo-range filters when reloading on a filtered URL', async () => {
    await saveSlip(createSlip({ title: 'Rhodes Chord Stab', tags: ['keys'], tempo: 120 }))

    renderApp({ initialEntries: ['/slips?tag=keys&minTempo=90&maxTempo=140'] })

    await waitFor(() => expect(screen.getByRole('button', { name: /^keys/i })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByLabelText('Minimum tempo')).toHaveValue(90)
    expect(screen.getByLabelText('Maximum tempo')).toHaveValue(140)
  })
})

describe('bookmarkable Arrange search-rail filters', () => {
  it('reflects a Kind filter in the URL', async () => {
    const user = userEvent.setup()
    await saveSlip(createSlip({ title: 'Rhodes Chord Stab', kind: 'Loop' }))
    const arrangement = createArrangement({ name: 'Set Opener' })
    await saveArrangement(arrangement)

    const { router } = renderApp({ initialEntries: [`/arrange/${arrangement.id}`] })
    await user.click(await screen.findByRole('button', { name: /^loop/i }))

    await waitFor(() => expect(router.state.location.search).toBe('?kind=Loop'))
  })

  it('restores a filtered view when reloading on a filtered URL', async () => {
    await saveSlip(createSlip({ title: 'Rhodes Chord Stab', kind: 'Loop' }))
    const arrangement = createArrangement({ name: 'Set Opener' })
    await saveArrangement(arrangement)

    renderApp({ initialEntries: [`/arrange/${arrangement.id}?kind=Loop`] })

    await waitFor(() => expect(screen.getByRole('button', { name: /^loop/i })).toHaveClass('active'))
  })
})
