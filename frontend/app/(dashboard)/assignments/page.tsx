import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Assignments | School Management System'
}

const assignments = [
  {
    title: 'Research Paper: Climate Action',
    course: 'Environmental Science',
    dueDate: '2024-09-20',
    submissions: 26,
    status: 'In Review'
  },
  {
    title: 'Algebra II Midterm',
    course: 'Algebra II',
    dueDate: '2024-09-25',
    submissions: 31,
    status: 'Grading'
  },
  {
    title: 'World War II Debate',
    course: 'World History',
    dueDate: '2024-09-18',
    submissions: 28,
    status: 'Published'
  }
]

export default function AssignmentsPage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Assignments</h2>
        <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 640 }}>
          Monitor assignment progress, review submissions, and ensure grading SLAs are met.
        </p>
      </header>
      <section className="table-container">
        <table>
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Course</th>
              <th>Due Date</th>
              <th>Submissions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.title}>
                <td style={{ fontWeight: 600 }}>{assignment.title}</td>
                <td>{assignment.course}</td>
                <td>{new Date(assignment.dueDate).toLocaleDateString()}</td>
                <td>{assignment.submissions}</td>
                <td>
                  <span className={`badge ${assignment.status === 'Published' ? 'warning' : 'success'}`}>
                    {assignment.status}
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
