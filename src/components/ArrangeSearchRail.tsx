import { Play, Square } from 'lucide-react'
import { useMemo, type MouseEvent } from 'react'
import { filterSlips, type Slip, type SlipFilters } from '../domain/slip'
import { SlipFilterSidebar } from './SlipFilterSidebar'
import './ArrangeSearchRail.css'

export interface ArrangeSearchRailProps {
  slips: Slip[]
  filters: SlipFilters
  onFiltersChange: (filters: SlipFilters) => void
  onSlipDragStart: (event: MouseEvent, slip: Slip) => void
  playingSlipId: string | null
  onTogglePlaySlip: (slip: Slip) => void
}

export function ArrangeSearchRail({
  slips,
  filters,
  onFiltersChange,
  onSlipDragStart,
  playingSlipId,
  onTogglePlaySlip,
}: ArrangeSearchRailProps) {
  const results = useMemo(
    () => filterSlips(slips, filters).sort((a, b) => b.createdAt - a.createdAt),
    [slips, filters],
  )

  return (
    <div className="arrange-search-rail">
      <SlipFilterSidebar slips={slips} filters={filters} onFiltersChange={onFiltersChange} />
      <div className="arrange-search-rail-results">
        {results.length === 0 ? (
          <p className="arrange-search-rail-empty">No slips match your filters</p>
        ) : (
          results.map((slip) => {
            const isPlaying = playingSlipId === slip.id
            return (
              <div
                key={slip.id}
                className="arrange-search-rail-item"
                onMouseDown={(event) => onSlipDragStart(event, slip)}
                role="button"
                tabIndex={0}
                aria-label={`Drag ${slip.title} onto the timeline`}
              >
                <div className="arrange-search-rail-item-body">
                  <span className="arrange-search-rail-item-title">{slip.title}</span>
                  <span className="arrange-search-rail-item-meta">
                    {slip.kind} · {slip.tempo} BPM{slip.key ? ` · ${slip.key}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="arrange-search-rail-item-play"
                  aria-label={isPlaying ? `Stop ${slip.title}` : `Play ${slip.title}`}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    onTogglePlaySlip(slip)
                  }}
                >
                  {isPlaying ? <Square size={12} /> : <Play size={12} />}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
