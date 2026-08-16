import { Search } from 'lucide-react'
import { filterSlips, SLIP_KINDS, type Slip, type SlipFilters, type SlipKind } from '../domain/slip'
import './SlipFilterSidebar.css'

export interface SlipFilterSidebarProps {
  slips: Slip[]
  filters: SlipFilters
  onFiltersChange: (filters: SlipFilters) => void
}

export function SlipFilterSidebar({ slips, filters, onFiltersChange }: SlipFilterSidebarProps) {
  const allTags = Array.from(new Set(slips.flatMap((slip) => slip.tags))).sort()

  function countFor(overrides: Partial<SlipFilters>): number {
    return filterSlips(slips, { ...filters, ...overrides }).length
  }

  function handleToggleTag(tag: string) {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter((existing) => existing !== tag)
      : [...filters.tags, tag]
    onFiltersChange({ ...filters, tags })
  }

  function handleKindChange(kind: SlipKind | 'all') {
    onFiltersChange({ ...filters, kind })
  }

  return (
    <aside className="slip-filter-sidebar">
      <div className="slip-filter-search-wrap">
        <Search className="slip-filter-search-icon" size={14} aria-hidden="true" />
        <input
          type="text"
          className="input slip-filter-search"
          placeholder="Search title or tag"
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
        />
      </div>

      <div className="slip-filter-section">
        <span className="slip-filter-heading">Kind</span>
        <ul className="slip-filter-list">
          <li>
            <button
              type="button"
              className={`slip-filter-option${filters.kind === 'all' ? ' active' : ''}`}
              onClick={() => handleKindChange('all')}
            >
              <span>All</span>
              <span className="slip-filter-count">{countFor({ kind: 'all' })}</span>
            </button>
          </li>
          {SLIP_KINDS.map((kind) => (
            <li key={kind}>
              <button
                type="button"
                className={`slip-filter-option${filters.kind === kind ? ' active' : ''}`}
                onClick={() => handleKindChange(kind)}
              >
                <span>{kind}</span>
                <span className="slip-filter-count">{countFor({ kind })}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {allTags.length > 0 && (
        <div className="slip-filter-section">
          <span className="slip-filter-heading">Tags</span>
          <div className="slip-filter-tag-chips">
            {allTags.map((tag) => {
              const isSelected = filters.tags.includes(tag)
              const tagsWithThis = isSelected ? filters.tags : [...filters.tags, tag]
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag ${isSelected ? 'tag-outline' : 'tag-neutral'} slip-filter-tag-chip`}
                  aria-pressed={isSelected}
                  onClick={() => handleToggleTag(tag)}
                >
                  {tag}
                  <span className="slip-filter-count">{countFor({ tags: tagsWithThis })}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}
