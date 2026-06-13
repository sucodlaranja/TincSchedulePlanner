import { type ReactNode } from 'react'
import Button from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      {icon && <div className="text-gray-300 text-6xl">{icon}</div>}
      <div>
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
      </div>
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  )
}
