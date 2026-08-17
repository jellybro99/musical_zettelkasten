import { useEffect, useRef, useState } from 'react'
import { deleteNote, moveNote, placeNote, resizeNote, totalSteps, type GridConfig, type Note } from '../domain/slip'
import './PianoRoll.css'

const ROW_HEIGHT = 26
const COL_WIDTH = 22
const LABEL_WIDTH = 56
const RULER_HEIGHT = 24

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function pitchName(pitch: number): string {
  return `${PITCH_CLASSES[pitch % 12]}${Math.floor(pitch / 12) - 1}`
}

function isBlackKey(pitch: number): boolean {
  return PITCH_CLASSES[pitch % 12].includes('#')
}

function stepLineClass(step: number, grid: GridConfig): string {
  if (step % grid.stepsPerBar === 0) return 'line-bar'
  if (step % 4 === 0) return 'line-beat'
  return 'line-minor'
}

type DragState =
  | { type: 'move'; id: string; startX: number; startY: number; origPitch: number; origStart: number }
  | { type: 'resize'; id: string; startX: number; origLength: number }

export interface PianoRollProps {
  notes: Note[]
  grid: GridConfig
  onNotesChange: (updater: (notes: Note[]) => Note[]) => void
}

export function PianoRoll({ notes, grid, onNotesChange }: PianoRollProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dragState = useRef<DragState | null>(null)
  const steps = totalSteps(grid)

  const pitches: number[] = []
  for (let pitch = grid.highPitch; pitch >= grid.lowPitch; pitch--) {
    pitches.push(pitch)
  }

  function handleCellClick(pitch: number, start: number) {
    onNotesChange((current) => placeNote(current, grid, { pitch, start }))
  }

  function handleNoteMouseDown(event: React.MouseEvent, note: Note) {
    event.stopPropagation()
    setSelectedId(note.id)
    dragState.current = {
      type: 'move',
      id: note.id,
      startX: event.clientX,
      startY: event.clientY,
      origPitch: note.pitch,
      origStart: note.start,
    }
  }

  function handleResizeHandleMouseDown(event: React.MouseEvent, note: Note) {
    event.stopPropagation()
    setSelectedId(note.id)
    dragState.current = { type: 'resize', id: note.id, startX: event.clientX, origLength: note.length }
  }

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const drag = dragState.current
      if (!drag) return

      if (drag.type === 'move') {
        const deltaStart = Math.round((event.clientX - drag.startX) / COL_WIDTH)
        const deltaPitch = -Math.round((event.clientY - drag.startY) / ROW_HEIGHT)
        onNotesChange((current) =>
          moveNote(current, grid, {
            id: drag.id,
            pitch: drag.origPitch + deltaPitch,
            start: drag.origStart + deltaStart,
          }),
        )
      } else {
        const deltaLength = Math.round((event.clientX - drag.startX) / COL_WIDTH)
        onNotesChange((current) =>
          resizeNote(current, grid, { id: drag.id, length: drag.origLength + deltaLength }),
        )
      }
    }

    function handleMouseUp() {
      dragState.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [grid, onNotesChange])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!selectedId) return
      if (event.key !== 'Delete' && event.key !== 'Backspace') return

      event.preventDefault()
      onNotesChange((current) => deleteNote(current, selectedId))
      setSelectedId(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, onNotesChange])

  const rollWidth = LABEL_WIDTH + steps * COL_WIDTH

  return (
    <>
      <div className="piano-roll-ruler" style={{ width: rollWidth, height: RULER_HEIGHT }}>
        {Array.from({ length: grid.bars }, (_, bar) => (
          <span
            key={bar}
            className="piano-roll-ruler-number"
            style={{ left: LABEL_WIDTH + bar * grid.stepsPerBar * COL_WIDTH }}
          >
            {bar + 1}
          </span>
        ))}
      </div>
      <div className="piano-roll" style={{ width: rollWidth, height: pitches.length * ROW_HEIGHT }}>
        {pitches.map((pitch, rowIndex) => (
          <div
            key={pitch}
            className={`piano-roll-row${isBlackKey(pitch) ? ' is-black' : ''}`}
            style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
          >
            <span className="piano-roll-row-label" style={{ width: LABEL_WIDTH }}>
              {pitchName(pitch)}
            </span>
            {Array.from({ length: steps }, (_, step) => (
              <button
                key={step}
                type="button"
                className={`piano-roll-cell ${stepLineClass(step, grid)}${step === steps - 1 ? ' line-end' : ''}`}
                style={{ left: LABEL_WIDTH + step * COL_WIDTH, width: COL_WIDTH, height: ROW_HEIGHT }}
                onClick={() => handleCellClick(pitch, step)}
                aria-label={`Place note at ${pitchName(pitch)}, step ${step + 1}`}
              />
            ))}
          </div>
        ))}
        {notes.map((note) => (
          <div
            key={note.id}
            className={`piano-roll-note${note.id === selectedId ? ' is-selected' : ''}`}
            style={{
              top: (grid.highPitch - note.pitch) * ROW_HEIGHT + 2,
              left: LABEL_WIDTH + note.start * COL_WIDTH + 2,
              width: note.length * COL_WIDTH - 4,
              height: ROW_HEIGHT - 4,
            }}
            onMouseDown={(event) => handleNoteMouseDown(event, note)}
          >
            <div
              className="piano-roll-note-handle"
              onMouseDown={(event) => handleResizeHandleMouseDown(event, note)}
            />
          </div>
        ))}
      </div>
    </>
  )
}
