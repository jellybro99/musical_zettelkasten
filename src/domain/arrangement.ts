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
