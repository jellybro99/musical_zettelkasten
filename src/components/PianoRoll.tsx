import { useState } from 'react'
import { DEFAULT_GRID, placeNote, totalSteps, type Note } from '../domain/slip'
import './PianoRoll.css'

const ROW_HEIGHT = 26
const COL_WIDTH = 22
const LABEL_WIDTH = 40

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function pitchName(pitch: number): string {
  return `${PITCH_CLASSES[pitch % 12]}${Math.floor(pitch / 12) - 1}`
}

function isBlackKey(pitch: number): boolean {
  return PITCH_CLASSES[pitch % 12].includes('#')
}

export function PianoRoll() {
  const [notes, setNotes] = useState<Note[]>([])
  const grid = DEFAULT_GRID
  const steps = totalSteps(grid)

  const pitches: number[] = []
  for (let pitch = grid.highPitch; pitch >= grid.lowPitch; pitch--) {
    pitches.push(pitch)
  }

  function handleCellClick(pitch: number, start: number) {
    setNotes((current) => placeNote(current, grid, { pitch, start }))
  }

  return (
    <div
      className="piano-roll"
      style={{ width: LABEL_WIDTH + steps * COL_WIDTH, height: pitches.length * ROW_HEIGHT }}
    >
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
              className={`piano-roll-cell${step % grid.stepsPerBar === 0 ? ' is-bar-start' : ''}${step % 4 === 0 ? ' is-beat-start' : ''}`}
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
          className="piano-roll-note"
          style={{
            top: (grid.highPitch - note.pitch) * ROW_HEIGHT + 2,
            left: LABEL_WIDTH + note.start * COL_WIDTH,
            width: note.length * COL_WIDTH - 2,
            height: ROW_HEIGHT - 4,
          }}
        />
      ))}
    </div>
  )
}
