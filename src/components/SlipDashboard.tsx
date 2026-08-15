import { useEffect, useState } from 'react'
import { formatSlipMeta, type Slip } from '../domain/slip'
import { listSlips } from '../persistence/slipStorage'
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

  if (slips === null) return null

  if (slips.length === 0) {
    return (
      <div className="slip-dashboard-empty">
        <p>Capture a slip</p>
      </div>
    )
  }

  return (
    <div className="slip-dashboard-grid">
      {slips.map((slip) => (
        <button
          key={slip.id}
          type="button"
          className="slip-card"
          onClick={() => onOpenSlip(slip.id)}
        >
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
      ))}
    </div>
  )
}
