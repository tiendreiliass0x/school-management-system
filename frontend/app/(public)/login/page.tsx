import Link from 'next/link'
import { Metadata } from 'next'
import { appConfig } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Sign in | School Management System'
}

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, rgba(37,99,235,0.08), transparent 60%)'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 40,
          borderRadius: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 24
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ margin: 0 }}>{appConfig.name}</h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>{appConfig.description}</p>
        </header>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          action={`${appConfig.apiBaseUrl}/api/auth/login`}
          method="post"
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>Email address</span>
            <input
              type="email"
              name="email"
              required
              placeholder="you@school.edu"
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                fontSize: 16
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>Password</span>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                fontSize: 16
              }}
            />
          </label>
          <button type="submit" className="primary-button" style={{ width: '100%', justifyContent: 'center' }}>
            Sign in
          </button>
        </form>
        <footer style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--muted)' }}>
          <Link href="/" style={{ color: 'var(--primary)' }}>
            Back to dashboard
          </Link>
          <span>Need access? Contact your administrator.</span>
        </footer>
      </div>
    </main>
  )
}
