import { randomUUID } from 'node:crypto'
import pg from 'pg'

const url = process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

export type User = { id: string; email: string }

export type Db = {
  /** Run as the database owner (like the seed script or the service role). */
  admin: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>
  /** Run as a signed-in app user: role authenticated plus that user's JWT claims. */
  as: (user: User, sql: string, params?: unknown[]) => Promise<pg.QueryResult>
  /** Run as the anonymous role. */
  anon: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>
}

/** Runs `fn` inside a transaction that is always rolled back, so tests leave no rows behind. */
export async function inTx(fn: (db: Db) => Promise<void>): Promise<void> {
  const client = new pg.Client({ connectionString: url })
  await client.connect()

  // A failed statement aborts a transaction, so each call gets a savepoint.
  const run = async (
    setup: (() => Promise<void>) | null,
    sql: string,
    params: unknown[],
  ) => {
    await client.query('savepoint step')
    try {
      if (setup) await setup()
      const result = await client.query(sql, params)
      await client.query('reset role')
      await client.query('release savepoint step')
      return result
    } catch (error) {
      await client.query('rollback to savepoint step')
      throw error
    }
  }

  const db: Db = {
    admin: (sql, params = []) => run(null, sql, params),
    anon: (sql, params = []) =>
      run(async () => void (await client.query('set local role anon')), sql, params),
    as: (user, sql, params = []) =>
      run(
        async () => {
          await client.query('set local role authenticated')
          await client.query("select set_config('request.jwt.claims', $1, true)", [
            JSON.stringify({ sub: user.id, email: user.email, role: 'authenticated' }),
          ])
        },
        sql,
        params,
      ),
  }

  try {
    await client.query('begin')
    await fn(db)
  } finally {
    await client.query('rollback').catch(() => undefined)
    await client.end()
  }
}

export const domain = 'tazko-test.example'

/** Two companies and five people, shaped like G-8 (plus a stranger with no membership). */
export async function seed(db: Db) {
  const ids = {
    harbor: randomUUID(),
    orchard: randomUUID(),
  }
  const user = (name: string): User => ({ id: randomUUID(), email: `${name}@${domain}` })
  const people = {
    linh: user('linh'), // Super admin
    minh: user('minh'), // Owner of both companies
    hoa: user('hoa'), // Member of Harbor
    khoa: user('khoa'), // Observer of Harbor
    stranger: user('stranger'), // Belongs to no company
  }

  await db.admin('insert into public.allowed_domains (domain) values ($1)', [domain])
  for (const [name, p] of Object.entries(people)) {
    await db.admin('insert into auth.users (id, email) values ($1, $2)', [p.id, p.email])
    await db.admin('update public.profiles set display_name = $2 where id = $1', [
      p.id,
      name[0].toUpperCase() + name.slice(1),
    ])
  }
  await db.admin('update public.profiles set is_super_admin = true where id = $1', [
    people.linh.id,
  ])
  await db.admin('insert into public.companies (id, name) values ($1, $2), ($3, $4)', [
    ids.harbor,
    'Test Harbor',
    ids.orchard,
    'Test Orchard',
  ])

  const membership = async (company: string, p: User, role: string) =>
    (
      await db.admin(
        'insert into public.memberships (company_id, user_id, role) values ($1, $2, $3) returning id',
        [company, p.id, role],
      )
    ).rows[0].id as string

  const m = {
    minhHarbor: await membership(ids.harbor, people.minh, 'owner'),
    minhOrchard: await membership(ids.orchard, people.minh, 'owner'),
    hoa: await membership(ids.harbor, people.hoa, 'member'),
    khoa: await membership(ids.harbor, people.khoa, 'observer'),
  }

  return { ...ids, ...people, people, memberships: m }
}
