import { Plus } from 'lucide-react'
import './TopNav.css'

export interface TopNavProps {
  onSlipBoxClick: () => void
  onCapture: () => void
}

export function TopNav({ onSlipBoxClick, onCapture }: TopNavProps) {
  return (
    <nav className="nav">
      <span className="nav-brand">
        Zettel<span className="top-nav-dot">·</span>kasten
      </span>
      <div className="top-nav-items">
        <button type="button" className="top-nav-item" disabled>
          Desk
        </button>
        <button
          type="button"
          className="top-nav-item top-nav-item-active"
          aria-current="page"
          onClick={onSlipBoxClick}
        >
          Slip-box
        </button>
        <button type="button" className="top-nav-item" disabled>
          Arrange
        </button>
      </div>
      <button type="button" className="btn btn-primary" onClick={onCapture}>
        <Plus size={14} />
        Capture
      </button>
    </nav>
  )
}
