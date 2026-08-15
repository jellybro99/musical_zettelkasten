import { useCallback, useEffect, useRef, useState } from 'react'
import { createPlaybackEngine, type PlaybackEngine } from '../audio/playbackEngine'
import { addTag, createSlip, removeTag, updateSlipMetadata, type Note, type UpdateSlipMetadataInput } from '../domain/slip'
import { getSlip, saveSlip } from '../persistence/slipStorage'
import { MetadataPanel } from './MetadataPanel'
import { PianoRoll } from './PianoRoll'
import './SlipEditor.css'

const AUTOSAVE_DELAY_MS = 400

export interface SlipEditorProps {
  slipId: string
  onBack: () => void
}

export function SlipEditor({ slipId, onBack }: SlipEditorProps) {
  const [slip, setSlip] = useState(() => createSlip({ id: slipId }))
  const [isLoaded, setIsLoaded] = useState(false)
  const engineRef = useRef<PlaybackEngine | null>(null)

  useEffect(() => {
    return () => engineRef.current?.stop()
  }, [])

  useEffect(() => {
    let cancelled = false
    getSlip(slipId)
      .then((saved) => {
        if (cancelled) return
        if (saved) setSlip(saved)
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
    if (!isLoaded) return
    const timeout = setTimeout(() => {
      saveSlip(slip).catch((error) => {
        console.error('Failed to autosave slip', error)
      })
    }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [slip, isLoaded])

  function getEngine(): PlaybackEngine {
    if (!engineRef.current) engineRef.current = createPlaybackEngine()
    return engineRef.current
  }

  function handlePlay() {
    getEngine().play(slip.notes, slip.tempo)
  }

  function handleStop() {
    engineRef.current?.stop()
  }

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
    <div className="slip-editor-page">
      <div className="slip-editor-transport">
        <button type="button" className="slip-editor-transport-button" onClick={onBack}>
          ← Slip-box
        </button>
        <button type="button" className="slip-editor-transport-button" onClick={handlePlay}>
          Play
        </button>
        <button type="button" className="slip-editor-transport-button" onClick={handleStop}>
          Stop
        </button>
      </div>
      <div className="slip-editor">
        <MetadataPanel
          slip={slip}
          onMetadataChange={handleMetadataChange}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
        <PianoRoll notes={slip.notes} grid={slip.grid} onNotesChange={handleNotesChange} />
      </div>
    </div>
  )
}
