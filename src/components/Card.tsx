import type { MouseEvent, ReactNode } from 'react'
import './Card.css'

export interface CardAction {
  icon: ReactNode
  ariaLabel: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  danger?: boolean
}

export interface CardProps {
  title: string
  badge?: string
  tags?: string[]
  meta: string
  onNavigate: () => void
  actions?: CardAction[]
}

export function Card({ title, badge, tags, meta, onNavigate, actions }: CardProps) {
  return (
    <div className="card-wrapper">
      <button type="button" className="card" onClick={onNavigate}>
        <h3 className="card-title">{title}</h3>
        {badge && <span className="card-badge">{badge}</span>}
        {tags && tags.length > 0 && (
          <div className="card-tags">
            {tags.map((tag) => (
              <span key={tag} className="tag tag-neutral">
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="card-meta">{meta}</p>
      </button>
      {actions && actions.length > 0 && (
        <div className="card-actions">
          {actions.map((action) => (
            <button
              key={action.ariaLabel}
              type="button"
              className={action.danger ? 'card-action card-action-danger' : 'card-action'}
              aria-label={action.ariaLabel}
              onClick={action.onClick}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
