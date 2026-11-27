import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// #184: restore_membership must re-check the caller's Owner role after locking their
// membership row. Two real connections and committed rows, because the race needs both.
const dbUrl = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const domain = `lock-${randomUUID().slice(0, 8)}.example`;
const company = randomUUID();
const user = (name: string) => ({ id: randomUUID(), email: `${name}@${domain}` });
const ada = user("ada"); // Owner who gets demoted while the restore waits
const bob = user("bob"); // second Owner, so the demotion is allowed
const cy = user("cy"); // archived Member to restore
const ids = { ada: randomUUID(), bob: randomUUID(), cy: randomUUID() };

const connect = async () => {
  const c = new pg.Client({ connectionString: dbUrl });
  await c.connect();
  return c;
};
let setup: pg.Client;

beforeAll(async () => {
  setup = await connect();
  await setup.query("insert into public.allowed_domains (domain) values ($1)", [domain]);
  for (const u of [ada, bob, cy]) {
    await setup.query("insert into auth.users (id, email) values ($1, $2)", [u.id, u.email]);
  }
  await setup.query("insert into public.companies (id, name) values ($1, $2)", [company, domain]);
  await setup.query(
    `insert into public.memberships (id, company_id, user_id, role, archived_at) values
       ($1, $4, $5, 'owner', null), ($2, $4, $6, 'owner', null), ($3, $4, $7, 'member', now())`,
    [ids.ada, ids.bob, ids.cy, company, ada.id, bob.id, cy.id],
  );
});

afterAll(async () => {
  // The test user is the database owner here; app roles can never delete (G-19).
  await setup.query("delete from public.memberships where company_id = $1", [company]);
  await setup.query("delete from public.companies where id = $1", [company]);
  await setup.query("delete from public.profiles where id = any($1)", [[ada.id, bob.id, cy.id]]);
  await setup.query("delete from auth.users where id = any($1)", [[ada.id, bob.id, cy.id]]);
  await setup.query("delete from public.allowed_domains where domain = $1", [domain]);
  await setup.end();
});

describe("restore_membership under a concurrent demotion (#184)", () => {
  it("refuses an Owner who is demoted while the restore waits", async () => {
    const demoter = await connect();
    const caller = await connect();
    try {
      await demoter.query("begin");
      await demoter.query("update public.memberships set role = 'member' where id = $1", [ids.ada]);

      await caller.query("begin");
      await caller.query("set local role authenticated");
      await caller.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: ada.id, email: ada.email, role: "authenticated" }),
      ]);
      const restore = caller.query("select public.restore_membership($1)", [ids.cy]).then(
        () => "restored",
        (error: { code?: string }) => error.code ?? "error",
      );

      await new Promise((r) => setTimeout(r, 500)); // let the restore reach the lock
      await demoter.query("commit");

      expect(await restore).toBe("42501"); // Not allowed
      await caller.query("rollback");
    } finally {
      await demoter.end();
      await caller.end();
    }
    const { rows } = await setup.query(
      "select archived_at is not null as archived from public.memberships where id = $1",
      [ids.cy],
    );
    expect(rows[0].archived).toBe(true); // still archived
  });
});
