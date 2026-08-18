import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import './ConfirmDialog.css'

export type ConfirmDialogActionVariant = 'primary' | 'secondary' | 'danger'

export interface ConfirmDialogAction {
  label: string
  variant?: ConfirmDialogActionVariant
  icon?: ReactNode
  onClick: () => void
}

export interface ConfirmDialogProps {
  title: string
  children?: ReactNode
  actions: ConfirmDialogAction[]
  onClose: () => void
}

export function ConfirmDialog({ title, children, actions, onClose }: ConfirmDialogProps) {
  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-title">{title}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        {children && <div className="confirm-dialog-body">{children}</div>}
        <div className="confirm-dialog-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`btn btn-${action.variant ?? 'secondary'}`}
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
