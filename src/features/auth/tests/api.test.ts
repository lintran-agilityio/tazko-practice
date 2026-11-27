import { beforeEach, describe, expect, it, vi } from 'vitest'

// The real api.ts, with supabase-js replaced: sign-in errors are mapped by status and code,
// never by message text (M3, owner decision).
const signIn = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { signInWithPassword: signIn } }),
}))

import { signInWithPassword } from '../api'

const fail = (status: number | undefined, code: string | undefined, message: string) =>
  signIn.mockResolvedValue({ data: {}, error: { status, code, message } })

describe('signInWithPassword error mapping', () => {
  beforeEach(() => signIn.mockReset())

  it('returns no error on success', async () => {
    signIn.mockResolvedValue({ data: {}, error: null })
    expect(await signInWithPassword('a@b.co', 'pw')).toEqual({ error: null })
  })

  it('maps 400 invalid credentials to the generic message', async () => {
    fail(400, 'invalid_credentials', 'anything')
    expect(await signInWithPassword('a@b.co', 'pw')).toEqual({
      error: { kind: 'invalid_credentials', message: 'The email or password is not right' },
    })
  })

  it('maps by status, not by message text', async () => {
    fail(400, undefined, 'Invalid login credentials')
    expect((await signInWithPassword('a@b.co', 'pw')).error?.kind).toBe('invalid_credentials')
    fail(400, undefined, 'Something unrelated')
    expect((await signInWithPassword('a@b.co', 'pw')).error?.kind).toBe('invalid_credentials')
  })

  it.each([
    [422, 'weak_password'],
    [422, undefined],
    [400, 'weak_password'],
  ])('maps a weak password (%s, %s) to a message listing what is missing', async (status, code) => {
    fail(status, code, 'x')
    const { error } = await signInWithPassword('a@b.co', 'pw')
    expect(error?.kind).toBe('weak_password')
    for (const part of ['6 characters', 'uppercase', 'lowercase', 'digit', 'special character']) {
      expect(error?.message).toContain(part)
    }
  })

  it('keeps the access token hook 403 generic, without its text', async () => {
    fail(403, 'unexpected_failure', 'email_domain_not_allowed: Use your company account')
    const { error } = await signInWithPassword('a@b.co', 'pw')
    expect(error).toEqual({
      kind: 'refused',
      message: 'The email or password is not right',
    })
    expect(JSON.stringify(error)).not.toContain('domain')
  })

  it('maps a network failure or a server error to a try again message', async () => {
    fail(undefined, undefined, 'Failed to fetch')
    expect((await signInWithPassword('a@b.co', 'pw')).error).toEqual({
      kind: 'other',
      message: 'Could not sign in. Try again',
    })
    fail(500, undefined, 'boom')
    expect((await signInWithPassword('a@b.co', 'pw')).error?.kind).toBe('other')
  })
})
