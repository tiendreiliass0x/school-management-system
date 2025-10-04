import { HealthResponse } from '@/lib/api'

interface HealthStatusProps {
  health: HealthResponse | null
}

export function HealthStatus({ health }: HealthStatusProps) {
  if (!health) {
    return (
      <div className="card">
        <h3>System Health</h3>
        <p>Unable to reach the API. Confirm that the backend service is running and accessible.</p>
        <span className="badge danger">Offline</span>
      </div>
    )
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>System Health</h3>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Backend status and service uptime.</p>
        </div>
        <span className="badge success">Operational</span>
      </div>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, margin: 0 }}>
        <div>
          <dt style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</dt>
          <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>{health.status}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Timestamp</dt>
          <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>{new Date(health.timestamp).toLocaleString()}</dd>
        </div>
        {health.version && (
          <div>
            <dt style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Version</dt>
            <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>{health.version}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
