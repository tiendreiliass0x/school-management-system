'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PropsWithChildren, useState } from 'react'
import { navigationItems } from '@/lib/navigation'
import { appConfig } from '@/lib/config'
import { Menu, X } from 'lucide-react'
import clsx from 'clsx'

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const toggleMobileNav = () => setMobileNavOpen((open) => !open)

  return (
    <div className="app-shell">
      <aside className="sidebar" data-mobile-open={mobileNavOpen}>
        <div className="sidebar-header">
          <span style={{ fontSize: 12, opacity: 0.75, letterSpacing: '0.08em' }}>VERSION {appConfig.version}</span>
          <strong style={{ fontSize: 22 }}>{appConfig.name}</strong>
          <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>{appConfig.description}</p>
        </div>
        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={clsx('sidebar-link', { active })}
              >
                <Icon size={20} strokeWidth={1.5} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{item.description}</span>
                </div>
              </Link>
            )
          })
        </nav>
      </aside>
      <div className="content-area">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              aria-label="Toggle navigation"
              className="secondary-button"
              onClick={toggleMobileNav}
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
              <span style={{ fontSize: 14 }}>{mobileNavOpen ? 'Close' : 'Menu'}</span>
            </button>
            <div>
              <h1>School Management</h1>
              <p style={{ margin: 0, color: 'var(--muted)' }}>Operations overview</p>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="secondary-button" type="button">Download Report</button>
            <button className="primary-button" type="button">Add Record</button>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
