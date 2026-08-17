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

function findClip(arrangement: Arrangement, clipId: string): Clip | undefined {
  for (const track of arrangement.tracks) {
    const clip = track.clips.find((candidate) => candidate.id === clipId)
    if (clip) return clip
  }
  return undefined
}

export interface MoveClipInput {
  clipId: string
  trackId: string
  startBar: number
}

export function moveClip(arrangement: Arrangement, input: MoveClipInput): Arrangement {
  const clip = findClip(arrangement, input.clipId)
  if (!clip) return arrangement

  const moved: Clip = { ...clip, startBar: Math.max(0, Math.round(input.startBar)) }

  return {
    ...arrangement,
    tracks: arrangement.tracks.map((track) => {
      if (track.id === input.trackId) {
        const withoutClip = track.clips.filter((candidate) => candidate.id !== input.clipId)
        return { ...track, clips: [...withoutClip, moved] }
      }
      return { ...track, clips: track.clips.filter((candidate) => candidate.id !== input.clipId) }
    }),
  }
}

export interface ResizeClipLoopInput {
  clipId: string
  lengthBars: number
}

export function resizeClipLoop(arrangement: Arrangement, input: ResizeClipLoopInput): Arrangement {
  const lengthBars = Math.max(1, Math.round(input.lengthBars))
  return {
    ...arrangement,
    tracks: arrangement.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => (clip.id === input.clipId ? { ...clip, lengthBars } : clip)),
    })),
  }
}

export function removeClip(arrangement: Arrangement, clipId: string): Arrangement {
  return {
    ...arrangement,
    tracks: arrangement.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((clip) => clip.id !== clipId),
    })),
  }
}

export function renameTrack(arrangement: Arrangement, trackId: string, name: string): Arrangement {
  return {
    ...arrangement,
    tracks: arrangement.tracks.map((track) => (track.id === trackId ? { ...track, name } : track)),
  }
}

export function toggleTrackMute(arrangement: Arrangement, trackId: string): Arrangement {
  return {
    ...arrangement,
    tracks: arrangement.tracks.map((track) => (track.id === trackId ? { ...track, muted: !track.muted } : track)),
  }
}

export function toggleTrackSolo(arrangement: Arrangement, trackId: string): Arrangement {
  return {
    ...arrangement,
    tracks: arrangement.tracks.map((track) => (track.id === trackId ? { ...track, solo: !track.solo } : track)),
  }
}

export function clipFitLabel(sourceTempo: number, arrangementTempo: number): string | null {
  return sourceTempo === arrangementTempo ? null : `${sourceTempo}→${arrangementTempo}`
}

export function computeLoopMarks(clip: Clip, slipBars: number): number[] {
  if (slipBars <= 0) return []
  const marks: number[] = []
  for (let bar = slipBars; bar < clip.lengthBars; bar += slipBars) {
    marks.push(bar)
  }
  return marks
}
