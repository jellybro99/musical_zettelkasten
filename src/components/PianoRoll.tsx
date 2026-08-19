import { Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { computePlaybackDurationMs } from '../domain/playback'
import { deleteNote, moveNote, placeNote, resizeNote, totalSteps, type GridConfig, type Note } from '../domain/slip'
import { usePointerDrag } from '../hooks/usePointerDrag'
import './PianoRoll.css'

const ROW_HEIGHT = 26
const COL_WIDTH = 22
const LABEL_WIDTH = 64
const RULER_HEIGHT = 24

// Key-rail auditioning is a quick blip independent of tempo/grid, not tied to any note length.
const KEY_RAIL_PREVIEW_DURATION_MS = 180

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

export interface PianoRollProps {
  notes: Note[]
  grid: GridConfig
  tempo: number
  onNotesChange: (updater: (notes: Note[]) => Note[]) => void
  onPreviewNote: (pitch: number, durationMs: number) => void
  previewEnabled: boolean
  onTogglePreview: () => void
}

export function PianoRoll({
  notes,
  grid,
  tempo,
  onNotesChange,
  onPreviewNote,
  previewEnabled,
  onTogglePreview,
}: PianoRollProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { startDrag } = usePointerDrag()
  const steps = totalSteps(grid)

  const pitches: number[] = []
  for (let pitch = grid.highPitch; pitch >= grid.lowPitch; pitch--) {
    pitches.push(pitch)
  }

  function handleCellClick(pitch: number, start: number) {
    const preview = placeNote(notes, grid, { pitch, start })
    if (preview.length !== notes.length) {
      const created = preview[preview.length - 1]
      onPreviewNote(created.pitch, computePlaybackDurationMs(tempo, created.length))
    }
    onNotesChange((current) => placeNote(current, grid, { pitch, start }))
  }

  function handleNoteMouseDown(event: React.MouseEvent, note: Note) {
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(note.id)
    const noteId = note.id
    const origPitch = note.pitch
    const origStart = note.start
    let lastPreviewedPitch = note.pitch
    startDrag(event, (dx, dy) => {
      const deltaStart = Math.round(dx / COL_WIDTH)
      const deltaPitch = -Math.round(dy / ROW_HEIGHT)
      const targetPitch = origPitch + deltaPitch
      onNotesChange((current) =>
        moveNote(current, grid, {
          id: noteId,
          pitch: targetPitch,
          start: origStart + deltaStart,
        }),
      )

      const clampedPitch = Math.min(grid.highPitch, Math.max(grid.lowPitch, targetPitch))
      if (clampedPitch !== lastPreviewedPitch) {
        lastPreviewedPitch = clampedPitch
        onPreviewNote(clampedPitch, KEY_RAIL_PREVIEW_DURATION_MS)
      }
    })
    onPreviewNote(note.pitch, KEY_RAIL_PREVIEW_DURATION_MS)
  }

  function handleRowLabelClick(pitch: number) {
    onPreviewNote(pitch, KEY_RAIL_PREVIEW_DURATION_MS)
  }

  function handleResizeHandleMouseDown(event: React.MouseEvent, note: Note) {
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(note.id)
    const noteId = note.id
    const origLength = note.length
    startDrag(event, (dx) => {
      const deltaLength = Math.round(dx / COL_WIDTH)
      onNotesChange((current) => resizeNote(current, grid, { id: noteId, length: origLength + deltaLength }))
    })
  }

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
        <button
          type="button"
          className="piano-roll-preview-toggle"
          style={{ width: LABEL_WIDTH, height: RULER_HEIGHT }}
          onClick={onTogglePreview}
          aria-pressed={previewEnabled}
          aria-label={previewEnabled ? 'Mute note preview' : 'Unmute note preview'}
          title={previewEnabled ? 'Mute note preview' : 'Unmute note preview'}
        >
          {previewEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>
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
            <span
              className="piano-roll-row-label"
              style={{ width: LABEL_WIDTH }}
              onClick={() => handleRowLabelClick(pitch)}
            >
              {pitchName(pitch)}
            </span>
            {Array.from({ length: steps }, (_, step) => (
              <button
                key={step}
                type="button"
                className={`piano-roll-cell ${step === 0 ? '' : stepLineClass(step, grid)}`}
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
