import { getHealthStatus } from '@/lib/api'
import { StatsCard } from '@/components/ui/StatsCard'
import { HealthStatus } from '@/components/ui/HealthStatus'
import { navigationItems } from '@/lib/navigation'
import { Users, BookOpenCheck, TrendingUp } from 'lucide-react'

const summaryMetrics = [
  {
    title: 'Active Students',
    value: '1,842',
    description: 'Enrolled across all schools for the current academic year.',
    icon: <Users size={24} strokeWidth={1.5} />,
    trend: { value: '+4.7% vs. last term', direction: 'up' as const }
  },
  {
    title: 'Assignments Submitted',
    value: '3,209',
    description: 'Assignments received within the last 30 days.',
    icon: <BookOpenCheck size={24} strokeWidth={1.5} />,
    trend: { value: '+12.5% completion rate', direction: 'up' as const }
  },
  {
    title: 'Teacher Satisfaction',
    value: '94%',
    description: 'Average response to quarterly staff pulse survey.',
    icon: <TrendingUp size={24} strokeWidth={1.5} />,
    trend: { value: '+3.1% vs. previous quarter', direction: 'up' as const }
  }
]

const spotlightItems = navigationItems.slice(1, 4)

export default async function DashboardPage() {
  const health = await getHealthStatus()

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <section className="grid three-col">
        {summaryMetrics.map((metric) => (
          <StatsCard key={metric.title} {...metric} />
        ))}
      </section>

      <section className="grid two-col" style={{ alignItems: 'stretch' }}>
        <HealthStatus health={health} />
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>Operational Spotlight</h3>
              <p style={{ margin: 0, color: 'var(--muted)' }}>Track key modules that shape the academic experience.</p>
            </div>
            <span className="badge success">SLA 99.9%</span>
          </div>
          <div className="grid" style={{ gap: 16 }}>
            {spotlightItems.map((item) => (
              <article key={item.name} className="card" style={{ boxShadow: 'none', borderRadius: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: 'rgba(37,99,235,0.12)', padding: 12, borderRadius: 16 }}>
                    <item.icon size={22} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>{item.name}</h3>
                    <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{item.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>School Overview</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>A snapshot of school performance across your tenants.</p>
          </div>
          <a href="/schools" className="secondary-button" style={{ textDecoration: 'none' }}>
            View all schools
          </a>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>School</th>
                <th>Students</th>
                <th>Teachers</th>
                <th>Attendance</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Innovation High School', students: 624, teachers: 48, attendance: '96%', trend: '+1.2%' },
                { name: 'Lakeside Middle School', students: 482, teachers: 37, attendance: '94%', trend: '+0.6%' },
                { name: 'Riverside Elementary', students: 736, teachers: 52, attendance: '97%', trend: '+2.1%' }
              ].map((school) => (
                <tr key={school.name}>
                  <td style={{ fontWeight: 600 }}>{school.name}</td>
                  <td>{school.students.toLocaleString()}</td>
                  <td>{school.teachers}</td>
                  <td>{school.attendance}</td>
                  <td>
                    <span className="badge success">{school.trend}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
