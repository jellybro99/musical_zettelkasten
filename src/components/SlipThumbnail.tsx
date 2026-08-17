import { totalSteps, type GridConfig, type Note } from '../domain/slip'
import './SlipThumbnail.css'

export interface SlipThumbnailProps {
  notes: Note[]
  grid: GridConfig
}

export function SlipThumbnail({ notes, grid }: SlipThumbnailProps) {
  const steps = totalSteps(grid)
  const pitchRange = grid.highPitch - grid.lowPitch + 1

  return (
    <div className="slip-thumbnail" aria-hidden="true">
      {notes.map((note) => (
        <span
          key={note.id}
          className="slip-thumbnail-note"
          style={{
            left: `${(note.start / steps) * 100}%`,
            width: `${(note.length / steps) * 100}%`,
            top: `${((grid.highPitch - note.pitch) / pitchRange) * 100}%`,
            height: `${(1 / pitchRange) * 100}%`,
          }}
        />
      ))}
    </div>
  )
}
