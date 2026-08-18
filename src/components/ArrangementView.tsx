import { Download, Shuffle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  createArrangement,
  moveClip,
  placeClip,
  removeClip,
  renameTrack,
  resizeClipLoop,
  setClipSlip,
  toggleTrackMute,
  toggleTrackSolo,
  updateArrangementMetadata,
  type Arrangement,
  type Clip,
  type MoveClipInput,
  type PlaceClipInput,
  type ResizeClipLoopInput,
} from '../domain/arrangement'
import { generateSlipTitle } from '../domain/titleGenerator'
import { createVariation, type Slip, type SlipFilters } from '../domain/slip'
import { useAutosave } from '../hooks/useAutosave'
import { getArrangement, saveArrangement } from '../persistence/arrangementStorage'
import { listSlips, saveSlip } from '../persistence/slipStorage'
import { ArrangeSearchRail } from './ArrangeSearchRail'
import { ArrangementTimeline } from './ArrangementTimeline'
import { ConfirmDialog } from './ConfirmDialog'
import { VariationPopover, type VariationConfirmInput } from './VariationPopover'
import './ArrangementView.css'

const DEFAULT_FILTERS: SlipFilters = { search: '', tags: [], kind: 'all' }

export interface ArrangementViewProps {
  arrangementId: string
  onBack: () => void
  onArrangementChange: (state: { arrangement: Arrangement; slipsById: Map<string, Slip> }) => void
  onOpenVariationEditor: (slipId: string) => void
}

export function ArrangementView({ arrangementId, onBack, onArrangementChange, onOpenVariationEditor }: ArrangementViewProps) {
  const [arrangement, setArrangement] = useState(() => createArrangement({ id: arrangementId }))
  const [allSlips, setAllSlips] = useState<Slip[]>([])
  const [filters, setFilters] = useState<SlipFilters>(DEFAULT_FILTERS)
  const [draggingSlip, setDraggingSlip] = useState<Slip | null>(null)
  const [variationTarget, setVariationTarget] = useState<{ clip: Clip; sourceSlip: Slip } | null>(null)
  const [showBackConfirm, setShowBackConfirm] = useState(false)

  const { isPersisted, markSaved, cancelPending } = useAutosave(arrangement, arrangementId, {
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

  useEffect(() => {
    onArrangementChange({ arrangement, slipsById })
  }, [arrangement, slipsById, onArrangementChange])

  function handleMetadataChange(input: { name?: string; tempo?: number }) {
    setArrangement((current) => updateArrangementMetadata(current, input))
  }

  function handleRandomizeName() {
    handleMetadataChange({ name: generateSlipTitle(Math.random() * Number.MAX_SAFE_INTEGER) })
  }

  async function handleCreateArrangement() {
    try {
      await saveArrangement(arrangement)
    } catch (error) {
      console.error('Failed to create arrangement', error)
      return
    }
    markSaved()
  }

  function handleBackClick() {
    if (!isPersisted) {
      setShowBackConfirm(true)
      return
    }
    onBack()
  }

  function handleDiscardAndBack() {
    setShowBackConfirm(false)
    cancelPending()
    onBack()
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

  const handleOpenVariation = useCallback(
    (clip: Clip) => {
      const sourceSlip = slipsById.get(clip.slipId)
      if (!sourceSlip) return
      setVariationTarget({ clip, sourceSlip })
    },
    [slipsById],
  )

  async function createAndApplyVariation(
    input: VariationConfirmInput,
  ): Promise<{ variation: Slip; updatedArrangement: Arrangement } | null> {
    if (!variationTarget) return null
    const variation = createVariation(variationTarget.sourceSlip, input, allSlips)
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

  async function handleConfirmVariation(input: VariationConfirmInput) {
    await createAndApplyVariation(input)
    setVariationTarget(null)
  }

  async function handleOpenVariationInEditor(input: VariationConfirmInput) {
    const result = await createAndApplyVariation(input)
    setVariationTarget(null)
    if (!result) return

    // Navigating to the editor unmounts this component, which would cancel
    // the debounced autosave before it fires — flush the clip's slip-switch
    // immediately first, mirroring SlipEditor's own pre-navigate flush.
    cancelPending()
    try {
      await saveArrangement(result.updatedArrangement)
    } catch (error) {
      console.error('Failed to save arrangement', error)
    }
    onOpenVariationEditor(result.variation.id)
  }

  return (
    <div className="arrangement-view">
      <ArrangeSearchRail
        slips={allSlips}
        filters={filters}
        onFiltersChange={setFilters}
        onSlipDragStart={handleSlipDragStart}
      />
      <div className="arrangement-view-main">
        <div className="arrangement-view-header">
          <button type="button" className="btn btn-ghost arrangement-view-back" onClick={handleBackClick}>
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
              disabled
              title="Export mix is not available yet"
            >
              <Download size={14} />
              Export mix
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
          onRenameTrack={handleRenameTrack}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onOpenVariation={handleOpenVariation}
        />
      </div>
      {variationTarget && (
        <VariationPopover
          slip={variationTarget.sourceSlip}
          onConfirm={handleConfirmVariation}
          onOpenInEditor={handleOpenVariationInEditor}
          onClose={() => setVariationTarget(null)}
        />
      )}
      {showBackConfirm && (
        <ConfirmDialog
          title="Discard this arrangement?"
          onClose={() => setShowBackConfirm(false)}
          actions={[
            { label: 'Keep editing', variant: 'secondary', onClick: () => setShowBackConfirm(false) },
            { label: 'Discard', variant: 'danger', onClick: handleDiscardAndBack },
          ]}
        >
          This arrangement hasn't been created yet — going back will discard it.
        </ConfirmDialog>
      )}
    </div>
  )
}
