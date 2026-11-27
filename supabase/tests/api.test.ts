import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "../seed/seed.ts";

// Isolation tests through supabase-js with real signed-in users (Q8). Every call goes
// through the real Auth and PostgREST stack, so grants, RLS and triggers all apply.
// Needs the local stack and SUPABASE_SERVICE_ROLE_KEY; no key or password is committed.
const url = process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const dbUrl = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const domain = "api-test.example";
const password = `Aa1!${randomUUID()}`;
const noSession = { auth: { autoRefreshToken: false, persistSession: false } };

const db = new pg.Client({ connectionString: dbUrl });
const sql = async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows;
const admin = createClient(url, serviceKey, noSession);

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, noSession);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in ${email}: ${error.message}`);
  return client;
}

let harbor = "";
let northwind = "";
const id: Record<string, string> = {};
const as: Record<string, SupabaseClient> = {};

beforeAll(async () => {
  await db.connect();
  // Linh, Minh, Hoa and Khoa come from the seed (G-8).
  await runSeed({
    supabaseUrl: url,
    serviceRoleKey: serviceKey,
    dbUrl,
    domains: [domain],
    password,
  });
  // The stranger belongs to no company.
  const stranger = `stranger@${domain}`;
  const created = await admin.auth.admin.createUser({
    email: stranger,
    password,
    email_confirm: true,
  });
  if (created.error && !/already/i.test(created.error.message)) throw created.error;
  const strangerId = (await sql("select id from auth.users where email = $1", [stranger]))[0].id;
  await admin.auth.admin.updateUserById(strangerId, { password });

  for (const name of ["linh", "minh", "hoa", "khoa", "stranger"]) {
    const email = `${name}@${domain}`;
    id[name] = (await sql("select id from auth.users where email = $1", [email]))[0].id;
    as[name] = await signIn(email);
  }
  harbor = (await sql("select id from public.companies where name = 'Harbor Logistics'"))[0].id;
  northwind = (await sql("select id from public.companies where name = 'Northwind Foods'"))[0].id;
}, 60000);

afterAll(async () => {
  await db.end().catch(() => undefined);
});

const ids = (rows: { id: string }[] | null) => (rows ?? []).map((r) => r.id).sort();
type Result = { error: { code?: string } | null; data: unknown[] | null };
// Anonymous reads are refused by grant (an error) or return no rows.
const nothing = (r: Result) => r.error !== null || r.data?.length === 0;
// A column the app role has no UPDATE grant on: the request fails with 42501 (G-19).
const refusedByGrant = (r: Result) => r.error?.code === "42501";
// A write RLS refuses changes 0 rows and raises no error.
const zeroRows = (r: Result) => r.error === null && r.data?.length === 0;

describe("one company cannot read another (T-1)", () => {
  it("a Member of Harbor reads Harbor only", async () => {
    const { data } = await as.hoa.from("companies").select("id,name");
    expect(data?.map((c) => c.name)).toEqual(["Harbor Logistics"]);
    const { data: memberships } = await as.hoa.from("memberships").select("company_id");
    expect(new Set(memberships?.map((m) => m.company_id))).toEqual(new Set([harbor]));
  });

  it("an Owner of both reads both", async () => {
    const { data } = await as.minh.from("companies").select("id");
    expect(ids(data)).toEqual([harbor, northwind].sort());
  });

  it("a person with no membership reads nothing", async () => {
    expect((await as.stranger.from("companies").select("id")).data).toEqual([]);
    expect((await as.stranger.from("memberships").select("id")).data).toEqual([]);
    expect((await as.stranger.from("company_people").select("user_id")).data).toEqual([]);
  });

  it("an anonymous client reads nothing at all", async () => {
    const anon = createClient(url, anonKey, noSession);
    for (const table of ["companies", "profiles", "memberships", "company_people"]) {
      expect(nothing(await anon.from(table).select("*"))).toBe(true);
    }
  });
});

describe("Linh reads company-level data only (G-14)", () => {
  it("reads companies and memberships, but only her own profile row", async () => {
    expect(ids((await as.linh.from("companies").select("id")).data)).toEqual(
      [harbor, northwind].sort(),
    );
    const { data: memberships } = await as.linh.from("memberships").select("company_id");
    expect(memberships?.length).toBeGreaterThan(0);
    const { data: profiles } = await as.linh.from("profiles").select("id");
    expect(profiles?.map((p) => p.id)).toEqual([id.linh]);
  });

  it("reads member display names through company_people", async () => {
    const { data } = await as.linh.from("company_people").select("display_name");
    expect(data?.map((p) => p.display_name)).toEqual(
      expect.arrayContaining(["Hoa", "Khoa", "Minh"]),
    );
  });
});

describe("company_people and private columns", () => {
  it("a member reads co-members' names; a non-member reads none", async () => {
    const { data } = await as.hoa.from("company_people").select("display_name,company_id");
    expect(new Set(data?.map((p) => p.company_id))).toEqual(new Set([harbor]));
    expect(data?.map((p) => p.display_name)).toEqual(
      expect.arrayContaining(["Hoa", "Khoa", "Minh"]),
    );
    expect((await as.stranger.from("company_people").select("display_name")).data).toEqual([]);
  });

  it("nobody reads another person's last_company_id or is_super_admin", async () => {
    const view = await as.hoa.from("company_people").select("last_company_id");
    expect(view.error).not.toBeNull();
    const { data } = await as.hoa.from("profiles").select("id,last_company_id,is_super_admin");
    expect(data?.map((p) => p.id)).toEqual([id.hoa]); // only her own row
  });
});

describe("writes refused by RLS change 0 rows", () => {
  it("an Observer cannot rename the company or add a member (BR-3)", async () => {
    const renamed = await as.khoa
      .from("companies")
      .update({ name: "Hacked" })
      .eq("id", harbor)
      .select();
    expect(renamed.data).toEqual([]);
    expect((await sql("select name from public.companies where id = $1", [harbor]))[0].name).toBe(
      "Harbor Logistics",
    );
    const added = await as.khoa
      .from("memberships")
      .insert({ company_id: harbor, user_id: id.khoa, role: "owner" });
    expect(added.error).not.toBeNull();
  });

  it("nobody promotes themselves: not to Super admin, not to Owner", async () => {
    const flag = await as.hoa
      .from("profiles")
      .update({ is_super_admin: true })
      .eq("id", id.hoa)
      .select();
    expect(refusedByGrant(flag)).toBe(true);
    const role = await as.hoa
      .from("memberships")
      .update({ role: "owner" })
      .eq("user_id", id.hoa)
      .select();
    expect(zeroRows(role)).toBe(true);
    const row = (
      await sql(
        `select p.is_super_admin, m.role from public.profiles p
         join public.memberships m on m.user_id = p.id and m.company_id = $2 where p.id = $1`,
        [id.hoa, harbor],
      )
    )[0];
    expect(row).toEqual({ is_super_admin: false, role: "member" });
  });

  it("an Owner cannot change their own role either", async () => {
    const res = await as.minh
      .from("memberships")
      .update({ role: "member" })
      .eq("user_id", id.minh)
      .eq("company_id", harbor)
      .select();
    expect(zeroRows(res)).toBe(true);
    const rows = await sql(
      "select role from public.memberships where user_id = $1 and company_id = $2",
      [id.minh, harbor],
    );
    expect(rows[0].role).toBe("owner");
  });
});

describe("archived people and domains read nothing", () => {
  it("an archived member reads nothing, and is back after restore (G-19)", async () => {
    const rows = await sql(
      "select id from public.memberships where user_id = $1 and company_id = $2",
      [id.khoa, harbor],
    );
    const membership = rows[0].id;
    try {
      const archived = await as.minh.rpc("archive_membership", { membership_id: membership });
      expect(archived.error).toBeNull();
      expect((await as.khoa.from("companies").select("id")).data).toEqual([]);
      expect((await as.khoa.from("memberships").select("id")).data).toEqual([]);
      expect((await as.khoa.from("company_people").select("user_id")).data).toEqual([]);
    } finally {
      const restored = await as.minh.rpc("restore_membership", { membership_id: membership });
      expect(restored.error).toBeNull();
    }
    expect(ids((await as.khoa.from("companies").select("id")).data)).toEqual([harbor]);
  });

  it("a user whose domain is archived reads nothing at once (G-20)", async () => {
    try {
      await sql("update public.allowed_domains set archived_at = now() where domain = $1", [
        domain,
      ]);
      expect((await as.hoa.from("companies").select("id")).data).toEqual([]);
      expect((await as.minh.from("companies").select("id")).data).toEqual([]);
      expect((await as.linh.from("companies").select("id")).data).toEqual([]);
    } finally {
      await sql("update public.allowed_domains set archived_at = null where domain = $1", [domain]);
    }
    expect(ids((await as.hoa.from("companies").select("id")).data)).toEqual([harbor]);
  });
});

describe("only company addresses become users (G-20)", () => {
  it("refuses a personal Gmail address, and a look-alike domain", async () => {
    for (const email of [`someone-${randomUUID()}@gmail.com`, `x@${domain}.evil.com`]) {
      const { error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(error).not.toBeNull();
      expect((await sql("select 1 from auth.users where email = $1", [email])).length).toBe(0);
    }
  });
});
