import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Students | School Management System'
}

const students = [
  {
    name: 'Emma Davis',
    grade: '10th',
    school: 'Innovation High School',
    guardian: 'Michael Davis',
    attendance: '98%'
  },
  {
    name: 'Noah Chen',
    grade: '8th',
    school: 'Lakeside Middle School',
    guardian: 'Grace Chen',
    attendance: '96%'
  },
  {
    name: 'Ava Patel',
    grade: '5th',
    school: 'Riverside Elementary',
    guardian: 'Rohan Patel',
    attendance: '99%'
  }
]

export default function StudentsPage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Students</h2>
        <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 640 }}>
          Access centralized student profiles, guardianship information, and attendance trends.
        </p>
      </header>
      <section className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Grade</th>
              <th>School</th>
              <th>Primary Guardian</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.name}>
                <td style={{ fontWeight: 600 }}>{student.name}</td>
                <td>{student.grade}</td>
                <td>{student.school}</td>
                <td>{student.guardian}</td>
                <td>
                  <span className="badge success">{student.attendance}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
