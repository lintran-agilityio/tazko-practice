import { Navigate, Outlet, useLocation } from 'react-router'
import { signInPath } from '../../app/routes'
import { useAuth } from './useAuth'

type From = { from?: string }

/** Only a path inside the app is a safe place to return to after sign in. */
const safe = (from: unknown): string =>
  typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'

/** Everything except Sign in and /accept-invite sits behind this (M3). Shows nothing while loading. */
export function RequireAuth() {
  const { loading, session, leftOnPurpose } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!session) {
    // Sign out forgets the page; a signed-out visit or an expired session keeps it.
    const from = leftOnPurpose ? undefined : location.pathname + location.search + location.hash
    return <Navigate to={signInPath} replace state={{ from } satisfies From} />
  }
  return <Outlet />
}

/** Sign in is for signed-out visitors: a signed-in person goes back where they were headed, or Home. */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (session) return <Navigate to={safe((location.state as From | null)?.from)} replace />
  return children
}
