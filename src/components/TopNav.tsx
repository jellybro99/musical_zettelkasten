import { Plus } from 'lucide-react'
import './TopNav.css'

export interface TopNavProps {
  onSlipBoxClick: () => void
  onArrangeClick: () => void
  onCapture: () => void
  activeScreen: 'dashboard' | 'arrange'
}

export function TopNav({ onSlipBoxClick, onArrangeClick, onCapture, activeScreen }: TopNavProps) {
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
          className={`top-nav-item${activeScreen === 'dashboard' ? ' top-nav-item-active' : ''}`}
          aria-current={activeScreen === 'dashboard' ? 'page' : undefined}
          onClick={onSlipBoxClick}
        >
          Slip-box
        </button>
        <button
          type="button"
          className={`top-nav-item${activeScreen === 'arrange' ? ' top-nav-item-active' : ''}`}
          aria-current={activeScreen === 'arrange' ? 'page' : undefined}
          onClick={onArrangeClick}
        >
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
