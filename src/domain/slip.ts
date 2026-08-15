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

function updateNote(notes: Note[], id: string, update: (note: Note) => Note): Note[] {
  const target = notes.find((note) => note.id === id)
  if (!target) return notes

  const updated = update(target)
  const collides = notes.some((note) => note.id !== target.id && overlaps(updated, note))
  if (collides) return notes

  return notes.map((note) => (note.id === target.id ? updated : note))
}

export interface MoveNoteInput {
  id: string
  pitch: number
  start: number
}

export function moveNote(notes: Note[], grid: GridConfig, input: MoveNoteInput): Note[] {
  return updateNote(notes, input.id, (note) => ({
    ...note,
    pitch: clamp(snapToGrid(input.pitch), grid.lowPitch, grid.highPitch),
    start: clamp(snapToGrid(input.start), 0, totalSteps(grid) - note.length),
  }))
}

export interface ResizeNoteInput {
  id: string
  length: number
}

export function resizeNote(notes: Note[], grid: GridConfig, input: ResizeNoteInput): Note[] {
  return updateNote(notes, input.id, (note) => ({
    ...note,
    length: clamp(snapToGrid(input.length), MIN_NOTE_LENGTH, totalSteps(grid) - note.start),
  }))
}

export function deleteNote(notes: Note[], id: string): Note[] {
  return notes.filter((note) => note.id !== id)
}
