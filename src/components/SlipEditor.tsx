import { useCallback, useEffect, useState } from 'react'
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
import { deleteSlip, getSlip, listSlips, saveSlip } from '../persistence/slipStorage'
import { MetadataPanel } from './MetadataPanel'
import { PianoRoll } from './PianoRoll'
import './SlipEditor.css'

export interface SlipEditorProps {
  slipId: string
  onBack: () => void
  onSlipChange: (slip: Slip) => void
  onStopPlayback: () => void
  onPreviewNote: (pitch: number, durationMs: number) => void
  onNavigateToSlip: (currentSlipId: string, targetSlipId: string) => void
  onCopySlip: (newSlipId: string) => void
}

export function SlipEditor({
  slipId,
  onBack,
  onSlipChange,
  onStopPlayback,
  onPreviewNote,
  onNavigateToSlip,
  onCopySlip,
}: SlipEditorProps) {
  const [slip, setSlip] = useState(() => createSlip({ id: slipId }))
  const [allSlips, setAllSlips] = useState<Slip[]>([])
  const [previewEnabled, setPreviewEnabled] = useState(false)
  const { isPersisted, markSaved, cancelPending } = useAutosave(slip, slipId, {
    load: getSlip,
    save: saveSlip,
    onLoaded: setSlip,
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

  async function handleNavigateToSlip(targetSlipId: string) {
    onStopPlayback()
    if (isPersisted) {
      cancelPending()
      const saved = await persistSlip()
      if (!saved) return
    }
    onNavigateToSlip(slipId, targetSlipId)
  }

  async function handleSave() {
    await persistSlip()
  }

  async function handleCopy() {
    onStopPlayback()
    if (isPersisted) {
      cancelPending()
      const saved = await persistSlip()
      if (!saved) return
    }
    const copy = copySlip(slip)
    try {
      await saveSlip(copy)
    } catch (error) {
      console.error('Failed to copy slip', error)
      return
    }
    onCopySlip(copy.id)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${slip.title}"? This cannot be undone.`)) return
    cancelPending()
    try {
      await deleteSlip(slipId)
    } catch (error) {
      console.error('Failed to delete slip', error)
      return
    }
    onBack()
  }

  return (
    <div className="slip-editor-page">
      <div className="slip-editor">
        <MetadataPanel
          slip={slip}
          allSlips={allSlips}
          isPersisted={isPersisted}
          onBack={onBack}
          onSave={handleSave}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onMetadataChange={handleMetadataChange}
          onGridChange={handleGridChange}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onNavigateToSlip={handleNavigateToSlip}
        />
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
  )
}
