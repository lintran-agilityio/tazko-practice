import { describe, expect, it } from 'vitest'
import { domain, inTx } from './db.ts'

describe('grants (G-19)', () => {
  it('no table in public grants DELETE or TRUNCATE to an app role', async () => {
    await inTx(async (db) => {
      const { rows } = await db.admin(
        `select table_name, grantee, privilege_type
           from information_schema.role_table_grants
          where table_schema = 'public'
            and grantee in ('anon', 'authenticated', 'service_role')
            and privilege_type in ('DELETE', 'TRUNCATE')`,
      )
      expect(rows).toEqual([])
    })
  })

  it('has the tables the plan names', async () => {
    await inTx(async (db) => {
      const { rows } = await db.admin(
        `select table_name from information_schema.tables where table_schema = 'public'`,
      )
      const names = rows.map((r) => r.table_name)
      for (const t of ['companies', 'profiles', 'memberships', 'allowed_domains', 'admin_sessions']) {
        expect(names).toContain(t)
      }
    })
  })

  it('has archived_at and archived_by on memberships (G-19)', async () => {
    await inTx(async (db) => {
      const { rows } = await db.admin(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'memberships'`,
      )
      const cols = rows.map((r) => r.column_name)
      expect(cols).toEqual(expect.arrayContaining(['archived_at', 'archived_by']))
    })
  })

  it('anon reads nothing', async () => {
    await inTx(async (db) => {
      await expect(db.anon('select * from public.companies')).rejects.toThrow(/permission denied/)
      await expect(db.anon('select * from public.memberships')).rejects.toThrow(/permission denied/)
    })
  })
})

describe('company email guard on auth.users (G-20)', () => {
  const addDomain = (db: Parameters<Parameters<typeof inTx>[0]>[0]) =>
    db.admin('insert into public.allowed_domains (domain) values ($1)', [domain])

  it('accepts a new user on an allowed domain', async () => {
    await inTx(async (db) => {
      await addDomain(db)
      await db.admin('insert into auth.users (id, email) values (gen_random_uuid(), $1)', [
        `new@${domain}`,
      ])
      const { rows } = await db.admin('select count(*)::int as n from public.profiles')
      expect(rows[0].n).toBe(1)
    })
  })

  it('refuses a personal address with a clear message', async () => {
    await inTx(async (db) => {
      await addDomain(db)
      await expect(
        db.admin('insert into auth.users (id, email) values (gen_random_uuid(), $1)', [
          'someone@gmail.com',
        ]),
      ).rejects.toThrow(/company account/i)
    })
  })

  it('refuses the same domain in another case or with a look-alike suffix', async () => {
    await inTx(async (db) => {
      await addDomain(db)
      await db.admin('insert into auth.users (id, email) values (gen_random_uuid(), $1)', [
        `Upper@${domain.toUpperCase()}`,
      ])
      await expect(
        db.admin('insert into auth.users (id, email) values (gen_random_uuid(), $1)', [
          `evil@${domain}.attacker.test`,
        ]),
      ).rejects.toThrow(/company account/i)
    })
  })

  it('refuses an email change to a personal address', async () => {
    await inTx(async (db) => {
      await addDomain(db)
      const id = (
        await db.admin(
          'insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id',
          [`ok@${domain}`],
        )
      ).rows[0].id
      await expect(
        db.admin('update auth.users set email = $2 where id = $1', [id, 'ok@gmail.com']),
      ).rejects.toThrow(/company account/i)
    })
  })

  it('refuses every address once the domain is archived', async () => {
    await inTx(async (db) => {
      await addDomain(db)
      await db.admin('update public.allowed_domains set archived_at = now() where domain = $1', [
        domain,
      ])
      await expect(
        db.admin('insert into auth.users (id, email) values (gen_random_uuid(), $1)', [
          `late@${domain}`,
        ]),
      ).rejects.toThrow(/company account/i)
    })
  })
})

describe('defaults for tables and functions created later (security review)', () => {
  it('a new table gets no grant for anon or authenticated, and a new function is not callable by anon', async () => {
    await inTx(async (db) => {
      await db.admin('create table public.zz_probe (id int)')
      await db.admin('create function public.zz_probe_fn() returns int language sql as $$ select 1 $$')
      const grants = await db.admin(
        `select grantee, privilege_type from information_schema.role_table_grants
          where table_schema = 'public' and table_name = 'zz_probe'
            and grantee in ('anon', 'authenticated')`,
      )
      expect(grants.rows).toEqual([])
      const fn = await db.admin(
        `select has_function_privilege('anon', 'public.zz_probe_fn()', 'execute') as anon_can,
                has_function_privilege('authenticated', 'public.zz_probe_fn()', 'execute') as auth_can`,
      )
      expect(fn.rows[0]).toEqual({ anon_can: false, auth_can: false })
    })
  })

  it('every table in public has RLS on and no grant to anon', async () => {
    await inTx(async (db) => {
      const off = await db.admin(
        `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
      )
      expect(off.rows).toEqual([])
      const anon = await db.admin(
        `select table_name from information_schema.role_table_grants
          where table_schema = 'public' and grantee = 'anon'`,
      )
      expect(anon.rows).toEqual([])
    })
  })
})

