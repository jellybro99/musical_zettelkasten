import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import {
  addTag,
  copySlip,
  createSlip,
  removeTag,
  resizeSlipGrid,
  updateSlipMetadata,
  type GridConfig,
  type Note,
  type Slip,
  type UpdateSlipMetadataInput,
} from '../domain/slip'
import { useAutosave } from '../hooks/useAutosave'
import { useAutosaveFlushGuard } from '../hooks/useAutosaveFlushGuard'
import { deleteSlip, getSlip, listSlips, saveSlip } from '../persistence/slipStorage'
import { parseReturnToArrangementId } from '../routing/returnTo'
import type { AppOutletContext } from './AppLayout'
import { ConfirmDialog } from './ConfirmDialog'
import { MetadataPanel } from './MetadataPanel'
import { PianoRoll } from './PianoRoll'
import './SlipEditor.css'

export interface SlipEditorProps {
  slipId: string
}

export function SlipEditor({ slipId }: SlipEditorProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { onSlipChange, onStopPlayback, onPreviewNote } = useOutletContext<AppOutletContext>()
  const isNewCapture = Boolean((location.state as { isNewCapture?: boolean } | null)?.isNewCapture)
  const returnArrangementId = parseReturnToArrangementId(searchParams)

  const [slip, setSlip] = useState(() => createSlip({ id: slipId }))
  const [allSlips, setAllSlips] = useState<Slip[]>([])
  const [previewEnabled, setPreviewEnabled] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { isLoaded, isPersisted, markSaved, cancelPending } = useAutosave(slip, slipId, {
    load: getSlip,
    save: saveSlip,
    onLoaded: setSlip,
  })

  function goBack() {
    if (returnArrangementId) {
      navigate(`/arrange/${returnArrangementId}`)
      return
    }
    navigate('/slips')
  }

  const { showDiscardConfirm, confirmDiscard, keepEditing, skipGuardRef } = useAutosaveFlushGuard({
    navigate,
    fallbackPath: '/slips',
    isLoaded,
    isPersisted,
    isNewCapture,
    cancelPending,
    persist: () => persistSlip(),
  })

  useEffect(() => {
    onSlipChange(slip)
  }, [slip, onSlipChange])

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
  }, [slipId])

  const handleNotesChange = useCallback((updater: (notes: Note[]) => Note[]) => {
    setSlip((current) => ({ ...current, notes: updater(current.notes) }))
  }, [])

  const handlePreviewNote = useCallback(
    (pitch: number, durationMs: number) => {
      if (previewEnabled) onPreviewNote(pitch, durationMs)
    },
    [previewEnabled, onPreviewNote],
  )

  function handleMetadataChange(input: UpdateSlipMetadataInput) {
    setSlip((current) => updateSlipMetadata(current, input))
  }

  function handleGridChange(gridPatch: Partial<GridConfig>) {
    setSlip((current) => resizeSlipGrid(current, gridPatch))
  }

  function handleAddTag(tag: string) {
    setSlip((current) => addTag(current, tag))
  }

  function handleRemoveTag(tag: string) {
    setSlip((current) => removeTag(current, tag))
  }

  async function persistSlip(): Promise<boolean> {
    try {
      await saveSlip(slip)
    } catch (error) {
      console.error('Failed to save slip', error)
      return false
    }
    markSaved()
    return true
  }

  function handleNavigateToSlip(targetSlipId: string) {
    onStopPlayback()
    navigate(`/slips/${targetSlipId}`)
  }

  async function handleSave() {
    await persistSlip()
  }

  async function handleCopy() {
    onStopPlayback()
    const copy = copySlip(slip)
    try {
      await saveSlip(copy)
    } catch (error) {
      console.error('Failed to copy slip', error)
      return
    }
    navigate(`/slips/${copy.id}`)
  }

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  async function confirmDelete() {
    setShowDeleteConfirm(false)
    cancelPending()
    skipGuardRef.current = true
    try {
      await deleteSlip(slipId)
    } catch (error) {
      console.error('Failed to delete slip', error)
      skipGuardRef.current = false
      return
    }
    goBack()
  }

  return (
    <div className="slip-editor-page">
      <div className="slip-editor">
        <MetadataPanel
          slip={slip}
          allSlips={allSlips}
          isPersisted={isPersisted}
          onBack={goBack}
          onSave={handleSave}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onMetadataChange={handleMetadataChange}
          onGridChange={handleGridChange}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onNavigateToSlip={handleNavigateToSlip}
        />
        <div className="slip-editor-roll-area">
          <div className="slip-editor-roll-card">
            <div className="slip-editor-roll">
              <PianoRoll
                notes={slip.notes}
                grid={slip.grid}
                tempo={slip.tempo}
                onNotesChange={handleNotesChange}
                onPreviewNote={handlePreviewNote}
                previewEnabled={previewEnabled}
                onTogglePreview={() => setPreviewEnabled((current) => !current)}
              />
            </div>
          </div>
        </div>
      </div>
      {showDeleteConfirm && (
        <ConfirmDialog
          title={`Delete "${slip.title}"?`}
          onClose={() => setShowDeleteConfirm(false)}
          actions={[
            { label: 'Cancel', variant: 'secondary', onClick: () => setShowDeleteConfirm(false) },
            { label: 'Delete', variant: 'danger', onClick: confirmDelete },
          ]}
        >
          This cannot be undone.
        </ConfirmDialog>
      )}
      {showDiscardConfirm && (
        <ConfirmDialog
          title="Discard this slip?"
          onClose={keepEditing}
          actions={[
            { label: 'Keep editing', variant: 'secondary', onClick: keepEditing },
            { label: 'Discard', variant: 'danger', onClick: confirmDiscard },
          ]}
        >
          This slip hasn't been created yet — going back will discard it.
        </ConfirmDialog>
      )}
    </div>
  )
}
