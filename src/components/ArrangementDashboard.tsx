import { Play, Plus, Square, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router'
import { createArrangement, type Arrangement } from '../domain/arrangement'
import type { Slip } from '../domain/slip'
import { deleteArrangement, listArrangements } from '../persistence/arrangementStorage'
import { listSlips } from '../persistence/slipStorage'
import type { AppOutletContext } from './AppLayout'
import { Card } from './Card'
import { ConfirmDialog } from './ConfirmDialog'
import './ArrangementDashboard.css'

export function ArrangementDashboard() {
  const navigate = useNavigate()
  const { playingArrangementId, onTogglePlayArrangement } = useOutletContext<AppOutletContext>()
  const [arrangements, setArrangements] = useState<Arrangement[] | null>(null)
  const [slips, setSlips] = useState<Slip[]>([])
  const [pendingDelete, setPendingDelete] = useState<Arrangement | null>(null)

  const slipsById = useMemo(() => new Map(slips.map((slip) => [slip.id, slip])), [slips])

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

  function handleCreate() {
    const arrangement = createArrangement()
    navigate(`/arrange/${arrangement.id}`, { state: { isNewCapture: true } })
  }

  function handleTogglePlay(event: MouseEvent, arrangement: Arrangement) {
    event.stopPropagation()
    onTogglePlayArrangement(arrangement, slipsById)
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
          <div className="card-grid">
            {arrangements.map((arrangement) => (
              <Card
                key={arrangement.id}
                title={arrangement.name}
                meta={`${arrangement.tempo} BPM · ${arrangement.tracks.length} tracks`}
                onNavigate={() => navigate(`/arrange/${arrangement.id}`)}
                actions={[
                  {
                    icon: playingArrangementId === arrangement.id ? <Square size={14} /> : <Play size={14} />,
                    ariaLabel:
                      playingArrangementId === arrangement.id
                        ? `Stop ${arrangement.name}`
                        : `Play ${arrangement.name}`,
                    onClick: (event) => handleTogglePlay(event, arrangement),
                  },
                  {
                    icon: <Trash2 size={14} />,
                    ariaLabel: `Delete ${arrangement.name}`,
                    onClick: (event) => handleDeleteClick(event, arrangement),
                    danger: true,
                  },
                ]}
              />
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
