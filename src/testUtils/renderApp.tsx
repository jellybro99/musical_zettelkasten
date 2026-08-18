import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routeTree } from '../routes'

export interface RenderAppOptions {
  initialEntries?: string[]
  initialIndex?: number
}

/**
 * Renders the real app shell through the same route tree definitions
 * `createBrowserRouter` uses in production, via `createMemoryRouter` — the
 * shared test seam described in the router-navigation spec's Testing
 * Decisions. Callers seed fake-IndexedDB state beforehand (see
 * `slipStorage.test.ts`'s `globalThis.indexedDB = new IDBFactory()` pattern)
 * and interact through rendered screens, not internal handlers.
 */
export function renderApp(options: RenderAppOptions = {}) {
  const router = createMemoryRouter(routeTree, {
    initialEntries: options.initialEntries ?? ['/slips'],
    initialIndex: options.initialIndex,
  })
  const view = render(<RouterProvider router={router} />)
  return { ...view, router }
}
