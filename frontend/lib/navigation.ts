import { LucideIcon, LayoutDashboard, School, Users, NotepadText, GraduationCap, BarChart3, Settings } from 'lucide-react'

export interface NavigationItem {
  name: string
  description: string
  href: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  {
    name: 'Overview',
    description: 'Real-time insight into enrollment, attendance, and system health.',
    href: '/',
    icon: LayoutDashboard
  },
  {
    name: 'Schools',
    description: 'Manage campuses, contact information, and operational settings.',
    href: '/schools',
    icon: School
  },
  {
    name: 'Classes',
    description: 'Create classes, assign teachers, and track schedules.',
    href: '/classes',
    icon: GraduationCap
  },
  {
    name: 'Assignments',
    description: 'Publish assignments, collect submissions, and manage grading.',
    href: '/assignments',
    icon: NotepadText
  },
  {
    name: 'Students',
    description: 'Centralized directory of students with guardianship information.',
    href: '/students',
    icon: Users
  },
  {
    name: 'Analytics',
    description: 'Performance indicators and operational analytics across schools.',
    href: '/analytics',
    icon: BarChart3
  },
  {
    name: 'Settings',
    description: 'Tenant configuration, authentication policies, and integrations.',
    href: '/settings',
    icon: Settings
  }
]
