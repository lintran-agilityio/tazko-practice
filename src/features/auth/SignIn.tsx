import { useState, type FormEvent } from 'react'
import * as api from './api'

const field =
  'min-h-(--tap-min) w-full rounded-md border border-field-border bg-surface px-3 aria-invalid:border-red-700'
const message = 'mt-1 text-sm text-red-700'

type Errors = { email?: string; password?: string; form?: string }

/** Browser check, a hint only: the database refuses other addresses again (G-20, G-21). */
function check(email: string, password: string): Errors {
  const errors: Errors = {}
  if (!email) errors.email = 'Enter your email'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email'
  else {
    const domains = api.allowedDomains()
    const domain = email.slice(email.lastIndexOf('@') + 1)
    if (domains.length > 0 && !domains.includes(domain)) errors.email = 'Use your company account'
  }
  if (!password) errors.password = 'Enter your password'
  return errors
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    const clean = email.trim().toLowerCase()
    const found = check(clean, password)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setPending(true)
    try {
      const { error } = await api.signInWithPassword(clean, password)
      if (error) setErrors({ form: error.message })
    } catch {
      setErrors({ form: 'Could not sign in. Try again' })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
      <p className="text-xl font-bold">Tazko</p>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-hint' : undefined}
            className={field}
          />
          {errors.email && (
            <p id="email-hint" className={message}>
              {errors.email}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-hint' : undefined}
            className={field}
          />
          {errors.password && (
            <p id="password-hint" className={message}>
              {errors.password}
            </p>
          )}
        </div>
        {errors.form && (
          <p role="alert" className={message}>
            {errors.form}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-(--tap-min) rounded-md bg-accent px-4 font-semibold text-white disabled:opacity-60"
        >
          Sign in
        </button>
      </form>
    </main>
  )
}
