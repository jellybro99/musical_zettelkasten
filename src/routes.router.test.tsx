// @vitest-environment jsdom
import { IDBFactory } from 'fake-indexeddb'
import { act, screen, waitFor, within } from '@testing-library/react'
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

describe('router-driven navigation', () => {
  it('renders the Slip-box when visiting /slips directly', async () => {
    const slip = createSlip({ title: 'Rhodes Chord Stab' })
    await saveSlip(slip)

    renderApp({ initialEntries: ['/slips'] })

    expect(await screen.findByText('Rhodes Chord Stab')).toBeInTheDocument()
  })

  it('renders that slip open in the editor when visiting /slips/:slipId directly', async () => {
    const slip = createSlip({ title: 'Bass Loop' })
    await saveSlip(slip)

    renderApp({ initialEntries: [`/slips/${slip.id}`] })

    expect(await screen.findByDisplayValue('Bass Loop')).toBeInTheDocument()
  })

  it('redirects to the Slip-box for an unknown/deleted slip id instead of crashing', async () => {
    const { router } = renderApp({ initialEntries: ['/slips/does-not-exist'] })

    await waitFor(() => expect(router.state.location.pathname).toBe('/slips'))
  })

  it('renders the Arrangement dashboard when visiting /arrange directly', async () => {
    const arrangement = createArrangement({ name: 'Set Opener' })
    await saveArrangement(arrangement)

    renderApp({ initialEntries: ['/arrange'] })

    expect(await screen.findByText('Set Opener')).toBeInTheDocument()
  })

  it('renders that Arrangement when visiting /arrange/:arrangementId directly', async () => {
    const arrangement = createArrangement({ name: 'Set Opener' })
    await saveArrangement(arrangement)

    renderApp({ initialEntries: [`/arrange/${arrangement.id}`] })

    expect(await screen.findByDisplayValue('Set Opener')).toBeInTheDocument()
  })

  it('redirects to the Arrange dashboard for an unknown/deleted arrangement id', async () => {
    const { router } = renderApp({ initialEntries: ['/arrange/does-not-exist'] })

    await waitFor(() => expect(router.state.location.pathname).toBe('/arrange'))
  })

  it('renders the disabled Desk stub when visiting /desk', async () => {
    renderApp({ initialEntries: ['/desk'] })

    expect(await screen.findByText(/desk is coming soon/i)).toBeInTheDocument()
  })

  it('follows a slip-to-slip provenance link via a real navigation, and browser Back/Forward move through it', async () => {
    const user = userEvent.setup()
    const original = createSlip({ title: 'Original Riff' })
    await saveSlip(original)
    const copy = createSlip({ title: 'Copy of Original Riff', copiedFromId: original.id })
    await saveSlip(copy)

    const { router } = renderApp({ initialEntries: [`/slips/${copy.id}`] })

    const provenanceLink = await screen.findByRole('button', { name: /copied from/i })
    await user.click(provenanceLink)

    await waitFor(() => expect(router.state.location.pathname).toBe(`/slips/${original.id}`))
    expect(await screen.findByDisplayValue('Original Riff')).toBeInTheDocument()

    await act(async () => {
      router.navigate(-1)
    })
    await waitFor(() => expect(router.state.location.pathname).toBe(`/slips/${copy.id}`))
    expect(await screen.findByDisplayValue('Copy of Original Riff')).toBeInTheDocument()

    await act(async () => {
      router.navigate(1)
    })
    await waitFor(() => expect(router.state.location.pathname).toBe(`/slips/${original.id}`))
    expect(await screen.findByDisplayValue('Original Riff')).toBeInTheDocument()
  })

  it("TopNav's active-section highlight reflects the current route", async () => {
    const { router } = renderApp({ initialEntries: ['/slips'] })

    expect(await screen.findByRole('button', { name: 'Slip-box' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Arrange' })).not.toHaveAttribute('aria-current')

    await act(async () => {
      await router.navigate('/arrange')
    })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Arrange' })).toHaveAttribute('aria-current', 'page'))
    expect(screen.getByRole('button', { name: 'Slip-box' })).not.toHaveAttribute('aria-current')
  })

  it('stops playback automatically on every navigation between screens', async () => {
    const user = userEvent.setup()
    const slip = createSlip({ title: 'Drum Fill' })
    await saveSlip(slip)

    renderApp({ initialEntries: ['/slips'] })

    const card = (await screen.findByText('Drum Fill')).closest('.slip-card-wrapper') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /^play/i }))

    expect(await screen.findByText('Drum Fill', { selector: '.playback-bar-title' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Arrange' }))

    await waitFor(() => expect(screen.getByText('Nothing playing')).toBeInTheDocument())
  })

  it('shows no stale editor state after navigating directly from one slip to another', async () => {
    const slipA = createSlip({ title: 'Slip A' })
    const slipB = createSlip({ title: 'Slip B' })
    await saveSlip(slipA)
    await saveSlip(slipB)

    const { router } = renderApp({ initialEntries: [`/slips/${slipA.id}`] })
    expect(await screen.findByDisplayValue('Slip A')).toBeInTheDocument()

    await act(async () => {
      await router.navigate(`/slips/${slipB.id}`)
    })

    expect(await screen.findByDisplayValue('Slip B')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Slip A')).not.toBeInTheDocument()
  })
})
