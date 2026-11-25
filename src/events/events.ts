import type {
  AppEvent,
  EventLog,
  RefusedSignIn,
  Result,
  SignInFeed,
  UserDirectory,
} from './types'

export const FEED_CAP = 200

const fail = (status: 400 | 409 | 500, message: string, field?: string): Result<never> => ({
  ok: false,
  error: { status, message, ...(field ? { field } : {}) },
})

export function createEventLog(): EventLog {
  let events: AppEvent[] = []

  const log: EventLog = {
    record(event) {
      if (!event.id) return fail(400, 'Event id is required', 'id')
      if (events.some((e) => e.id === event.id)) return fail(409, 'Event already recorded', 'id')
      events.push(event)
      return { ok: true, value: event }
    },
    all: () => [...events],
    transaction(fn) {
      const snapshot = events
      events = [...events]
      try {
        const result = fn(log)
        if (!result.ok) events = snapshot
        return result
      } catch {
        events = snapshot
        return fail(500, 'Transaction rolled back')
      }
    },
  }
  return log
}

export function createSignInFeed(): SignInFeed {
  let rows: RefusedSignIn[] = []
  return {
    recordRefused(attempt) {
      rows = [attempt, ...rows].slice(0, FEED_CAP)
    },
    list: () => [...rows],
  }
}

export function createUserDirectory(): UserDirectory {
  const emails = new Set<string>()
  return {
    register(raw) {
      const email = raw.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'Enter a valid email', 'email')
      if (emails.has(email)) return fail(409, 'This email is already registered', 'email')
      emails.add(email)
      return { ok: true, value: email }
    },
  }
}
