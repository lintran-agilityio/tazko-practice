export type Screen = {
  path: string
  label: string
  group: 'main' | 'project' | 'superAdmin'
}

/** The 14 screens of the prototype (design/README.md). All sit inside the shell except Sign in (M3). */
export const screens: Screen[] = [
  { path: '/', label: 'Home', group: 'main' },
  { path: '/board', label: 'Board', group: 'main' },
  { path: '/board-list', label: 'Board as list', group: 'main' },
  { path: '/card', label: 'Card detail', group: 'main' },
  { path: '/search', label: 'Search', group: 'main' },
  { path: '/notifications', label: 'Notifications', group: 'main' },
  { path: '/profile', label: 'Profile', group: 'main' },
  { path: '/sign-in', label: 'Sign in', group: 'main' },
  { path: '/members', label: 'Members', group: 'project' },
  { path: '/labels', label: 'Labels', group: 'project' },
  { path: '/project-settings', label: 'Project settings', group: 'project' },
  { path: '/companies', label: 'Companies', group: 'superAdmin' },
  { path: '/company-detail', label: 'Company detail', group: 'superAdmin' },
  { path: '/usage', label: 'Usage', group: 'superAdmin' },
]

export const signInPath = '/sign-in'
export const acceptInvitePath = '/accept-invite'

export const groupLabels: Record<Screen['group'], string> = {
  main: 'Work',
  project: 'Project',
  superAdmin: 'Super admin',
}
