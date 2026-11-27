import { vi } from "vitest";
import * as api from "../api";

/**
 * Contract for src/features/auth/api.ts (the only file that talks to supabase-js for auth).
 * Tests call `vi.mock('../api')` and drive the app through these helpers.
 *
 *   getSession(): Promise<{ userId: string; email: string } | null>
 *   onAuthChange(cb: (s: Session | null) => void): () => void    // returns unsubscribe
 *   signInWithPassword(email, password): Promise<{ error: string | null }>
 *   signOut(): Promise<void>
 *   loadAccount(userId): Promise<Account>   // I11: last_company_id, else first active membership
 *   allowedDomains(): string[]              // from VITE_ALLOWED_EMAIL_DOMAINS, a hint only (G-20)
 */
export type Session = { userId: string; email: string };
export type Account = {
  displayName: string;
  role: "owner" | "member" | "observer" | null;
  isSuperAdmin: boolean;
};

export const minh: Account = { displayName: "Minh", role: "owner", isSuperAdmin: false };
export const hoa: Account = { displayName: "Hoa", role: "member", isSuperAdmin: false };
export const khoa: Account = { displayName: "Khoa", role: "observer", isSuperAdmin: false };
export const linh: Account = { displayName: "Linh", role: null, isSuperAdmin: true };

export const domain = "acme.test";

export const session = (name: string): Session => ({
  userId: `id-${name}`,
  email: `${name}@${domain}`,
});

/** Sets up the mocked api. `session` null means signed out; `account` is what loadAccount returns. */
export function mockAuth(current: Session | null, account: Account = minh) {
  const m = vi.mocked(api);
  // vi.resetAllMocks() does not clear the call history of these automocks (vitest 5.1, vmThreads),
  // so a call in one test leaked into the next. Reset each function here.
  for (const fn of Object.values(api)) (fn as ReturnType<typeof vi.fn>).mockReset();
  let listener: ((s: Session | null) => void) | null = null;
  m.allowedDomains.mockReturnValue([domain]);
  m.getSession.mockResolvedValue(current);
  m.loadAccount.mockResolvedValue(account);
  m.signOut.mockResolvedValue(undefined);
  m.signInWithPassword.mockResolvedValue({ error: null });
  m.onAuthChange.mockImplementation((cb) => {
    listener = cb;
    return () => {
      listener = null;
    };
  });
  return {
    api: m,
    /** Simulates Supabase telling the app the session changed (sign in, sign out, expiry). */
    emit: (s: Session | null) => listener?.(s),
  };
}
