import { Metadata } from 'next'
import { appConfig } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Settings | School Management System'
}

const securityPolicies = [
  'Enforce SSO with automatic provisioning via SCIM for district-managed accounts.',
  'Rotate JWT signing secrets every 90 days with automated rollouts.',
  'Enable adaptive MFA challenges for anomalous login activity.',
  'Enforce password policy: minimum 14 characters with complexity requirements.'
]

export default function SettingsPage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Settings</h2>
        <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 640 }}>
          Configure tenant-wide preferences, authentication policies, and third-party integrations.
        </p>
      </header>
      <section className="grid two-col">
        <article className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0 }}>Tenant Profile</h3>
          <dl style={{ display: 'grid', gap: 12, margin: 0 }}>
            <div>
              <dt style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12, color: 'var(--muted)' }}>Application</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>{appConfig.name}</dd>
            </div>
            <div>
              <dt style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12, color: 'var(--muted)' }}>Version</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>{appConfig.version}</dd>
            </div>
            <div>
              <dt style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12, color: 'var(--muted)' }}>API Endpoint</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>{appConfig.apiBaseUrl}</dd>
            </div>
          </dl>
        </article>
        <article className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0 }}>Security Policies</h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)' }}>
            {securityPolicies.map((policy) => (
              <li key={policy}>{policy}</li>
            ))}
          </ul>
        </article>
      </section>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ margin: 0 }}>Integrations</h3>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Connect SIS, HRIS, and communication platforms to synchronize rosters, attendance, and analytics in real time.
        </p>
        <div className="grid two-col">
          <div>
            <h4 style={{ margin: '12px 0 8px' }}>Learning Management Systems</h4>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Canvas, Google Classroom, Schoology</p>
          </div>
          <div>
            <h4 style={{ margin: '12px 0 8px' }}>Identity Providers</h4>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Okta, Azure AD, Google Workspace</p>
          </div>
        </div>
      </section>
    </main>
  )
}
