import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from './api'

export type AuthState = {
  /** True until the stored session and, if signed in, the account are known. Show nothing meanwhile. */
  loading: boolean
  session: api.Session | null
  account: api.Account | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const emptyAccount = (email: string): api.Account => ({
  displayName: email.split('@')[0] ?? '',
  role: null,
  isSuperAdmin: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [known, setKnown] = useState(false)
  const [session, setSession] = useState<api.Session | null>(null)
  const [account, setAccount] = useState<{ userId: string; value: api.Account } | null>(null)

  useEffect(() => {
    let live = true
    const unsubscribe = api.onAuthChange((s) => {
      if (!live) return
      setSession((prev) => (prev?.userId === s?.userId && prev?.email === s?.email ? prev : s))
      setKnown(true)
    })
    api.getSession().then(
      (s) => {
        if (!live) return
        setSession((prev) => prev ?? s)
        setKnown(true)
      },
      () => live && setKnown(true),
    )
    return () => {
      live = false
      unsubscribe()
    }
  }, [])

  const userId = session?.userId
  const email = session?.email ?? ''
  useEffect(() => {
    if (!userId) return
    let live = true
    api.loadAccount(userId).then(
      (value) => live && setAccount({ userId, value }),
      () => live && setAccount({ userId, value: emptyAccount(email) }),
    )
    return () => {
      live = false
    }
  }, [userId, email])

  const current = session && account?.userId === session.userId ? account.value : null
  const loading = !known || (session !== null && current === null)

  return (
    <AuthContext value={{ loading, session, account: current, signOut: api.signOut }}>
      {children}
    </AuthContext>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
