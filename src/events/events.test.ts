import { describe, expect, it } from 'vitest'
import { createEventLog, createSignInFeed, createUserDirectory, FEED_CAP } from './events'
import type { AppEvent } from './types'

const ev = (id: string): AppEvent => ({ id, type: 'card.moved', actor: 'hoa', at: 1 })

describe('event log: duplicate events', () => {
  it('records a new event', () => {
    const log = createEventLog()
    expect(log.record(ev('e1')).ok).toBe(true)
    expect(log.all()).toHaveLength(1)
  })

  it('refuses the same event id twice with 409 and keeps one row', () => {
    const log = createEventLog()
    log.record(ev('e1'))
    const r = log.record(ev('e1'))
    expect(r).toEqual({ ok: false, error: expect.objectContaining({ status: 409, field: 'id' }) })
    expect(log.all()).toHaveLength(1)
  })

  it('refuses an event with an empty id with 400', () => {
    const r = createEventLog().record(ev(''))
    expect(r).toEqual({ ok: false, error: expect.objectContaining({ status: 400, field: 'id' }) })
  })
})

describe('event log: transaction guard', () => {
  it('commits every record when the callback succeeds', () => {
    const log = createEventLog()
    const r = log.transaction((tx) => {
      tx.record(ev('e1'))
      tx.record(ev('e2'))
      return { ok: true, value: 'done' }
    })
    expect(r).toEqual({ ok: true, value: 'done' })
    expect(log.all().map((e) => e.id)).toEqual(['e1', 'e2'])
  })

  it('rolls back everything when a record inside is refused, and returns that error', () => {
    const log = createEventLog()
    log.record(ev('e1'))
    const r = log.transaction((tx) => {
      tx.record(ev('e2'))
      const dup = tx.record(ev('e1'))
      return dup.ok ? { ok: true, value: 'x' } : dup
    })
    expect(r).toEqual({ ok: false, error: expect.objectContaining({ status: 409 }) })
    expect(log.all().map((e) => e.id)).toEqual(['e1'])
  })

  it('rolls back when the callback throws and returns a 500 error without throwing', () => {
    const log = createEventLog()
    const r = log.transaction((tx) => {
      tx.record(ev('e1'))
      throw new Error('boom')
    })
    expect(r).toEqual({ ok: false, error: expect.objectContaining({ status: 500 }) })
    expect(log.all()).toHaveLength(0)
  })

  it('allows the same id again after a rollback', () => {
    const log = createEventLog()
    log.transaction((tx) => {
      tx.record(ev('e1'))
      throw new Error('boom')
    })
    expect(log.record(ev('e1')).ok).toBe(true)
  })
})

describe('refused sign-ins feed', () => {
  const attempt = (n: number) => ({ email: 'a@x.test', reason: 'wrong password', at: n })

  it('keeps every repeated attempt of the same email, newest first', () => {
    const feed = createSignInFeed()
    for (let i = 1; i <= 5; i++) feed.recordRefused(attempt(i))
    expect(feed.list().map((a) => a.at)).toEqual([5, 4, 3, 2, 1])
  })

  it('caps the feed at 200 rows and drops the oldest', () => {
    const feed = createSignInFeed()
    for (let i = 1; i <= 250; i++) feed.recordRefused(attempt(i))
    const rows = feed.list()
    expect(FEED_CAP).toBe(200)
    expect(rows).toHaveLength(200)
    expect(rows[0].at).toBe(250)
    expect(rows[199].at).toBe(51)
  })

  it('does not change the stored feed when the returned list is modified', () => {
    const feed = createSignInFeed()
    feed.recordRefused(attempt(1))
    feed.list().pop()
    expect(feed.list()).toHaveLength(1)
  })
})

describe('user directory: duplicate email', () => {
  it('registers a new email', () => {
    expect(createUserDirectory().register('hoa@x.test')).toEqual({ ok: true, value: 'hoa@x.test' })
  })

  it('refuses a duplicate email with 409 at the email field', () => {
    const dir = createUserDirectory()
    dir.register('hoa@x.test')
    expect(dir.register('hoa@x.test')).toEqual({
      ok: false,
      error: expect.objectContaining({ status: 409, field: 'email' }),
    })
  })

  it('treats case and surrounding spaces as the same email', () => {
    const dir = createUserDirectory()
    dir.register('hoa@x.test')
    const r = dir.register('  HOA@X.test ')
    expect(r).toEqual({ ok: false, error: expect.objectContaining({ status: 409 }) })
  })

  it('refuses a malformed email with 400', () => {
    expect(createUserDirectory().register('not-an-email')).toEqual({
      ok: false,
      error: expect.objectContaining({ status: 400, field: 'email' }),
    })
  })
})
