import { useCallback, useState } from 'react'
import { addTag, createSlip, removeTag, updateSlipMetadata, type Note, type UpdateSlipMetadataInput } from '../domain/slip'
import { MetadataPanel } from './MetadataPanel'
import { PianoRoll } from './PianoRoll'
import './SlipEditor.css'

export function SlipEditor() {
  const [slip, setSlip] = useState(() => createSlip())

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

  return (
    <div className="slip-editor">
      <MetadataPanel
        slip={slip}
        onMetadataChange={handleMetadataChange}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />
      <PianoRoll notes={slip.notes} grid={slip.grid} onNotesChange={handleNotesChange} />
    </div>
  )
}
