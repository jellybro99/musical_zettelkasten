import { ChevronDown, Piano, Shuffle } from 'lucide-react'
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
