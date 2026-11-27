import { createContext, useContext } from 'react'
import type * as api from './api'

export type AuthState = {
  /** True until the stored session and, if signed in, the account are known. Show nothing meanwhile. */
  loading: boolean
  session: api.Session | null
  account: api.Account | null
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
