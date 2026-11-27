import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** The only auth file that talks to supabase-js. Everything else goes through these functions. */
export type Session = { userId: string; email: string }
export type Role = 'owner' | 'member' | 'observer'
export type Account = { displayName: string; role: Role | null; isSuperAdmin: boolean }

// Created on first use so importing this module never needs the environment.
let client: SupabaseClient | null = null
const supabase = (): SupabaseClient => {
  client ??= createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  )
  return client
}

const toSession = (s: { user: { id: string; email?: string } } | null): Session | null =>
  s ? { userId: s.user.id, email: s.user.email ?? '' } : null

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase().auth.getSession()
  return toSession(data.session)
}

/** Calls back on sign in, sign out, expiry and refresh. Returns the unsubscribe function. */
export function onAuthChange(cb: (s: Session | null) => void): () => void {
  const { data } = supabase().auth.onAuthStateChange((_event, s) => cb(toSession(s)))
  return () => data.subscription.unsubscribe()
}

export type SignInError = {
  kind: 'invalid_credentials' | 'weak_password' | 'refused' | 'other'
  message: string
}

const NOT_RIGHT = 'The email or password is not right'
/** Matches the Auth password rules in supabase/config.jsonc. */
const WEAK_PASSWORD =
  'The password needs at least 6 characters, an uppercase letter, a lowercase letter, a digit and a special character'

/**
 * Maps by HTTP status and error code, never by message text. The access token hook's 403 stays
 * generic, so nobody can probe which domains were removed (G-20; its own message is M3b).
 */
export function mapSignInError(status: number | undefined, code: string | undefined): SignInError {
  if (code === 'weak_password' || status === 422) return { kind: 'weak_password', message: WEAK_PASSWORD }
  if (status === 400) return { kind: 'invalid_credentials', message: NOT_RIGHT }
  if (status === 403) return { kind: 'refused', message: NOT_RIGHT }
  return { kind: 'other', message: 'Could not sign in. Try again' }
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ error: SignInError | null }> {
  const { error } = await supabase().auth.signInWithPassword({ email, password })
  return { error: error ? mapSignInError(error.status, error.code) : null }
}

/** `local` ends this browser's session only, as a fallback when the server call fails. */
export async function signOut(scope?: 'local'): Promise<void> {
  await supabase().auth.signOut(scope ? { scope } : undefined)
}

/** The role comes from last_company_id, else the first active membership (I11). RLS limits the rows. */
export async function loadAccount(userId: string): Promise<Account> {
  const sb = supabase()
  const [profile, memberships] = await Promise.all([
    sb
      .from('profiles')
      .select('display_name, is_super_admin, last_company_id')
      .eq('id', userId)
      .single(),
    sb
      .from('memberships')
      .select('company_id, role')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ])
  if (profile.error) throw profile.error
  if (memberships.error) throw memberships.error
  const rows = memberships.data as { company_id: string; role: Role }[]
  const current = rows.find((m) => m.company_id === profile.data.last_company_id) ?? rows[0]
  return {
    displayName: profile.data.display_name,
    role: current?.role ?? null,
    isSuperAdmin: profile.data.is_super_admin,
  }
}

/** Company domains from VITE_ALLOWED_EMAIL_DOMAINS (comma separated). A hint only; the database decides (G-20). */
export function allowedDomains(): string[] {
  return ((import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS as string | undefined) ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}
