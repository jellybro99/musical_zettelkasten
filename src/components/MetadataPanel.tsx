import { useState, type FormEvent } from 'react'
import { SLIP_KINDS, type Slip, type SlipKind, type UpdateSlipMetadataInput } from '../domain/slip'
import { generateSlipTitle } from '../domain/titleGenerator'
import './MetadataPanel.css'

export interface MetadataPanelProps {
  slip: Slip
  onMetadataChange: (input: UpdateSlipMetadataInput) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}

export function MetadataPanel({ slip, onMetadataChange, onAddTag, onRemoveTag }: MetadataPanelProps) {
  const [tagDraft, setTagDraft] = useState('')

  function handleAddTag(event: FormEvent) {
    event.preventDefault()
    if (!tagDraft.trim()) return
    onAddTag(tagDraft)
    setTagDraft('')
  }

  function handleRandomizeTitle() {
    onMetadataChange({ title: generateSlipTitle(Math.random() * Number.MAX_SAFE_INTEGER) })
  }

  return (
    <div className="metadata-panel">
      <label className="metadata-field">
        <span className="metadata-label">Title</span>
        <div className="metadata-title-row">
          <input
            type="text"
            className="metadata-input"
            value={slip.title}
            onChange={(event) => onMetadataChange({ title: event.target.value })}
          />
          <button
            type="button"
            className="metadata-title-randomize"
            onClick={handleRandomizeTitle}
            aria-label="Randomize title"
          >
            🎲
          </button>
        </div>
      </label>

      <label className="metadata-field">
        <span className="metadata-label">Tempo (BPM)</span>
        <input
          type="number"
          min={1}
          className="metadata-input"
          value={slip.tempo}
          onChange={(event) => onMetadataChange({ tempo: Number(event.target.value) })}
        />
      </label>

      <label className="metadata-field">
        <span className="metadata-label">Key</span>
        <input
          type="text"
          className="metadata-input"
          value={slip.key}
          onChange={(event) => onMetadataChange({ key: event.target.value })}
        />
      </label>

      <label className="metadata-field">
        <span className="metadata-label">Kind</span>
        <select
          className="metadata-input"
          value={slip.kind}
          onChange={(event) => onMetadataChange({ kind: event.target.value as SlipKind })}
        >
          {SLIP_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>

      <div className="metadata-field">
        <span className="metadata-label">Tags</span>
        <div className="metadata-tags">
          {slip.tags.map((tag) => (
            <span key={tag} className="metadata-tag">
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
            className="metadata-input"
            placeholder="Add tag"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
          />
          <button type="submit" className="metadata-tag-add">
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
