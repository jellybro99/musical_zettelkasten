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

function clamp(value: number, min: number, max: number): number {
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

export const SLIP_KINDS = ['Loop', 'One-shot', 'Phrase', 'Texture'] as const

export type SlipKind = (typeof SLIP_KINDS)[number]

export interface Slip {
  notes: Note[]
  grid: GridConfig
  title: string
  tempo: number
  key: string
  kind: SlipKind
  tags: string[]
}

const MIN_TEMPO = 1

export function createSlip(overrides?: Partial<Slip>): Slip {
  return {
    notes: [],
    grid: DEFAULT_GRID,
    title: 'Untitled slip',
    tempo: 120,
    key: '',
    kind: 'Phrase',
    tags: [],
    ...overrides,
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

export function addTag(slip: Slip, tag: string): Slip {
  const trimmed = tag.trim()
  if (!trimmed || slip.tags.includes(trimmed)) return slip
  return { ...slip, tags: [...slip.tags, trimmed] }
}

export function removeTag(slip: Slip, tag: string): Slip {
  return { ...slip, tags: slip.tags.filter((existing) => existing !== tag) }
}
