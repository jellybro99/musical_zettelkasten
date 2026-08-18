// @vitest-environment jsdom
import { IDBFactory } from 'fake-indexeddb'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createArrangement, placeClip } from './domain/arrangement'
import { createSlip } from './domain/slip'
import { getArrangement, saveArrangement } from './persistence/arrangementStorage'
import { getSlip, saveSlip } from './persistence/slipStorage'
import { installFakeAudioContext } from './testUtils/fakeAudioContext'
import { renderApp } from './testUtils/renderApp'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  installFakeAudioContext()
})

describe('autosave flush guard', () => {
  it('does not lose an edit made just before clicking Back on a persisted slip', async () => {
    const user = userEvent.setup()
    const slip = createSlip({ title: 'Original Title' })
    await saveSlip(slip)

    renderApp({ initialEntries: [`/slips/${slip.id}`] })
    const titleInput = await screen.findByDisplayValue('Original Title')
    fireEvent.change(titleInput, { target: { value: 'Edited Title' } })
    await waitFor(() => expect(titleInput).toHaveValue('Edited Title'))

    // Click Back immediately — well inside the 400ms autosave debounce.
    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument())
    await expect(getSlip(slip.id)).resolves.toMatchObject({ title: 'Edited Title' })
  })

  it('does not lose an edit made just before clicking Back on a persisted Arrangement', async () => {
    const user = userEvent.setup()
    const arrangement = createArrangement({ name: 'Original Name' })
    await saveArrangement(arrangement)

    renderApp({ initialEntries: [`/arrange/${arrangement.id}`] })
    const nameInput = await screen.findByDisplayValue('Original Name')
    fireEvent.change(nameInput, { target: { value: 'Edited Name' } })
    await waitFor(() => expect(nameInput).toHaveValue('Edited Name'))

    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => expect(screen.queryByLabelText('Arrangement name')).not.toBeInTheDocument())
    await expect(getArrangement(arrangement.id)).resolves.toMatchObject({ name: 'Edited Name' })
  })

  it('does not lose an edit made just before following a provenance link', async () => {
    const user = userEvent.setup()
    const original = createSlip({ title: 'Original Riff' })
    await saveSlip(original)
    const copy = createSlip({ title: 'Copy Title', copiedFromId: original.id })
    await saveSlip(copy)

    renderApp({ initialEntries: [`/slips/${copy.id}`] })
    const titleInput = await screen.findByDisplayValue('Copy Title')
    fireEvent.change(titleInput, { target: { value: 'Edited Copy Title' } })
    await waitFor(() => expect(titleInput).toHaveValue('Edited Copy Title'))

    await user.click(screen.getByRole('button', { name: /copied from/i }))

    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Original Riff'))
    await expect(getSlip(copy.id)).resolves.toMatchObject({ title: 'Edited Copy Title' })
  })

  it('marks the originating Arrangement as saved when opening a Variation in the editor', async () => {
    const user = userEvent.setup()
    const slip = createSlip({ title: 'Source Loop' })
    await saveSlip(slip)
    let arrangement = createArrangement({ name: 'Set Opener' })
    arrangement = placeClip(arrangement, { trackId: 'new-track', slipId: slip.id, startBar: 0, slipBars: 2 })
    await saveArrangement(arrangement)

    renderApp({ initialEntries: [`/arrange/${arrangement.id}`] })
    await user.click(await screen.findByRole('button', { name: `Make a variation from ${slip.title}` }))
    await user.click(await screen.findByRole('button', { name: /create & add notes/i }))
    await screen.findByRole('button', { name: /^delete$/i })

    const persisted = await getArrangement(arrangement.id)
    const persistedSlipId = persisted?.tracks[0]?.clips[0]?.slipId
    expect(persistedSlipId).toBeDefined()
    expect(persistedSlipId).not.toBe(slip.id)
  })

  it('blocks navigation away from a brand-new, never-saved slip and shows the discard dialog, from more than one path', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ initialEntries: ['/slips'] })

    await user.click(await screen.findByRole('button', { name: /capture/i }))
    await screen.findByLabelText('Title')
    const editorPath = router.state.location.pathname

    // Path 1: the explicit Back button.
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByText(/discard this slip/i)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(editorPath)
    await user.click(screen.getByRole('button', { name: /keep editing/i }))
    expect(screen.queryByText(/discard this slip/i)).not.toBeInTheDocument()

    // Path 2: a completely different navigation (browser Back/Forward-style).
    await router.navigate('/arrange')
    expect(await screen.findByText(/discard this slip/i)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(editorPath)

    await user.click(screen.getByRole('button', { name: /^discard$/i }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/arrange'))
  })

  it('never shows a discard dialog when leaving a previously-persisted slip', async () => {
    const user = userEvent.setup()
    const slip = createSlip({ title: 'Already Saved' })
    await saveSlip(slip)

    renderApp({ initialEntries: [`/slips/${slip.id}`] })
    await screen.findByLabelText('Title')

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.queryByText(/discard this slip/i)).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument())
  })

  it('blocks navigation away from a brand-new, never-saved Arrangement and shows the discard dialog, from more than one path', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ initialEntries: ['/arrange'] })

    await user.click(await screen.findByRole('button', { name: /new arrangement/i }))
    await screen.findByLabelText('Arrangement name')
    const editorPath = router.state.location.pathname

    // Path 1: the explicit Back button.
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByText(/discard this arrangement/i)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(editorPath)
    await user.click(screen.getByRole('button', { name: /keep editing/i }))
    expect(screen.queryByText(/discard this arrangement/i)).not.toBeInTheDocument()

    // Path 2: a completely different navigation (browser Back/Forward-style).
    await router.navigate('/slips')
    expect(await screen.findByText(/discard this arrangement/i)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(editorPath)

    await user.click(screen.getByRole('button', { name: /^discard$/i }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/slips'))
  })

  it('never shows a discard dialog when leaving a previously-persisted Arrangement', async () => {
    const user = userEvent.setup()
    const arrangement = createArrangement({ name: 'Already Saved' })
    await saveArrangement(arrangement)

    renderApp({ initialEntries: [`/arrange/${arrangement.id}`] })
    await screen.findByLabelText('Arrangement name')

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.queryByText(/discard this arrangement/i)).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByLabelText('Arrangement name')).not.toBeInTheDocument())
  })
})
