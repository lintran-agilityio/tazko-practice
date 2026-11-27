import { useEffect, useState, type ReactNode } from 'react'
import * as api from './api'
import { AuthContext } from './useAuth'

const emptyAccount = (email: string): api.Account => ({
  displayName: email.split('@')[0] ?? '',
  role: null,
  isSuperAdmin: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [known, setKnown] = useState(false)
  const [leftOnPurpose, setLeftOnPurpose] = useState(false)
  const [session, setSession] = useState<api.Session | null>(null)
  const [account, setAccount] = useState<{ userId: string; value: api.Account } | null>(null)

  useEffect(() => {
    let live = true
    const unsubscribe = api.onAuthChange((s) => {
      if (!live) return
      if (s) setLeftOnPurpose(false)
      setSession((prev) => (prev?.userId === s?.userId && prev?.email === s?.email ? prev : s))
      setKnown(true)
    })
    api.getSession().then(
      (s) => {
        if (!live) return
        if (s) setLeftOnPurpose(false)
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
  const signOut = async () => {
    setLeftOnPurpose(true)
    let ended = false
    try {
      await api.signOut()
      ended = true
    } catch {
      try {
        await api.signOut('local')
        ended = true
      } catch {
        // Still signed in; nothing more to do here.
      }
    } finally {
      // A sign out that did not happen must not make a later expiry forget the page.
      if (!ended) setLeftOnPurpose(false)
    }
  }
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
    <AuthContext value={{ loading, session, account: current, signOut, leftOnPurpose }}>
      {children}
    </AuthContext>
  )
}
