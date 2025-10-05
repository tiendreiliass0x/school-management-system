import { ReactNode } from 'react'
import clsx from 'clsx'

interface StatsCardProps {
  title: string
  value: string
  description?: string
  icon?: ReactNode
  trend?: {
    value: string
    direction: 'up' | 'down'
  }
}

export function StatsCard({ title, value, description, icon, trend }: StatsCardProps) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: '0.08em', color: 'var(--muted)' }}>{title}</p>
          <strong style={{ fontSize: 28 }}>{value}</strong>
        </div>
        {icon && <div style={{ background: 'rgba(37, 99, 235, 0.1)', borderRadius: 16, padding: 12 }}>{icon}</div>}
      </div>
      {description && (
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>{description}</p>
      )}
      {trend && (
        <span
          className={clsx('badge', trend.direction === 'up' ? 'success' : 'danger')}
          aria-label={`Trend ${trend.direction}`}
        >
          {trend.direction === 'up' ? '▲' : '▼'} {trend.value}
        </span>
      )}
    </div>
  )
}
