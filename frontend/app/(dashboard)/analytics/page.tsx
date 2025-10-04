import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics | School Management System'
}

const metrics = [
  {
    category: 'Attendance',
    description: 'Rolling 30-day attendance average across all campuses.',
    value: '95.4%',
    trend: '+0.8% vs previous period'
  },
  {
    category: 'Assessment Performance',
    description: 'Average proficiency across core subjects for the current term.',
    value: '88.2%',
    trend: '+2.4% vs previous term'
  },
  {
    category: 'Family Engagement',
    description: 'Guardian portal logins recorded in the last 14 days.',
    value: '1,204',
    trend: '+18.6% vs previous window'
  }
]

export default function AnalyticsPage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Analytics</h2>
        <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 640 }}>
          Analyze academic performance, attendance, and engagement trends to inform strategic decisions.
        </p>
      </header>
      <section className="grid three-col">
        {metrics.map((metric) => (
          <article key={metric.category} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0 }}>{metric.category}</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{metric.description}</p>
            <strong style={{ fontSize: 32 }}>{metric.value}</strong>
            <span className="badge success">{metric.trend}</span>
          </article>
        ))}
      </section>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ margin: 0 }}>Data Governance</h3>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Analytics are refreshed hourly and include only anonymized, aggregated insights that comply with FERPA and GDPR requirements.
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)' }}>
          <li>Role-based access controls ensure sensitive data remains secure.</li>
          <li>All reports are exportable as CSV or sent to S3 for downstream processing.</li>
          <li>Audit trails capture every analytics export for compliance reviews.</li>
        </ul>
      </section>
    </main>
  )
}
