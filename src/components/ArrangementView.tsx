import { Download, Shuffle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import {
  addTrack,
  createArrangement,
  moveClip,
  placeClip,
  removeClip,
  removeTrack,
  renameTrack,
  resizeClipLoop,
  setClipSlip,
  setClipTranspose,
  setTrackVolume,
  toggleTrackMute,
  toggleTrackSolo,
  updateArrangementMetadata,
  type Arrangement,
  type Clip,
  type MoveClipInput,
  type PlaceClipInput,
  type ResizeClipLoopInput,
} from '../domain/arrangement'
import { arrangementMidiFilename, arrangementToMidiBytes } from '../domain/midiExport'
import { generateSlipTitle } from '../domain/titleGenerator'
import { createVariation, type Slip, type SlipFilters } from '../domain/slip'
import { useAutosave } from '../hooks/useAutosave'
import { useAutosaveFlushGuard } from '../hooks/useAutosaveFlushGuard'
import { getArrangement, saveArrangement } from '../persistence/arrangementStorage'
import { listSlips, saveSlip } from '../persistence/slipStorage'
import { returnToArrangementParam } from '../routing/returnTo'
import { filtersToSearchParams, searchParamsToFilters } from '../routing/slipFilterParams'
import type { AppOutletContext } from './AppLayout'
import { ArrangeSearchRail } from './ArrangeSearchRail'
import { ArrangementTimeline } from './ArrangementTimeline'
import { ConfirmDialog } from './ConfirmDialog'
import { VariationPopover } from './VariationPopover'
import './ArrangementView.css'

export interface ArrangementViewProps {
  arrangementId: string
}

export function ArrangementView({ arrangementId }: ArrangementViewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { onArrangementChange, onStopPlayback, playingSlipId, onTogglePlaySlip } = useOutletContext<AppOutletContext>()
  const isNewCapture = Boolean((location.state as { isNewCapture?: boolean } | null)?.isNewCapture)
  const [arrangement, setArrangement] = useState(() => createArrangement({ id: arrangementId }))
  const [allSlips, setAllSlips] = useState<Slip[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => searchParamsToFilters(searchParams), [searchParams])
  const [draggingSlip, setDraggingSlip] = useState<Slip | null>(null)
  const [variationTarget, setVariationTarget] = useState<{ clip: Clip; sourceSlip: Slip } | null>(null)

  const { isLoaded, isPersisted, markSaved, cancelPending } = useAutosave(arrangement, arrangementId, {
    load: getArrangement,
    save: saveArrangement,
    onLoaded: setArrangement,
  })

  const { showDiscardConfirm, confirmDiscard, keepEditing } = useAutosaveFlushGuard({
    navigate,
    fallbackPath: '/arrange',
    isLoaded,
    isPersisted,
    isNewCapture,
    cancelPending,
    persist: () => persistArrangement(),
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

  useEffect(() => {
    onArrangementChange({ arrangement, slipsById })
  }, [arrangement, slipsById, onArrangementChange])

  function handleMetadataChange(input: { name?: string; tempo?: number }) {
    setArrangement((current) => updateArrangementMetadata(current, input))
  }

  function handleFiltersChange(next: SlipFilters) {
    setSearchParams(filtersToSearchParams(next), { replace: true })
  }

  function handleRandomizeName() {
    handleMetadataChange({ name: generateSlipTitle(Math.random() * Number.MAX_SAFE_INTEGER) })
  }

  async function persistArrangement(): Promise<boolean> {
    try {
      await saveArrangement(arrangement)
    } catch (error) {
      console.error('Failed to save arrangement', error)
      return false
    }
    markSaved()
    return true
  }

  async function handleCreateArrangement() {
    await persistArrangement()
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

  const handleRemoveTrack = useCallback((trackId: string) => {
    setArrangement((current) => removeTrack(current, trackId))
  }, [])

  const handleAddTrack = useCallback(() => {
    setArrangement((current) => addTrack(current))
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

  const handleSetTrackVolume = useCallback((trackId: string, volume: number) => {
    setArrangement((current) => setTrackVolume(current, trackId, volume))
  }, [])

  function handleExportMidi() {
    const bytes = arrangementToMidiBytes(arrangement, slipsById)
    const blob = new Blob([bytes], { type: 'audio/midi' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = arrangementMidiFilename(arrangement)
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenVariation = useCallback(
    (clip: Clip) => {
      const sourceSlip = slipsById.get(clip.slipId)
      if (!sourceSlip) return
      setVariationTarget({ clip, sourceSlip })
    },
    [slipsById],
  )

  const handleOpenSlip = useCallback(
    (slipId: string) => {
      onStopPlayback()
      navigate(`/slips/${slipId}?from=${returnToArrangementParam(arrangementId)}`)
    },
    [onStopPlayback, navigate, arrangementId],
  )

  async function createAndApplyVariation(
    transposeSemitones: number,
  ): Promise<{ variation: Slip; updatedArrangement: Arrangement } | null> {
    if (!variationTarget) return null
    const variation = createVariation(variationTarget.sourceSlip, { transposeSemitones }, allSlips)
    try {
      await saveSlip(variation)
    } catch (error) {
      console.error('Failed to create variation', error)
      return null
    }
    const updatedArrangement = setClipSlip(arrangement, { clipId: variationTarget.clip.id, slipId: variation.id })
    setAllSlips((current) => [...current, variation])
    setArrangement(updatedArrangement)
    return { variation, updatedArrangement }
  }

  async function handleConfirmVariation(transposeSemitones: number) {
    const result = await createAndApplyVariation(transposeSemitones)
    setVariationTarget(null)
    if (!result) return

    // The navigation guard flushes this screen's pending edit (the clip's
    // slip-switch, already reflected in `arrangement` state above) before
    // the navigation proceeds — same seam as every other exit path.
    navigate(`/slips/${result.variation.id}?from=${returnToArrangementParam(arrangementId)}`)
  }

  const handleLiveTranspose = useCallback(
    (semitones: number) => {
      if (!variationTarget) return
      setArrangement((current) => setClipTranspose(current, { clipId: variationTarget.clip.id, semitones }))
    },
    [variationTarget],
  )

  return (
    <div className="arrangement-view">
      <ArrangeSearchRail
        slips={allSlips}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSlipDragStart={handleSlipDragStart}
        playingSlipId={playingSlipId}
        onTogglePlaySlip={onTogglePlaySlip}
        onOpenSlip={handleOpenSlip}
      />
      <div className="arrangement-view-main">
        <div className="arrangement-view-header">
          <button type="button" className="btn btn-ghost arrangement-view-back" onClick={() => navigate('/arrange')}>
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
          <div className="arrangement-view-tempo">
            <input
              id="arrangement-tempo"
              type="number"
              min={1}
              className="input arrangement-view-tempo-input"
              value={arrangement.tempo}
              onChange={(event) => handleMetadataChange({ tempo: Number(event.target.value) })}
              aria-label="Tempo (BPM)"
            />
            <span className="arrangement-view-tempo-suffix">BPM</span>
          </div>
          <div className="arrangement-view-header-actions">
            {!isPersisted && (
              <button type="button" className="btn btn-primary" onClick={handleCreateArrangement}>
                Create
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary arrangement-view-export"
              onClick={handleExportMidi}
              disabled={arrangement.tracks.length === 0}
              title="Export as a .mid file"
            >
              <Download size={14} />
              Export MIDI
            </button>
          </div>
        </div>
        <ArrangementTimeline
          arrangement={arrangement}
          slipsById={slipsById}
          draggingSlip={draggingSlip}
          onPlaceClip={handlePlaceClip}
          onDragEnd={handleDragEnd}
          onMoveClip={handleMoveClip}
          onResizeClipLoop={handleResizeClipLoop}
          onRemoveClip={handleRemoveClip}
          onRemoveTrack={handleRemoveTrack}
          onAddTrack={handleAddTrack}
          onRenameTrack={handleRenameTrack}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onSetTrackVolume={handleSetTrackVolume}
          onOpenVariation={handleOpenVariation}
          onOpenSlip={(clip) => handleOpenSlip(clip.slipId)}
        />
      </div>
      {variationTarget && (
        <VariationPopover
          slip={variationTarget.sourceSlip}
          initialTransposeSemitones={variationTarget.clip.transposeSemitones ?? 0}
          onConfirm={handleConfirmVariation}
          onLiveTranspose={handleLiveTranspose}
          onClose={() => setVariationTarget(null)}
        />
      )}
      {showDiscardConfirm && (
        <ConfirmDialog
          title="Discard this arrangement?"
          onClose={keepEditing}
          actions={[
            { label: 'Keep editing', variant: 'secondary', onClick: keepEditing },
            { label: 'Discard', variant: 'danger', onClick: confirmDiscard },
          ]}
        >
          This arrangement hasn't been created yet — going back will discard it.
        </ConfirmDialog>
      )}
    </div>
  )
}
