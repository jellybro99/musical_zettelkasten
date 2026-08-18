export interface Note {
  id: string
  pitch: number
  start: number
  length: number
  velocity: number
}

export interface GridConfig {
  bars: number
  stepsPerBar: number
  lowPitch: number
  highPitch: number
}

export const DEFAULT_GRID: GridConfig = {
  bars: 2,
  stepsPerBar: 16,
  lowPitch: 60,
  highPitch: 71,
}

const DEFAULT_NOTE_LENGTH = 1
const DEFAULT_VELOCITY = 0.8
const MIN_NOTE_LENGTH = 1

export function totalSteps(grid: GridConfig): number {
  return grid.bars * grid.stepsPerBar
}

export function snapToGrid(value: number): number {
  return Math.round(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export interface PlaceNoteInput {
  pitch: number
  start: number
  length?: number
  velocity?: number
}

type NoteSpan = Pick<Note, 'pitch' | 'start' | 'length'>

function overlaps(a: NoteSpan, b: NoteSpan): boolean {
  return a.pitch === b.pitch && a.start < b.start + b.length && b.start < a.start + a.length
}

export function placeNote(notes: Note[], grid: GridConfig, input: PlaceNoteInput): Note[] {
  const length = clamp(snapToGrid(input.length ?? DEFAULT_NOTE_LENGTH), 1, totalSteps(grid))
  const pitch = clamp(snapToGrid(input.pitch), grid.lowPitch, grid.highPitch)
  const start = clamp(snapToGrid(input.start), 0, totalSteps(grid) - length)
  const velocity = clamp(input.velocity ?? DEFAULT_VELOCITY, 0, 1)

  const isOccupied = notes.some((note) => overlaps({ pitch, start, length }, note))
  if (isOccupied) return notes

  return [...notes, { id: crypto.randomUUID(), pitch, start, length, velocity }]
}

export interface MoveNoteInput {
  id: string
  pitch: number
  start: number
}

export function moveNote(notes: Note[], grid: GridConfig, input: MoveNoteInput): Note[] {
  return notes.map((note) =>
    note.id === input.id
      ? {
          ...note,
          pitch: clamp(snapToGrid(input.pitch), grid.lowPitch, grid.highPitch),
          start: clamp(snapToGrid(input.start), 0, totalSteps(grid) - note.length),
        }
      : note,
  )
}

export interface ResizeNoteInput {
  id: string
  length: number
}

export function resizeNote(notes: Note[], grid: GridConfig, input: ResizeNoteInput): Note[] {
  return notes.map((note) =>
    note.id === input.id
      ? { ...note, length: clamp(snapToGrid(input.length), MIN_NOTE_LENGTH, totalSteps(grid) - note.start) }
      : note,
  )
}

export function deleteNote(notes: Note[], id: string): Note[] {
  return notes.filter((note) => note.id !== id)
}

export function octaveCountToHighPitch(lowPitch: number, octaveCount: number): number {
  return lowPitch + octaveCount * 12 - 1
}

export function notesOutOfGridBounds(notes: Note[], grid: GridConfig): Note[] {
  return notes.filter(
    (note) =>
      note.pitch < grid.lowPitch || note.pitch > grid.highPitch || note.start + note.length > totalSteps(grid),
  )
}

export const SLIP_KINDS = ['Loop', 'One-shot', 'Phrase', 'Texture'] as const

export type SlipKind = (typeof SLIP_KINDS)[number]

export interface Slip {
  id: string
  createdAt: number
  notes: Note[]
  grid: GridConfig
  title: string
  tempo: number
  key: string
  kind: SlipKind
  tags: string[]
  copiedFromId: string | null
}

export const MIN_TEMPO = 1

export function createSlip(overrides?: Partial<Slip>): Slip {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    notes: [],
    grid: DEFAULT_GRID,
    title: 'Untitled slip',
    tempo: 120,
    key: '',
    kind: 'Phrase',
    tags: [],
    copiedFromId: null,
    ...overrides,
  }
}

export function copySlip(slip: Slip): Slip {
  return {
    ...slip,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    title: `Copy of ${slip.title}`,
    copiedFromId: slip.id,
  }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_TO_SHARP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' }

// Transposes only the root letter of a freeform key string ("E min" -> "G min"
// for +3 semitones); anything after the root (mode, extra text) passes through
// unchanged. An unparseable key (empty, or no recognized root) is a no-op.
export function transposeKey(key: string, semitones: number): string {
  const match = key.trim().match(/^([A-Ga-g])([#b]?)(.*)$/)
  if (!match) return key
  const [, letter, accidental, rest] = match
  const rawRoot = `${letter.toUpperCase()}${accidental}`
  const root = FLAT_TO_SHARP[rawRoot] ?? rawRoot
  const index = NOTE_NAMES.indexOf(root)
  if (index === -1) return key
  const transposedIndex = (((index + semitones) % 12) + 12) % 12
  return `${NOTE_NAMES[transposedIndex]}${rest}`
}

export interface CreateVariationInput {
  transposeSemitones: number
  keepLinked: boolean
}

// Reuses copySlip's shape (fresh id/createdAt, optional copiedFromId
// provenance) rather than adding a new "is this a variation" field to Slip.
export function createVariation(slip: Slip, input: CreateVariationInput, existingSlips: Slip[]): Slip {
  const notes = slip.notes.map((note) => ({
    ...note,
    pitch: clamp(snapToGrid(note.pitch + input.transposeSemitones), slip.grid.lowPitch, slip.grid.highPitch),
  }))
  const variationCount = existingSlips.filter((candidate) => candidate.copiedFromId === slip.id).length

  return {
    ...slip,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    notes,
    key: transposeKey(slip.key, input.transposeSemitones),
    title: `${slip.title} var. ${variationCount + 1}`,
    copiedFromId: input.keepLinked ? slip.id : null,
  }
}

export interface UpdateSlipMetadataInput {
  title?: string
  tempo?: number
  key?: string
  kind?: SlipKind
}

export function updateSlipMetadata(slip: Slip, input: UpdateSlipMetadataInput): Slip {
  return {
    ...slip,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.tempo !== undefined ? { tempo: Math.max(MIN_TEMPO, Math.round(input.tempo)) } : {}),
    ...(input.key !== undefined ? { key: input.key } : {}),
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
  }
}

export function resizeSlipGrid(slip: Slip, gridPatch: Partial<GridConfig>): Slip {
  const grid = { ...slip.grid, ...gridPatch }
  const outOfBoundsIds = new Set(notesOutOfGridBounds(slip.notes, grid).map((note) => note.id))

  return {
    ...slip,
    grid,
    notes: slip.notes.filter((note) => !outOfBoundsIds.has(note.id)),
  }
}

export function addTag(slip: Slip, tag: string): Slip {
  const trimmed = tag.trim()
  if (!trimmed || slip.tags.includes(trimmed)) return slip
  return { ...slip, tags: [...slip.tags, trimmed] }
}

export function removeTag(slip: Slip, tag: string): Slip {
  return { ...slip, tags: slip.tags.filter((existing) => existing !== tag) }
}

export interface SlipFilters {
  search: string
  tags: string[]
  kind: SlipKind | 'all'
  minTempo?: number
  maxTempo?: number
}

export function filterSlips(slips: Slip[], filters: SlipFilters): Slip[] {
  const search = filters.search.trim().toLowerCase()

  return slips.filter((slip) => {
    if (filters.kind !== 'all' && slip.kind !== filters.kind) return false
    if (!filters.tags.every((tag) => slip.tags.includes(tag))) return false
    if (search && !matchesSearch(slip, search)) return false
    if (filters.minTempo !== undefined && slip.tempo < filters.minTempo) return false
    if (filters.maxTempo !== undefined && slip.tempo > filters.maxTempo) return false
    return true
  })
}

function matchesSearch(slip: Slip, search: string): boolean {
  if (slip.title.toLowerCase().includes(search)) return true
  return slip.tags.some((tag) => tag.toLowerCase().includes(search))
}

export function formatSlipMeta(slip: Slip): string {
  return `${slip.tempo} BPM · ${slip.key} · ${slip.grid.bars} bars`
}
