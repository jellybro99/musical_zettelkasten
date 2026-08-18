import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { createArrangement, type Arrangement } from '../domain/arrangement'
import { deleteArrangement, listArrangements } from '../persistence/arrangementStorage'
import { ConfirmDialog } from './ConfirmDialog'
import './ArrangementDashboard.css'

export interface ArrangementDashboardProps {
  onOpenArrangement: (arrangementId: string) => void
}

export function ArrangementDashboard({ onOpenArrangement }: ArrangementDashboardProps) {
  const [arrangements, setArrangements] = useState<Arrangement[] | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Arrangement | null>(null)

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

  function handleCreate() {
    const arrangement = createArrangement()
    onOpenArrangement(arrangement.id)
  }

  function handleDeleteClick(event: MouseEvent, arrangement: Arrangement) {
    event.stopPropagation()
    setPendingDelete(arrangement)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const arrangementId = pendingDelete.id
    setPendingDelete(null)
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
                  onClick={(event) => handleDeleteClick(event, arrangement)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      )}
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.name}"?`}
          onClose={() => setPendingDelete(null)}
          actions={[
            { label: 'Cancel', variant: 'secondary', onClick: () => setPendingDelete(null) },
            { label: 'Delete', variant: 'danger', onClick: confirmDelete },
          ]}
        >
          This cannot be undone.
        </ConfirmDialog>
      )}
    </div>
  )
}
