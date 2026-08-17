import { Shuffle } from 'lucide-react'
import { useState } from 'react'
import { createArrangement, updateArrangementMetadata } from '../domain/arrangement'
import { generateSlipTitle } from '../domain/titleGenerator'
import { useAutosave } from '../hooks/useAutosave'
import { getArrangement, saveArrangement } from '../persistence/arrangementStorage'
import './ArrangementView.css'

export interface ArrangementViewProps {
  arrangementId: string
  onBack: () => void
}

export function ArrangementView({ arrangementId, onBack }: ArrangementViewProps) {
  const [arrangement, setArrangement] = useState(() => createArrangement({ id: arrangementId }))
  useAutosave(arrangement, arrangementId, {
    load: getArrangement,
    save: saveArrangement,
    onLoaded: setArrangement,
  })

  function handleMetadataChange(input: { name?: string; tempo?: number }) {
    setArrangement((current) => updateArrangementMetadata(current, input))
  }

  function handleRandomizeName() {
    handleMetadataChange({ name: generateSlipTitle(Math.random() * Number.MAX_SAFE_INTEGER) })
  }

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
        <p className="arrangement-view-placeholder">Drag slips here to start building your song.</p>
      </div>
    </div>
  )
}
