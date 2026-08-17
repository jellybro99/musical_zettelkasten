import { ChevronDown, Copy, GitBranch, Piano, Save, Shuffle, Trash2 } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  referenceCandidates,
  resolveSlipNotes,
  SLIP_KINDS,
  type Slip,
  type SlipKind,
  type UpdateSlipMetadataInput,
} from '../domain/slip'
import { generateSlipTitle } from '../domain/titleGenerator'
import { SlipThumbnail } from './SlipThumbnail'
import './MetadataPanel.css'

export interface MetadataPanelProps {
  slip: Slip
  allSlips: Slip[]
  isPersisted: boolean
  onBack: () => void
  onSave: () => void
  onCopy: () => void
  onDelete: () => void
  onMetadataChange: (input: UpdateSlipMetadataInput) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onAddReference: (referencedSlipId: string) => void
  onRemoveReference: (referencedSlipId: string) => void
  onOpenReference: (referencedSlipId: string) => void
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
  onAddTag,
  onRemoveTag,
  onAddReference,
  onRemoveReference,
  onOpenReference,
}: MetadataPanelProps) {
  const [tagDraft, setTagDraft] = useState('')
  const candidates = referenceCandidates(slip, allSlips)
  const copiedFrom = slip.copiedFromId ? allSlips.find((candidate) => candidate.id === slip.copiedFromId) : undefined

  function handleAddTag(event: FormEvent) {
    event.preventDefault()
    if (!tagDraft.trim()) return
    onAddTag(tagDraft)
    setTagDraft('')
  }

  function handleRandomizeTitle() {
    onMetadataChange({ title: generateSlipTitle(Math.random() * Number.MAX_SAFE_INTEGER) })
  }

  function handleAddReference(event: ChangeEvent<HTMLSelectElement>) {
    const referencedSlipId = event.target.value
    if (!referencedSlipId) return
    onAddReference(referencedSlipId)
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
          <button type="button" className="btn btn-ghost metadata-panel-delete" onClick={onDelete}>
            <Trash2 size={14} />
            Delete slip
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
          onClick={() => onOpenReference(copiedFrom.id)}
        >
          <GitBranch size={13} />
          <span className="metadata-provenance-text">
            Copied from: <span className="metadata-provenance-title">{copiedFrom.title}</span>
          </span>
        </button>
      )}

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

      <div className="field">
        <span className="metadata-label">References</span>
        <div className="metadata-references">
          {slip.referencedSlipIds.map((referencedSlipId) => {
            const referenced = allSlips.find((candidate) => candidate.id === referencedSlipId)

            if (!referenced) {
              return (
                <div key={referencedSlipId} className="reference-card-wrapper">
                  <div className="reference-card reference-card-missing">
                    <span className="reference-card-title">Deleted slip</span>
                  </div>
                  <button
                    type="button"
                    className="reference-card-remove"
                    onClick={() => onRemoveReference(referencedSlipId)}
                    aria-label="Remove reference Deleted slip"
                  >
                    ×
                  </button>
                </div>
              )
            }

            return (
              <div key={referencedSlipId} className="reference-card-wrapper">
                <button type="button" className="reference-card" onClick={() => onOpenReference(referencedSlipId)}>
                  <SlipThumbnail notes={resolveSlipNotes(referenced, allSlips)} grid={referenced.grid} />
                  <span className="reference-card-title">{referenced.title}</span>
                </button>
                <button
                  type="button"
                  className="reference-card-remove"
                  onClick={() => onRemoveReference(referencedSlipId)}
                  aria-label={`Remove reference ${referenced.title}`}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
        {candidates.length > 0 && (
          <select
            className="input"
            value=""
            onChange={handleAddReference}
            aria-label="Add reference"
          >
            <option value="" disabled>
              Add reference…
            </option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
