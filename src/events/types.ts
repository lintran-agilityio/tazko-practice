export type AppError = {
  status: 400 | 409 | 500
  field?: string
  message: string
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError }

export type AppEvent = { id: string; type: string; actor: string; at: number }

export type RefusedSignIn = { email: string; reason: string; at: number }

export interface EventLog {
  record(event: AppEvent): Result<AppEvent>
  all(): AppEvent[]
  /** Runs fn atomically: an error result or a throw undoes every record made inside. */
  transaction<T>(fn: (log: EventLog) => Result<T>): Result<T>
}

export interface SignInFeed {
  recordRefused(attempt: RefusedSignIn): void
  /** Newest first, never more than 200 rows. */
  list(): RefusedSignIn[]
}

export interface UserDirectory {
  register(email: string): Result<string>
}
