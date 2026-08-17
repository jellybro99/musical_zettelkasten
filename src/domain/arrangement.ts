import { MIN_TEMPO } from './slip'

export interface Clip {
  id: string
  slipId: string
  startBar: number
  lengthBars: number
}

export interface Track {
  id: string
  name: string
  muted: boolean
  solo: boolean
  clips: Clip[]
}

export interface Arrangement {
  id: string
  createdAt: number
  name: string
  tempo: number
  tracks: Track[]
}

export function createArrangement(overrides?: Partial<Arrangement>): Arrangement {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    name: 'Untitled arrangement',
    tempo: 120,
    tracks: [],
    ...overrides,
  }
}

export interface UpdateArrangementMetadataInput {
  name?: string
  tempo?: number
}

export function updateArrangementMetadata(
  arrangement: Arrangement,
  input: UpdateArrangementMetadataInput,
): Arrangement {
  return {
    ...arrangement,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.tempo !== undefined ? { tempo: Math.max(MIN_TEMPO, Math.round(input.tempo)) } : {}),
  }
}

export function addTrack(arrangement: Arrangement, overrides?: Partial<Track>): Arrangement {
  const track: Track = { id: crypto.randomUUID(), name: 'New track', muted: false, solo: false, clips: [], ...overrides }
  return { ...arrangement, tracks: [...arrangement.tracks, track] }
}

export const NEW_TRACK = 'new-track'

export interface PlaceClipInput {
  trackId: string | typeof NEW_TRACK
  slipId: string
  startBar: number
  // The referenced slip's own bar count, so a freshly-placed clip starts out
  // playing the whole pattern rather than a default-length slice of it.
  slipBars: number
}

export function placeClip(arrangement: Arrangement, input: PlaceClipInput): Arrangement {
  const clip: Clip = {
    id: crypto.randomUUID(),
    slipId: input.slipId,
    startBar: Math.max(0, Math.round(input.startBar)),
    lengthBars: Math.max(1, Math.round(input.slipBars)),
  }

  if (input.trackId === NEW_TRACK) {
    return addTrack(arrangement, { clips: [clip] })
  }

  return {
    ...arrangement,
    tracks: arrangement.tracks.map((track) =>
      track.id === input.trackId ? { ...track, clips: [...track.clips, clip] } : track,
    ),
  }
}
