import { describe, expect, it } from 'vitest'
import { generateSlipTitle } from './titleGenerator'

describe('generateSlipTitle', () => {
  it('is deterministic for a given seed', () => {
    expect(generateSlipTitle(42)).toBe(generateSlipTitle(42))
  })

  it('returns an adjective and a noun separated by a space', () => {
    const title = generateSlipTitle(1)
    const parts = title.split(' ')
    expect(parts).toHaveLength(2)
  })

  it('produces different titles for different seeds', () => {
    expect(generateSlipTitle(1)).not.toBe(generateSlipTitle(2))
  })
})
