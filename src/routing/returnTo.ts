const ARRANGEMENT_PREFIX = 'arrangement:'

// The slip editor's `from` search param encodes which Arrangement a
// Variation was opened from, so Back can return there instead of the
// Slip-box, surviving a reload since it lives in the URL, not memory.
export function returnToArrangementParam(arrangementId: string): string {
  return `${ARRANGEMENT_PREFIX}${arrangementId}`
}

export function parseReturnToArrangementId(searchParams: URLSearchParams): string | null {
  const fromParam = searchParams.get('from')
  return fromParam?.startsWith(ARRANGEMENT_PREFIX) ? fromParam.slice(ARRANGEMENT_PREFIX.length) : null
}
