import { describe, expect, it } from 'vitest'
import type { SlipFilters } from '../domain/slip'
import { EMPTY_FILTERS, filtersToSearchParams, searchParamsToFilters } from './slipFilterParams'

describe('slipFilterParams', () => {
  it('produces no params at all for default/empty filters', () => {
    expect(filtersToSearchParams(EMPTY_FILTERS).toString()).toBe('')
  })

  it('round-trips search text, kind, tags, and tempo range through the URL', () => {
    const filters: SlipFilters = {
      search: 'rhodes',
      tags: ['keys', 'warm'],
      kind: 'Loop',
      minTempo: 90,
      maxTempo: 140,
    }

    const params = filtersToSearchParams(filters)
    expect(searchParamsToFilters(params)).toEqual(filters)
  })

  it('omits a param whose value is back at its default', () => {
    const params = filtersToSearchParams({ ...EMPTY_FILTERS, search: 'bass' })
    expect(params.get('kind')).toBeNull()
    expect(params.getAll('tag')).toEqual([])
    expect(params.has('minTempo')).toBe(false)
    expect(params.has('maxTempo')).toBe(false)
    expect(params.get('q')).toBe('bass')
  })

  it('falls back to "all" for an unrecognized kind param instead of throwing', () => {
    const params = new URLSearchParams('kind=not-a-real-kind')
    expect(searchParamsToFilters(params).kind).toBe('all')
  })

  it('parses an empty/missing search into the default filters', () => {
    expect(searchParamsToFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS)
  })
})
