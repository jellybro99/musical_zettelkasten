import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { createArrangement, type Arrangement } from '../domain/arrangement'
import { deleteArrangement, listArrangements, saveArrangement } from '../persistence/arrangementStorage'
import './ArrangementDashboard.css'

export interface ArrangementDashboardProps {
  onOpenArrangement: (arrangementId: string) => void
}

export function ArrangementDashboard({ onOpenArrangement }: ArrangementDashboardProps) {
  const [arrangements, setArrangements] = useState<Arrangement[] | null>(null)

  useEffect(() => {
    let cancelled = false
    listArrangements()
      .then((loaded) => {
        if (!cancelled) setArrangements(loaded.sort((a, b) => b.createdAt - a.createdAt))
      })
      .catch((error) => {
        console.error('Failed to load arrangements', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate() {
    const arrangement = createArrangement()
    try {
      await saveArrangement(arrangement)
    } catch (error) {
      console.error('Failed to create arrangement', error)
      return
    }
    onOpenArrangement(arrangement.id)
  }

  async function handleDelete(event: MouseEvent, arrangementId: string) {
    event.stopPropagation()
    if (!window.confirm('Delete this arrangement? This cannot be undone.')) return
    try {
      await deleteArrangement(arrangementId)
    } catch (error) {
      console.error('Failed to delete arrangement', error)
      return
    }
    setArrangements((current) => current?.filter((arrangement) => arrangement.id !== arrangementId) ?? current)
  }

  return (
    <div className="arrangement-dashboard">
      <div className="arrangement-dashboard-header">
        <h1>Arrange</h1>
        <button type="button" className="btn btn-primary" onClick={handleCreate}>
          <Plus size={14} />
          New arrangement
        </button>
      </div>

      {arrangements !== null && (
        arrangements.length === 0 ? (
          <div className="arrangement-dashboard-empty">
            <p>Start a new arrangement</p>
          </div>
        ) : (
          <div className="arrangement-dashboard-grid">
            {arrangements.map((arrangement) => (
              <div key={arrangement.id} className="arrangement-card-wrapper">
                <button
                  type="button"
                  className="arrangement-card"
                  onClick={() => onOpenArrangement(arrangement.id)}
                >
                  <h3 className="arrangement-card-title">{arrangement.name}</h3>
                  <p className="arrangement-card-meta">{arrangement.tempo} BPM · {arrangement.tracks.length} tracks</p>
                </button>
                <button
                  type="button"
                  className="arrangement-card-delete"
                  aria-label={`Delete ${arrangement.name}`}
                  onClick={(event) => handleDelete(event, arrangement.id)}
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
