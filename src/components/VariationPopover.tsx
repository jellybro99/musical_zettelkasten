import { Minus, Piano, Plus } from 'lucide-react'
import { useState } from 'react'
import { transposeKey, type Slip } from '../domain/slip'
import { ConfirmDialog } from './ConfirmDialog'
import './VariationPopover.css'

export interface VariationConfirmInput {
  transposeSemitones: number
  keepLinked: boolean
}

export interface VariationPopoverProps {
  slip: Slip
  onConfirm: (input: VariationConfirmInput) => void
  onOpenInEditor: (input: VariationConfirmInput) => void
  onClose: () => void
}

export function VariationPopover({ slip, onConfirm, onOpenInEditor, onClose }: VariationPopoverProps) {
  const [transposeSemitones, setTransposeSemitones] = useState(0)
  const [keepLinked, setKeepLinked] = useState(true)

  const resultingKey = slip.key ? transposeKey(slip.key, transposeSemitones) : ''
  const input: VariationConfirmInput = { transposeSemitones, keepLinked }

  return (
    <ConfirmDialog
      title="Make a variation"
      onClose={onClose}
      actions={[
        { label: 'Create variation', variant: 'secondary', onClick: () => onConfirm(input) },
        {
          label: 'Create & add notes',
          variant: 'primary',
          icon: <Piano size={14} />,
          onClick: () => onOpenInEditor(input),
        },
      ]}
    >
      <p className="variation-popover-source">of {slip.title}</p>

      <div className="field">
        <label htmlFor="variation-transpose">Transpose (semitones)</label>
        <div className="variation-popover-transpose-row">
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => setTransposeSemitones((current) => current - 1)}
            aria-label="Transpose down one semitone"
          >
            <Minus size={14} />
          </button>
          <input
            id="variation-transpose"
            type="number"
            className="input variation-popover-transpose-input"
            value={transposeSemitones}
            onChange={(event) => setTransposeSemitones(Number(event.target.value))}
          />
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => setTransposeSemitones((current) => current + 1)}
            aria-label="Transpose up one semitone"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {slip.key && (
        <p className="variation-popover-key">
          {slip.key} → <strong>{resultingKey}</strong>
        </p>
      )}

      <label className="variation-popover-linked">
        <input type="checkbox" checked={keepLinked} onChange={(event) => setKeepLinked(event.target.checked)} />
        Keep linked to the original slip
      </label>
    </ConfirmDialog>
  )
}
