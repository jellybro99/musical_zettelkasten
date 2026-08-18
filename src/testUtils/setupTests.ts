import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Without `test.globals`, testing-library's own afterEach auto-registration
// can't find a global `afterEach` to hook into, so each render() would keep
// piling onto document.body across tests in the same file.
afterEach(() => {
  cleanup()
})
