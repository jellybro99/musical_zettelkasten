import { ChevronDown, Copy, GitBranch, Piano, Save, Shuffle, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  DEFAULT_GRID,
  notesOutOfGridBounds,
  octaveCountToHighPitch,
  SLIP_KINDS,
  type GridConfig,
  type Slip,
  type SlipKind,
  type UpdateSlipMetadataInput,
} from '../domain/slip'
import { generateSlipTitle } from '../domain/titleGenerator'
import './MetadataPanel.css'

const BAR_OPTIONS = [1, 2, 4, 8]
const OCTAVE_OPTIONS = [1, 2, 3]

export interface MetadataPanelProps {
  slip: Slip
  allSlips: Slip[]
  isPersisted: boolean
  onBack: () => void
  onSave: () => void
  onCopy: () => void
  onDelete: () => void
  onMetadataChange: (input: UpdateSlipMetadataInput) => void
  onGridChange: (gridPatch: Partial<GridConfig>) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onNavigateToSlip: (targetSlipId: string) => void
}

export function MetadataPanel({
  slip,
  allSlips,
  isPersisted,
  onBack,
  onSave,
  onCopy,
  onDelete,
  onMetadataChange,
  onGridChange,
  onAddTag,
  onRemoveTag,
  onNavigateToSlip,
}: MetadataPanelProps) {
  const [tagDraft, setTagDraft] = useState('')
  const copiedFrom = slip.copiedFromId ? allSlips.find((candidate) => candidate.id === slip.copiedFromId) : undefined

  const currentOctaveCount = Math.round((slip.grid.highPitch - slip.grid.lowPitch + 1) / 12) || 1

  function handleAddTag(event: FormEvent) {
    event.preventDefault()
    if (!tagDraft.trim()) return
    onAddTag(tagDraft)
    setTagDraft('')
  }

  function handleRandomizeTitle() {
    onMetadataChange({ title: generateSlipTitle(Math.random() * Number.MAX_SAFE_INTEGER) })
  }

  function applyGridChange(gridPatch: Partial<GridConfig>) {
    const candidateGrid = { ...slip.grid, ...gridPatch }
    const affectedNotes = notesOutOfGridBounds(slip.notes, candidateGrid)
    if (affectedNotes.length > 0) {
      const noteWord = affectedNotes.length === 1 ? 'note' : 'notes'
      if (!window.confirm(`This will remove ${affectedNotes.length} ${noteWord} outside the new size. Continue?`)) {
        return
      }
    }
    onGridChange(gridPatch)
  }

  function handleBarsChange(bars: number) {
    applyGridChange({ bars })
  }

  function handleOctaveCountChange(octaveCount: number) {
    applyGridChange({ highPitch: octaveCountToHighPitch(DEFAULT_GRID.lowPitch, octaveCount) })
  }

  return (
    <div className="metadata-panel">
      <div className="metadata-panel-transport">
        <button type="button" className="btn btn-ghost metadata-panel-back" onClick={onBack}>
          ← Back
        </button>
        <div className="metadata-panel-actions">
          {!isPersisted && (
            <button type="button" className="btn btn-ghost metadata-panel-save" onClick={onSave}>
              <Save size={14} />
              Save
            </button>
          )}
          <button type="button" className="btn btn-ghost metadata-panel-copy" onClick={onCopy}>
            <Copy size={14} />
            Copy
          </button>
          <button type="button" className="btn btn-danger metadata-panel-delete" onClick={onDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="slip-title">Title</label>
        <div className="metadata-title-row">
          <input
            id="slip-title"
            type="text"
            className="input"
            value={slip.title}
            onChange={(event) => onMetadataChange({ title: event.target.value })}
          />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={handleRandomizeTitle}
            aria-label="Randomize title"
          >
            <Shuffle size={14} />
          </button>
        </div>
      </div>

      {copiedFrom && (
        <button
          type="button"
          className="btn btn-ghost metadata-provenance"
          onClick={() => onNavigateToSlip(copiedFrom.id)}
        >
          <GitBranch size={13} />
          <span className="metadata-provenance-text">
            Copied from: <span className="metadata-provenance-title">{copiedFrom.title}</span>
          </span>
        </button>
      )}

      <div className="metadata-field-row">
        <div className="field">
          <label htmlFor="slip-tempo">Tempo (BPM)</label>
          <input
            id="slip-tempo"
            type="number"
            min={1}
            className="input"
            value={slip.tempo}
            onChange={(event) => onMetadataChange({ tempo: Number(event.target.value) })}
          />
        </div>

        <div className="field">
          <label htmlFor="slip-key">Key</label>
          <input
            id="slip-key"
            type="text"
            className="input"
            value={slip.key}
            onChange={(event) => onMetadataChange({ key: event.target.value })}
          />
        </div>
      </div>

      <div className="metadata-field-row">
        <div className="field">
          <label htmlFor="slip-kind">Kind</label>
          <select
            id="slip-kind"
            className="input"
            value={slip.kind}
            onChange={(event) => onMetadataChange({ kind: event.target.value as SlipKind })}
          >
            {SLIP_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="slip-bars">Bars</label>
          <select
            id="slip-bars"
            className="input"
            value={slip.grid.bars}
            onChange={(event) => handleBarsChange(Number(event.target.value))}
          >
            {BAR_OPTIONS.map((bars) => (
              <option key={bars} value={bars}>
                {bars}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="slip-octave-range">Octave range</label>
        <select
          id="slip-octave-range"
          className="input"
          value={currentOctaveCount}
          onChange={(event) => handleOctaveCountChange(Number(event.target.value))}
        >
          {OCTAVE_OPTIONS.map((octaveCount) => (
            <option key={octaveCount} value={octaveCount}>
              {octaveCount}
            </option>
          ))}
        </select>
      </div>

      <div className="hr" />

      <div className="field">
        <span className="metadata-label">Instrument</span>
        <div className="metadata-instrument-row">
          <div className="metadata-instrument-icon">
            <Piano size={18} />
          </div>
          <div className="metadata-instrument-info">
            <div className="metadata-instrument-name">Mark I Rhodes</div>
            <div className="metadata-instrument-subtitle">Electric piano · warm</div>
          </div>
          <ChevronDown size={15} className="metadata-instrument-chevron" />
        </div>
      </div>

      <div className="hr" />

      <div className="field">
        <span className="metadata-label">Tags</span>
        <div className="metadata-tags">
          {slip.tags.map((tag) => (
            <span key={tag} className="tag tag-neutral metadata-tag">
              {tag}
              <button
                type="button"
                className="metadata-tag-remove"
                onClick={() => onRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form className="metadata-tag-form" onSubmit={handleAddTag}>
          <input
            type="text"
            className="input"
            placeholder="Add tag"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
          />
          <button type="submit" className="tag tag-neutral metadata-tag-add">
            + tag
          </button>
        </form>
      </div>
    </div>
  )
}
