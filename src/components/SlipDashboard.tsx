import { Play, Square, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { createPlaybackEngine, type PlaybackEngine } from '../audio/playbackEngine'
import { filterSlips, formatSlipMeta, totalSteps, type Slip, type SlipFilters } from '../domain/slip'
import { deleteSlip, listSlips } from '../persistence/slipStorage'
import { SlipFilterSidebar } from './SlipFilterSidebar'
import './SlipDashboard.css'

const STEPS_PER_BEAT = 4
const DEFAULT_FILTERS: SlipFilters = { search: '', tags: [], kind: 'all' }

export interface SlipDashboardProps {
  onOpenSlip: (slipId: string) => void
}

export function SlipDashboard({ onOpenSlip }: SlipDashboardProps) {
  const [slips, setSlips] = useState<Slip[] | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [filters, setFilters] = useState<SlipFilters>(DEFAULT_FILTERS)
  const engineRef = useRef<PlaybackEngine | null>(null)
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current)
      engineRef.current?.stop()
    }
  }, [])

  function handleTogglePlay(event: MouseEvent, slip: Slip) {
    event.stopPropagation()
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current)

    if (playingId === slip.id) {
      engineRef.current?.stop()
      setPlayingId(null)
      return
    }

    if (!engineRef.current) engineRef.current = createPlaybackEngine()
    engineRef.current.play(slip.notes, slip.tempo)
    setPlayingId(slip.id)

    const secondsPerStep = 60 / slip.tempo / STEPS_PER_BEAT
    const durationMs = totalSteps(slip.grid) * secondsPerStep * 1000
    stopTimeoutRef.current = setTimeout(() => setPlayingId(null), durationMs)
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
    setPlayingId((current) => {
      if (current !== slipId) return current
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current)
      engineRef.current?.stop()
      return null
    })
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
            <SlipFilterSidebar slips={slips} filters={filters} onFiltersChange={setFilters} />
            {visibleSlips.length === 0 ? (
              <div className="slip-dashboard-empty">
                <p>No slips match your filters</p>
              </div>
            ) : (
              <div className="slip-dashboard-grid">
                {visibleSlips.map((slip) => (
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
                      className="slip-card-play"
                      aria-label={playingId === slip.id ? `Stop ${slip.title}` : `Play ${slip.title}`}
                      onClick={(event) => handleTogglePlay(event, slip)}
                    >
                      {playingId === slip.id ? <Square size={14} /> : <Play size={14} />}
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
            )}
          </div>
        )
      )}
    </div>
  )
}
