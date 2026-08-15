import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { createSlip, formatSlipMeta, type Slip } from '../domain/slip'
import { deleteSlip, listSlips, saveSlip } from '../persistence/slipStorage'
import './SlipDashboard.css'

export interface SlipDashboardProps {
  onOpenSlip: (slipId: string) => void
}

export function SlipDashboard({ onOpenSlip }: SlipDashboardProps) {
  const [slips, setSlips] = useState<Slip[] | null>(null)

  useEffect(() => {
    let cancelled = false
    listSlips()
      .then((loaded) => {
        if (!cancelled) setSlips(loaded)
      })
      .catch((error) => {
        console.error('Failed to load slips', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCapture() {
    const slip = createSlip()
    try {
      await saveSlip(slip)
    } catch (error) {
      console.error('Failed to save new slip', error)
      return
    }
    onOpenSlip(slip.id)
  }

  async function handleDelete(event: MouseEvent, slipId: string) {
    event.stopPropagation()
    if (!window.confirm('Delete this slip? This cannot be undone.')) return
    try {
      await deleteSlip(slipId)
    } catch (error) {
      console.error('Failed to delete slip', error)
      return
    }
    setSlips((current) => current?.filter((slip) => slip.id !== slipId) ?? current)
  }

  return (
    <div className="slip-dashboard">
      <div className="slip-dashboard-header">
        <button type="button" className="slip-dashboard-capture" onClick={handleCapture}>
          <Plus size={14} />
          Capture
        </button>
      </div>
      {slips !== null && (
        slips.length === 0 ? (
          <div className="slip-dashboard-empty">
            <p>Capture a slip</p>
          </div>
        ) : (
          <div className="slip-dashboard-grid">
            {slips.map((slip) => (
              <div key={slip.id} className="slip-card-wrapper">
                <button type="button" className="slip-card" onClick={() => onOpenSlip(slip.id)}>
                  <h3 className="slip-card-title">{slip.title}</h3>
                  <span className="slip-card-kind">{slip.kind}</span>
                  <div className="slip-card-tags">
                    {slip.tags.map((tag) => (
                      <span key={tag} className="slip-card-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="slip-card-meta">{formatSlipMeta(slip)}</p>
                </button>
                <button
                  type="button"
                  className="slip-card-delete"
                  aria-label={`Delete ${slip.title}`}
                  onClick={(event) => handleDelete(event, slip.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
