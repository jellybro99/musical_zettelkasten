import './TopNav.css'

export interface TopNavProps {
  onSlipBoxClick: () => void
}

export function TopNav({ onSlipBoxClick }: TopNavProps) {
  return (
    <nav className="top-nav">
      <span className="top-nav-wordmark">Zettel·kasten</span>
      <div className="top-nav-tabs">
        <button type="button" className="top-nav-tab" disabled>
          Desk
        </button>
        <button type="button" className="top-nav-tab top-nav-tab-active" aria-current="page" onClick={onSlipBoxClick}>
          Slip-box
        </button>
        <button type="button" className="top-nav-tab" disabled>
          Arrange
        </button>
      </div>
    </nav>
  )
}
