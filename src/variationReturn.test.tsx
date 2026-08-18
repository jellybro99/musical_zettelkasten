// @vitest-environment jsdom
import { IDBFactory } from 'fake-indexeddb'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createArrangement, placeClip } from './domain/arrangement'
import { createSlip } from './domain/slip'
import { saveArrangement } from './persistence/arrangementStorage'
import { getSlip, saveSlip } from './persistence/slipStorage'
import { installFakeAudioContext } from './testUtils/fakeAudioContext'
import { renderApp } from './testUtils/renderApp'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  installFakeAudioContext()
})

async function seedArrangementWithClip() {
  const slip = createSlip({ title: 'Source Loop' })
  await saveSlip(slip)
  let arrangement = createArrangement({ name: 'Set Opener' })
  arrangement = placeClip(arrangement, { trackId: 'new-track', slipId: slip.id, startBar: 0, slipBars: 2 })
  await saveArrangement(arrangement)
  return { slip, arrangement }
}

// A data router's `router.state.location` updates as soon as navigate() is
// called, ahead of the React tree actually re-rendering to match — so
// asserting on router.state alone can pass before the DOM has caught up.
// Wait for the slip editor's own "Delete" button instead (unique to
// SlipEditor, unlike "Back"/"Create" which ArrangementView also has), which
// only exists once the editor has actually mounted.
async function waitForSlipEditor() {
  await screen.findByRole('button', { name: /^delete$/i })
}

describe('variation return-to-arrangement URL', () => {
  it('encodes the originating Arrangement in the URL when opening a Variation in the editor', async () => {
    const user = userEvent.setup()
    const { slip, arrangement } = await seedArrangementWithClip()

    const { router } = renderApp({ initialEntries: [`/arrange/${arrangement.id}`] })

    await user.click(await screen.findByRole('button', { name: `Make a variation from ${slip.title}` }))
    await user.click(await screen.findByRole('button', { name: /create variation/i }))
    await waitForSlipEditor()

    expect(router.state.location.pathname).toMatch(/^\/slips\//)
    expect(router.state.location.search).toBe(`?from=arrangement:${arrangement.id}`)

    const variationId = router.state.location.pathname.replace('/slips/', '')
    await expect(getSlip(variationId)).resolves.not.toBeNull()
  })

  it('returns to the originating Arrangement when clicking Back from that editor', async () => {
    const user = userEvent.setup()
    const { slip, arrangement } = await seedArrangementWithClip()

    const { router } = renderApp({ initialEntries: [`/arrange/${arrangement.id}`] })
    await user.click(await screen.findByRole('button', { name: `Make a variation from ${slip.title}` }))
    await user.click(await screen.findByRole('button', { name: /create variation/i }))
    await waitForSlipEditor()

    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/arrange/${arrangement.id}`))
  })

  it('still returns to the originating Arrangement after a simulated reload at that URL', async () => {
    const user = userEvent.setup()
    const { slip, arrangement } = await seedArrangementWithClip()

    const { router: firstRouter, unmount } = renderApp({ initialEntries: [`/arrange/${arrangement.id}`] })
    await user.click(await screen.findByRole('button', { name: `Make a variation from ${slip.title}` }))
    await user.click(await screen.findByRole('button', { name: /create variation/i }))
    await waitForSlipEditor()
    const variationUrl = firstRouter.state.location.pathname + firstRouter.state.location.search
    unmount()
    cleanup()

    // Fresh render at the resulting URL simulates a full page reload — no
    // in-memory navigation state survives, only what's in the URL.
    const { router } = renderApp({ initialEntries: [variationUrl] })
    await waitForSlipEditor()

    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/arrange/${arrangement.id}`))
  })

  it('opening a slip normally has no "from" param, and Back goes to the Slip-box', async () => {
    const user = userEvent.setup()
    const slip = createSlip({ title: 'Standalone Slip' })
    await saveSlip(slip)

    const { router } = renderApp({ initialEntries: [`/slips/${slip.id}`] })
    await waitForSlipEditor()
    expect(router.state.location.search).toBe('')

    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/slips'))
  })
})
