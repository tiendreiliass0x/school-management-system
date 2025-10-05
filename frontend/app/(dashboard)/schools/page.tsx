import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Schools | School Management System'
}

const schools = [
  {
    name: 'Innovation High School',
    principal: 'Dr. Amelia Stone',
    email: 'innovation@schoolsystem.edu',
    phone: '+1 (555) 214-0001',
    students: 624,
    status: 'Operational'
  },
  {
    name: 'Lakeside Middle School',
    principal: 'Marcus Nguyen',
    email: 'lakeside@schoolsystem.edu',
    phone: '+1 (555) 214-0002',
    students: 482,
    status: 'Operational'
  },
  {
    name: 'Riverside Elementary',
    principal: 'Elena Martínez',
    email: 'riverside@schoolsystem.edu',
    phone: '+1 (555) 214-0003',
    students: 736,
    status: 'Onboarding'
  }
]

export default function SchoolsPage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Schools</h2>
        <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 600 }}>
          Manage all schools in your tenant, including contact information, enrollment, and status.
        </p>
      </header>
      <section className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Principal</th>
              <th>Contact</th>
              <th>Students</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.name}>
                <td style={{ fontWeight: 600 }}>{school.name}</td>
                <td>{school.principal}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <a href={`mailto:${school.email}`} style={{ color: 'var(--primary)' }}>
                      {school.email}
                    </a>
                    <span>{school.phone}</span>
                  </div>
                </td>
                <td>{school.students.toLocaleString()}</td>
                <td>
                  <span className={`badge ${school.status === 'Operational' ? 'success' : 'warning'}`}>
                    {school.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
