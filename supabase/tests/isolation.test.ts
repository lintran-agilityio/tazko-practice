import { describe, expect, it } from 'vitest'
import { inTx, seed } from './db.ts'

const names = (rows: { name?: string; display_name?: string }[]) =>
  rows.map((r) => r.name ?? r.display_name).sort()

describe('company isolation by RLS (T-1)', () => {
  it('a member reads only their own company', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      const { rows } = await db.as(s.hoa, 'select name from public.companies')
      expect(names(rows)).toEqual(['Test Harbor'])
      const mem = await db.as(s.hoa, 'select company_id from public.memberships')
      expect(new Set(mem.rows.map((r) => r.company_id))).toEqual(new Set([s.harbor]))
    })
  })

  it('an owner of both companies reads both', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      const { rows } = await db.as(s.minh, 'select name from public.companies')
      expect(names(rows)).toEqual(['Test Harbor', 'Test Orchard'])
    })
  })

  it('a person with no membership reads nothing', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      expect((await db.as(s.stranger, 'select * from public.companies')).rows).toEqual([])
      expect((await db.as(s.stranger, 'select * from public.memberships')).rows).toEqual([])
    })
  })

  it('a Super admin reads companies and memberships (G-14)', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      const c = await db.as(s.linh, "select name from public.companies where name like 'Test %'")
      expect(names(c.rows)).toEqual(['Test Harbor', 'Test Orchard'])
      const m = await db.as(s.linh, 'select id from public.memberships where company_id = any($1)', [
        [s.harbor, s.orchard],
      ])
      expect(m.rows).toHaveLength(4)
    })
  })

  it('a Super admin reads display names only through company_people', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      const own = await db.as(s.linh, 'select id from public.profiles')
      expect(own.rows.map((r) => r.id)).toEqual([s.linh.id])
      const people = await db.as(
        s.linh,
        'select display_name from public.company_people where company_id = any($1)',
        [[s.harbor, s.orchard]],
      )
      expect(names(people.rows)).toEqual(['Hoa', 'Khoa', 'Minh', 'Minh'])
    })
  })
})

describe('company_people', () => {
  it('shows co-members, archived ones included, and no other company', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await db.admin('update public.memberships set archived_at = now() where id = $1', [
        s.memberships.khoa,
      ])
      const { rows } = await db.as(s.hoa, 'select display_name, company_id from public.company_people')
      expect(names(rows)).toEqual(['Hoa', 'Khoa', 'Minh'])
      expect(new Set(rows.map((r) => r.company_id))).toEqual(new Set([s.harbor]))
    })
  })

  it('shows a non-member nothing', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      expect((await db.as(s.stranger, 'select * from public.company_people')).rows).toEqual([])
    })
  })

  it('never exposes last_company_id or is_super_admin of other people', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await expect(
        db.as(s.hoa, 'select last_company_id from public.company_people'),
      ).rejects.toThrow()
      await expect(
        db.as(s.hoa, 'select is_super_admin from public.company_people'),
      ).rejects.toThrow()
      const profiles = await db.as(s.hoa, 'select id from public.profiles')
      expect(profiles.rows.map((r) => r.id)).toEqual([s.hoa.id])
    })
  })
})

describe('archived rows read nothing (G-19)', () => {
  it('an archived membership reads nothing, not even the company', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await db.admin('update public.memberships set archived_at = now() where id = $1', [
        s.memberships.hoa,
      ])
      expect((await db.as(s.hoa, 'select * from public.memberships')).rows).toEqual([])
      expect((await db.as(s.hoa, 'select * from public.companies')).rows).toEqual([])
    })
  })

  it('an archived company is not read by its members', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await db.admin('update public.companies set archived_at = now() where id = $1', [s.harbor])
      expect((await db.as(s.hoa, 'select * from public.companies')).rows).toEqual([])
    })
  })

  it('a user whose domain is archived reads nothing at once (G-20)', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      expect((await db.as(s.minh, 'select * from public.companies')).rows).toHaveLength(2)
      await db.admin('update public.allowed_domains set archived_at = now()')
      for (const who of [s.minh, s.hoa, s.linh]) {
        expect((await db.as(who, 'select * from public.companies')).rows).toEqual([])
        expect((await db.as(who, 'select * from public.memberships')).rows).toEqual([])
        expect((await db.as(who, 'select * from public.profiles')).rows).toEqual([])
        expect((await db.as(who, 'select * from public.company_people')).rows).toEqual([])
      }
    })
  })
})

describe('nobody promotes themselves', () => {
  it('a Member cannot set is_super_admin on their own profile', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await expect(
        db.as(s.hoa, 'update public.profiles set is_super_admin = true where id = $1', [s.hoa.id]),
      ).rejects.toThrow(/permission denied/)
      const { rows } = await db.admin('select is_super_admin from public.profiles where id = $1', [
        s.hoa.id,
      ])
      expect(rows[0].is_super_admin).toBe(false)
    })
  })

  it('a Member cannot change their own role', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      const r = await db.as(s.hoa, "update public.memberships set role = 'owner' where id = $1", [
        s.memberships.hoa,
      ])
      expect(r.rowCount).toBe(0)
      const { rows } = await db.admin('select role from public.memberships where id = $1', [
        s.memberships.hoa,
      ])
      expect(rows[0].role).toBe('member')
    })
  })

  it('an Owner cannot change their own role either', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      const r = await db.as(s.minh, "update public.memberships set role = 'member' where id = $1", [
        s.memberships.minhHarbor,
      ])
      expect(r.rowCount).toBe(0)
    })
  })

  it('an Owner can change another person’s role', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      const r = await db.as(s.minh, "update public.memberships set role = 'observer' where id = $1", [
        s.memberships.hoa,
      ])
      expect(r.rowCount).toBe(1)
    })
  })

  it('an Owner of another company cannot touch this company’s memberships', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      // Harbor needs an Owner (last-Owner guard) before minh stops being one there.
      await db.admin(
        "insert into public.memberships (company_id, user_id, role) values ($1, $2, 'owner')",
        [s.harbor, s.stranger.id],
      )
      await db.admin("update public.memberships set role = 'member' where id = $1", [
        s.memberships.minhHarbor,
      ])
      const r = await db.as(s.minh, "update public.memberships set role = 'observer' where id = $1", [
        s.memberships.hoa,
      ])
      expect(r.rowCount).toBe(0)
    })
  })

  it('a Member cannot add themselves to another company', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await expect(
        db.as(
          s.hoa,
          "insert into public.memberships (company_id, user_id, role) values ($1, $2, 'owner')",
          [s.orchard, s.hoa.id],
        ),
      ).rejects.toThrow(/row-level security/)
    })
  })

  it('an Observer cannot write company data (BR-3)', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      const r = await db.as(s.khoa, "update public.companies set name = 'Hacked' where id = $1", [
        s.harbor,
      ])
      expect(r.rowCount).toBe(0)
    })
  })
})

describe('archiving a membership (TP-9)', () => {
  it('a plain PATCH of archived_at is not granted to the app', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await expect(
        db.as(s.minh, 'update public.memberships set archived_at = now() where id = $1', [
          s.memberships.hoa,
        ]),
      ).rejects.toThrow(/permission denied/)
    })
  })

  it('answer: even with the column granted, a plain PATCH fails under an active-only SELECT policy', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await db.admin('grant update (archived_at) on public.memberships to authenticated')
      await expect(
        db.as(s.minh, 'update public.memberships set archived_at = now() where id = $1', [
          s.memberships.hoa,
        ]),
      ).rejects.toThrow(/row-level security/)
    })
  })

  it('an Owner archives a membership through the RPC, and that person then reads nothing', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await db.as(s.minh, 'select public.archive_membership($1)', [s.memberships.hoa])
      expect((await db.as(s.hoa, 'select * from public.memberships')).rows).toEqual([])
      const { rows } = await db.admin(
        'select archived_by from public.memberships where id = $1',
        [s.memberships.hoa],
      )
      expect(rows[0].archived_by).toBe(s.minh.id)
    })
  })

  it('a Member cannot archive a membership through the RPC', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await expect(
        db.as(s.hoa, 'select public.archive_membership($1)', [s.memberships.khoa]),
      ).rejects.toThrow(/not allowed/i)
    })
  })

  it('an Owner cannot archive their own membership', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await expect(
        db.as(s.minh, 'select public.archive_membership($1)', [s.memberships.minhHarbor]),
      ).rejects.toThrow(/own membership/i)
    })
  })
})

describe('input validation reaches the database (G-21)', () => {
  it('refuses an empty company name', async () => {
    await inTx(async (db) => {
      await expect(db.admin("insert into public.companies (name) values ('   ')")).rejects.toThrow(
        /check constraint/,
      )
    })
  })

  it('refuses a duplicate company name in any case with a unique violation (409)', async () => {
    await inTx(async (db) => {
      await db.admin("insert into public.companies (name) values ('Test Harbor')")
      await expect(
        db.admin("insert into public.companies (name) values ('test harbor')"),
      ).rejects.toMatchObject({ code: '23505' })
    })
  })

  it('refuses a display name longer than 80 characters', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await expect(
        db.as(s.hoa, 'update public.profiles set display_name = $2 where id = $1', [
          s.hoa.id,
          'x'.repeat(81),
        ]),
      ).rejects.toThrow(/check constraint/)
    })
  })
})

describe('an archived company stops its Owners writing (security review)', () => {
  it('an Owner of an archived company cannot add a member or archive one', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await db.admin('update public.companies set archived_at = now() where id = $1', [s.harbor])
      await expect(
        db.as(
          s.minh,
          "insert into public.memberships (company_id, user_id, role) values ($1, $2, 'member')",
          [s.harbor, s.stranger.id],
        ),
      ).rejects.toThrow(/row-level security/)
      await expect(
        db.as(s.minh, 'select public.archive_membership($1)', [s.memberships.hoa]),
      ).rejects.toThrow(/not allowed/i)
    })
  })
})

describe('a company always keeps one active Owner (security review)', () => {
  it('refuses to demote or archive the last Owner', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await expect(
        db.admin("update public.memberships set role = 'member' where id = $1", [
          s.memberships.minhOrchard,
        ]),
      ).rejects.toThrow(/at least one Owner/i)
      await expect(
        db.admin('update public.memberships set archived_at = now() where id = $1', [
          s.memberships.minhOrchard,
        ]),
      ).rejects.toThrow(/at least one Owner/i)
    })
  })

  it('allows removing an Owner while another remains, but not the one left', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      // hoa already has a Member row in Harbor; promote it so Harbor has two Owners.
      await db.admin("update public.memberships set role = 'owner' where id = $1", [
        s.memberships.hoa,
      ])
      await db.as(s.minh, 'select public.archive_membership($1)', [s.memberships.hoa])
      await expect(
        db.admin("update public.memberships set role = 'member' where id = $1", [
          s.memberships.minhHarbor,
        ]),
      ).rejects.toThrow(/at least one Owner/i)
    })
  })
})

describe('restoring a membership (G-19)', () => {
  it('an Owner restores an archived membership and that person reads again', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await db.as(s.minh, 'select public.archive_membership($1)', [s.memberships.hoa])
      await db.as(s.minh, 'select public.restore_membership($1)', [s.memberships.hoa])
      const { rows } = await db.admin(
        'select archived_at, archived_by from public.memberships where id = $1',
        [s.memberships.hoa],
      )
      expect(rows[0]).toEqual({ archived_at: null, archived_by: null })
      expect((await db.as(s.hoa, 'select * from public.memberships')).rows.length).toBeGreaterThan(0)
    })
  })

  it('a Member cannot restore, and an active or unknown membership is refused', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await db.as(s.minh, 'select public.archive_membership($1)', [s.memberships.khoa])
      await expect(
        db.as(s.hoa, 'select public.restore_membership($1)', [s.memberships.khoa]),
      ).rejects.toThrow(/not allowed/i)
      await expect(
        db.as(s.minh, 'select public.restore_membership($1)', [s.memberships.hoa]),
      ).rejects.toThrow(/not found/i)
    })
  })

  it('an Owner of another company cannot restore it', async () => {
    await inTx(async (db) => {
      const s = await seed(db)
      await db.as(s.minh, 'select public.archive_membership($1)', [s.memberships.khoa])
      await expect(
        db.as(s.stranger, 'select public.restore_membership($1)', [s.memberships.khoa]),
      ).rejects.toThrow(/not allowed/i)
    })
  })
})
