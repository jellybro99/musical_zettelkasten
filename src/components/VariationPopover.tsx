import { GitBranch, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { transposeKey, type Slip } from '../domain/slip'
import { ConfirmDialog } from './ConfirmDialog'
import './VariationPopover.css'

export interface VariationPopoverProps {
  slip: Slip
  initialTransposeSemitones?: number
  onConfirm: (transposeSemitones: number) => void
  onLiveTranspose: (transposeSemitones: number) => void
  onClose: () => void
}

export function VariationPopover({
  slip,
  initialTransposeSemitones = 0,
  onConfirm,
  onLiveTranspose,
  onClose,
}: VariationPopoverProps) {
  const [transposeSemitones, setTransposeSemitones] = useState(initialTransposeSemitones)

  const resultingKey = slip.key ? transposeKey(slip.key, transposeSemitones) : ''

  // The clip's offset is applied live as the stepper changes (so the timeline
  // badge previews the result), so backing out has to actively revert it —
  // closing the dialog doesn't undo an already-applied change on its own.
  function updateTranspose(next: number) {
    setTransposeSemitones(next)
    // Typing e.g. "-3" passes through an intermediate "-" keystroke, which
    // parses to NaN — don't let that transient state reach the live clip.
    if (Number.isFinite(next)) {
      onLiveTranspose(next)
    }
  }

  // Explicit "Cancel" discards the live-applied change. Dismissing the
  // dialog any other way (X button, backdrop click) just closes it — the
  // transpose already applied live stays, matching the hint copy above.
  function handleCancel() {
    if (transposeSemitones !== initialTransposeSemitones) {
      onLiveTranspose(initialTransposeSemitones)
    }
    onClose()
  }

  return (
    <ConfirmDialog
      title="Make a variation"
      subtitle={`of ${slip.title}`}
      onClose={onClose}
      actions={[
        { label: 'Cancel', variant: 'secondary', onClick: handleCancel },
        {
          label: 'Create variation',
          variant: 'primary',
          icon: <GitBranch size={14} />,
          onClick: () => onConfirm(transposeSemitones),
        },
      ]}
    >
      <div className="variation-popover-live-panel">
        <div className="field">
          <label htmlFor="variation-transpose">
            <span className="variation-popover-live-dot" aria-hidden="true" />
            Transpose (semitones)
          </label>
          <div className="variation-popover-transpose-row">
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={() => updateTranspose(transposeSemitones - 1)}
              aria-label="Transpose down one semitone"
            >
              <Minus size={14} />
            </button>
            <input
              id="variation-transpose"
              type="number"
              className="input variation-popover-transpose-input"
              value={transposeSemitones}
              onChange={(event) => updateTranspose(Number(event.target.value))}
            />
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={() => updateTranspose(transposeSemitones + 1)}
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
      </div>
    </ConfirmDialog>
  )
}
