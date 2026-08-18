import { Copy, Play, Square, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router'
import { copySlip, filterSlips, formatSlipMeta, type Slip, type SlipFilters } from '../domain/slip'
import { deleteSlip, listSlips, saveSlip } from '../persistence/slipStorage'
import { filtersToSearchParams, searchParamsToFilters } from '../routing/slipFilterParams'
import type { AppOutletContext } from './AppLayout'
import { Card } from './Card'
import { ConfirmDialog } from './ConfirmDialog'
import { SlipFilterSidebar } from './SlipFilterSidebar'
import './SlipDashboard.css'

export function SlipDashboard() {
  const navigate = useNavigate()
  const { playingSlipId, onTogglePlaySlip } = useOutletContext<AppOutletContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => searchParamsToFilters(searchParams), [searchParams])
  const [slips, setSlips] = useState<Slip[] | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Slip | null>(null)

  function handleFiltersChange(next: SlipFilters) {
    setSearchParams(filtersToSearchParams(next), { replace: true })
  }

  const visibleSlips = useMemo(() => {
    if (slips === null) return null
    return filterSlips(slips, filters).sort((a, b) => b.createdAt - a.createdAt)
  }, [slips, filters])

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

  function handleTogglePlay(event: MouseEvent, slip: Slip) {
    event.stopPropagation()
    onTogglePlaySlip(slip)
  }

  async function handleCopy(event: MouseEvent, slip: Slip) {
    event.stopPropagation()
    const copy = copySlip(slip)
    try {
      await saveSlip(copy)
    } catch (error) {
      console.error('Failed to copy slip', error)
      return
    }
    navigate(`/slips/${copy.id}`)
  }

  function handleDeleteClick(event: MouseEvent, slip: Slip) {
    event.stopPropagation()
    setPendingDelete(slip)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const slipId = pendingDelete.id
    setPendingDelete(null)
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
      {slips !== null && visibleSlips !== null && (
        slips.length === 0 ? (
          <div className="slip-dashboard-empty">
            <p>Capture a slip</p>
          </div>
        ) : (
          <div className="slip-dashboard-body">
            <SlipFilterSidebar slips={slips} filters={filters} onFiltersChange={handleFiltersChange} />
            {visibleSlips.length === 0 ? (
              <div className="slip-dashboard-empty">
                <p>No slips match your filters</p>
              </div>
            ) : (
              <div className="slip-dashboard-grid card-grid">
                {visibleSlips.map((slip) => (
                  <Card
                    key={slip.id}
                    title={slip.title}
                    badge={slip.kind}
                    tags={slip.tags}
                    meta={formatSlipMeta(slip)}
                    onNavigate={() => navigate(`/slips/${slip.id}`)}
                    actions={[
                      {
                        icon: playingSlipId === slip.id ? <Square size={14} /> : <Play size={14} />,
                        ariaLabel: playingSlipId === slip.id ? `Stop ${slip.title}` : `Play ${slip.title}`,
                        onClick: (event) => handleTogglePlay(event, slip),
                      },
                      {
                        icon: <Copy size={14} />,
                        ariaLabel: `Copy ${slip.title}`,
                        onClick: (event) => handleCopy(event, slip),
                      },
                      {
                        icon: <Trash2 size={14} />,
                        ariaLabel: `Delete ${slip.title}`,
                        onClick: (event) => handleDeleteClick(event, slip),
                        danger: true,
                      },
                    ]}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.title}"?`}
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
