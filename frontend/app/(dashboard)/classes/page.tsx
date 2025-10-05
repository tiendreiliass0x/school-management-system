import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Classes | School Management System'
}

const classes = [
  {
    name: 'Honors Biology',
    teacher: 'Alice Johnson',
    schedule: 'Mon, Wed, Fri — 09:00 to 10:15',
    students: 28,
    capacity: 30
  },
  {
    name: 'World History',
    teacher: 'Samuel Lee',
    schedule: 'Tue, Thu — 11:00 to 12:30',
    students: 32,
    capacity: 35
  },
  {
    name: 'AP Calculus',
    teacher: 'Priya Patel',
    schedule: 'Mon, Wed, Fri — 13:00 to 14:15',
    students: 24,
    capacity: 28
  }
]

export default function ClassesPage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Classes</h2>
        <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 640 }}>
          Assign instructors, manage enrollment limits, and monitor academic schedules.
        </p>
      </header>
      <section className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Instructor</th>
                <th>Schedule</th>
                <th>Students</th>
                <th>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((course) => (
                <tr key={course.name}>
                  <td style={{ fontWeight: 600 }}>{course.name}</td>
                  <td>{course.teacher}</td>
                  <td>{course.schedule}</td>
                  <td>{course.students}</td>
                  <td>{course.capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
