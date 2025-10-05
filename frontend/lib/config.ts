export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? 'School Management System',
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
    'A modern, secure platform for managing schools and academic workflows.',
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
} as const
