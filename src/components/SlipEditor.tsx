import { Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { addTag, createSlip, removeTag, updateSlipMetadata, type Note, type Slip, type UpdateSlipMetadataInput } from '../domain/slip'
import { deleteSlip, getSlip, saveSlip } from '../persistence/slipStorage'
import { MetadataPanel } from './MetadataPanel'
import { PianoRoll } from './PianoRoll'
import './SlipEditor.css'

const AUTOSAVE_DELAY_MS = 400

export interface SlipEditorProps {
  slipId: string
  onBack: () => void
  onPlay: (slip: Slip) => void
  onRegisterPlay: (play: (() => void) | null) => void
}

export function SlipEditor({ slipId, onBack, onPlay, onRegisterPlay }: SlipEditorProps) {
  const [slip, setSlip] = useState(() => createSlip({ id: slipId }))
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPersisted, setIsPersisted] = useState(false)
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pristineJsonRef = useRef<string | null>(null)
  if (pristineJsonRef.current === null) pristineJsonRef.current = JSON.stringify(slip)

  useEffect(() => {
    onRegisterPlay(() => onPlay(slip))
    return () => onRegisterPlay(null)
  }, [slip, onPlay, onRegisterPlay])

  useEffect(() => {
    let cancelled = false
    getSlip(slipId)
      .then((saved) => {
        if (cancelled) return
        if (saved) {
          setSlip(saved)
          pristineJsonRef.current = JSON.stringify(saved)
          setIsPersisted(true)
        }
      })
      .catch((error) => {
        console.error('Failed to load saved slip', error)
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [slipId])

  useEffect(() => {
    if (!isLoaded || !isPersisted) return
    if (JSON.stringify(slip) === pristineJsonRef.current) return
    const timeout = setTimeout(() => {
      saveSlip(slip).catch((error) => {
        console.error('Failed to autosave slip', error)
      })
    }, AUTOSAVE_DELAY_MS)
    autosaveTimeoutRef.current = timeout
    return () => clearTimeout(timeout)
  }, [slip, isLoaded, isPersisted])

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
    pristineJsonRef.current = JSON.stringify(slip)
    setIsPersisted(true)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${slip.title}"? This cannot be undone.`)) return
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
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
      <div className="slip-editor-transport">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Slip-box
        </button>
        <div className="slip-editor-transport-actions">
          {!isPersisted && (
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <Save size={14} />
              Save
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={handleDelete}>
            <Trash2 size={14} />
            Delete slip
          </button>
        </div>
      </div>
      <div className="slip-editor">
        <MetadataPanel
          slip={slip}
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
