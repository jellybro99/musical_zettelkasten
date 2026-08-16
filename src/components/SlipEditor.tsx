import { useCallback, useEffect, useState } from 'react'
import { addTag, createSlip, removeTag, updateSlipMetadata, type Note, type Slip, type UpdateSlipMetadataInput } from '../domain/slip'
import { useAutosave } from '../hooks/useAutosave'
import { deleteSlip, getSlip, saveSlip } from '../persistence/slipStorage'
import { MetadataPanel } from './MetadataPanel'
import { PianoRoll } from './PianoRoll'
import './SlipEditor.css'

export interface SlipEditorProps {
  slipId: string
  onBack: () => void
  onSlipChange: (slip: Slip) => void
}

export function SlipEditor({ slipId, onBack, onSlipChange }: SlipEditorProps) {
  const [slip, setSlip] = useState(() => createSlip({ id: slipId }))
  const { isPersisted, markSaved, cancelPending } = useAutosave(slip, slipId, {
    load: getSlip,
    save: saveSlip,
    onLoaded: setSlip,
  })

  useEffect(() => {
    onSlipChange(slip)
  }, [slip, onSlipChange])

  const handleNotesChange = useCallback((updater: (notes: Note[]) => Note[]) => {
    setSlip((current) => ({ ...current, notes: updater(current.notes) }))
  }, [])

  function handleMetadataChange(input: UpdateSlipMetadataInput) {
    setSlip((current) => updateSlipMetadata(current, input))
  }

  function handleAddTag(tag: string) {
    setSlip((current) => addTag(current, tag))
  }

  function handleRemoveTag(tag: string) {
    setSlip((current) => removeTag(current, tag))
  }

  async function handleSave() {
    try {
      await saveSlip(slip)
    } catch (error) {
      console.error('Failed to save slip', error)
      return
    }
    markSaved()
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
          isPersisted={isPersisted}
          onBack={onBack}
          onSave={handleSave}
          onDelete={handleDelete}
          onMetadataChange={handleMetadataChange}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
        <div className="slip-editor-roll">
          <PianoRoll notes={slip.notes} grid={slip.grid} onNotesChange={handleNotesChange} />
        </div>
      </div>
    </div>
  )
}
