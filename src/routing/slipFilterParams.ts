import { SLIP_KINDS, type SlipFilters, type SlipKind } from '../domain/slip'

export const EMPTY_FILTERS: SlipFilters = { search: '', tags: [], kind: 'all' }

function isSlipKind(value: string): value is SlipKind {
  return (SLIP_KINDS as readonly string[]).includes(value)
}

// Default/empty filters produce no params at all — a cleared filter set is a
// clean URL, not a URL carrying present-but-empty params.
export function filtersToSearchParams(filters: SlipFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search.trim()) params.set('q', filters.search)
  if (filters.kind !== 'all') params.set('kind', filters.kind)
  for (const tag of filters.tags) params.append('tag', tag)
  if (filters.minTempo !== undefined) params.set('minTempo', String(filters.minTempo))
  if (filters.maxTempo !== undefined) params.set('maxTempo', String(filters.maxTempo))
  return params
}

export function searchParamsToFilters(params: URLSearchParams): SlipFilters {
  const kindParam = params.get('kind')
  const minTempoParam = params.get('minTempo')
  const maxTempoParam = params.get('maxTempo')
  return {
    search: params.get('q') ?? '',
    tags: params.getAll('tag'),
    kind: kindParam && isSlipKind(kindParam) ? kindParam : 'all',
    minTempo: minTempoParam !== null ? Number(minTempoParam) : undefined,
    maxTempo: maxTempoParam !== null ? Number(maxTempoParam) : undefined,
  }
}
