import { useCallback, useEffect, useState } from 'react'
import {
  addReference,
  addTag,
  createSlip,
  removeReference,
  removeTag,
  updateSlipMetadata,
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
}

export function SlipEditor({ slipId, onBack, onSlipChange }: SlipEditorProps) {
  const [slip, setSlip] = useState(() => createSlip({ id: slipId }))
  const [allSlips, setAllSlips] = useState<Slip[]>([])
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
  }, [])

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

  function handleAddReference(referencedSlipId: string) {
    setSlip((current) => addReference(current, allSlips, referencedSlipId))
  }

  function handleRemoveReference(referencedSlipId: string) {
    setSlip((current) => removeReference(current, referencedSlipId))
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
          allSlips={allSlips}
          isPersisted={isPersisted}
          onBack={onBack}
          onSave={handleSave}
          onDelete={handleDelete}
          onMetadataChange={handleMetadataChange}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onAddReference={handleAddReference}
          onRemoveReference={handleRemoveReference}
        />
        <div className="slip-editor-roll">
          <PianoRoll notes={slip.notes} grid={slip.grid} onNotesChange={handleNotesChange} />
        </div>
      </div>
    </div>
  )
}
