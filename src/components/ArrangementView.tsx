import { Shuffle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  createArrangement,
  moveClip,
  placeClip,
  removeClip,
  renameTrack,
  resizeClipLoop,
  toggleTrackMute,
  toggleTrackSolo,
  updateArrangementMetadata,
  type MoveClipInput,
  type PlaceClipInput,
  type ResizeClipLoopInput,
} from '../domain/arrangement'
import { generateSlipTitle } from '../domain/titleGenerator'
import type { Slip, SlipFilters } from '../domain/slip'
import { useAutosave } from '../hooks/useAutosave'
import { getArrangement, saveArrangement } from '../persistence/arrangementStorage'
import { listSlips } from '../persistence/slipStorage'
import { ArrangeSearchRail } from './ArrangeSearchRail'
import { ArrangementTimeline } from './ArrangementTimeline'
import './ArrangementView.css'

const DEFAULT_FILTERS: SlipFilters = { search: '', tags: [], kind: 'all' }

export interface ArrangementViewProps {
  arrangementId: string
  onBack: () => void
}

export function ArrangementView({ arrangementId, onBack }: ArrangementViewProps) {
  const [arrangement, setArrangement] = useState(() => createArrangement({ id: arrangementId }))
  const [allSlips, setAllSlips] = useState<Slip[]>([])
  const [filters, setFilters] = useState<SlipFilters>(DEFAULT_FILTERS)
  const [draggingSlip, setDraggingSlip] = useState<Slip | null>(null)

  useAutosave(arrangement, arrangementId, {
    load: getArrangement,
    save: saveArrangement,
    onLoaded: setArrangement,
  })

  useEffect(() => {
    let cancelled = false
    listSlips()
      .then((loaded) => {
        if (!cancelled) setAllSlips(loaded)
      })
      .catch((error) => {
        console.error('Failed to load slips', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const slipsById = useMemo(() => new Map(allSlips.map((slip) => [slip.id, slip])), [allSlips])

  function handleMetadataChange(input: { name?: string; tempo?: number }) {
    setArrangement((current) => updateArrangementMetadata(current, input))
  }

  function handleRandomizeName() {
    handleMetadataChange({ name: generateSlipTitle(Math.random() * Number.MAX_SAFE_INTEGER) })
  }

  function handleSlipDragStart(event: MouseEvent, slip: Slip) {
    event.preventDefault()
    setDraggingSlip(slip)
  }

  const handlePlaceClip = useCallback((input: PlaceClipInput) => {
    setArrangement((current) => placeClip(current, input))
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingSlip(null)
  }, [])

  const handleMoveClip = useCallback((input: MoveClipInput) => {
    setArrangement((current) => moveClip(current, input))
  }, [])

  const handleResizeClipLoop = useCallback((input: ResizeClipLoopInput) => {
    setArrangement((current) => resizeClipLoop(current, input))
  }, [])

  const handleRemoveClip = useCallback((clipId: string) => {
    setArrangement((current) => removeClip(current, clipId))
  }, [])

  const handleRenameTrack = useCallback((trackId: string, name: string) => {
    setArrangement((current) => renameTrack(current, trackId, name))
  }, [])

  const handleToggleMute = useCallback((trackId: string) => {
    setArrangement((current) => toggleTrackMute(current, trackId))
  }, [])

  const handleToggleSolo = useCallback((trackId: string) => {
    setArrangement((current) => toggleTrackSolo(current, trackId))
  }, [])

  return (
    <div className="arrangement-view">
      <div className="arrangement-view-header">
        <button type="button" className="btn btn-ghost arrangement-view-back" onClick={onBack}>
          ← Back
        </button>
        <div className="arrangement-view-title-row">
          <input
            type="text"
            className="input arrangement-view-title"
            value={arrangement.name}
            onChange={(event) => handleMetadataChange({ name: event.target.value })}
            aria-label="Arrangement name"
          />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={handleRandomizeName}
            aria-label="Randomize name"
          >
            <Shuffle size={14} />
          </button>
        </div>
        <div className="field arrangement-view-tempo">
          <label htmlFor="arrangement-tempo">Tempo (BPM)</label>
          <input
            id="arrangement-tempo"
            type="number"
            min={1}
            className="input"
            value={arrangement.tempo}
            onChange={(event) => handleMetadataChange({ tempo: Number(event.target.value) })}
          />
        </div>
      </div>
      <div className="arrangement-view-body">
        <ArrangeSearchRail
          slips={allSlips}
          filters={filters}
          onFiltersChange={setFilters}
          onSlipDragStart={handleSlipDragStart}
        />
        <ArrangementTimeline
          arrangement={arrangement}
          slipsById={slipsById}
          draggingSlip={draggingSlip}
          onPlaceClip={handlePlaceClip}
          onDragEnd={handleDragEnd}
          onMoveClip={handleMoveClip}
          onResizeClipLoop={handleResizeClipLoop}
          onRemoveClip={handleRemoveClip}
          onRenameTrack={handleRenameTrack}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
        />
      </div>
    </div>
  )
}
