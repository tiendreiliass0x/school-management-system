import type { Metadata } from 'next'
import './globals.css'
import { appConfig } from '@/lib/config'

export const metadata: Metadata = {
  title: `${appConfig.name} | Admin Console`,
  description: appConfig.description,
  keywords: ['school management', 'education', 'saas', 'admin portal']
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
