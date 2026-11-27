import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { runSeed } from "../seed/seed.ts";

// Runs the real seed against the local stack (npm run db:start). Needs
// SUPABASE_SERVICE_ROLE_KEY in the environment; never put a key or password in the repo.
const dbUrl = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const options = {
  supabaseUrl: process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  dbUrl,
  domains: ["seed-test.example"],
  // Random per run, shaped to pass the password rules (lower, upper, digit, symbol).
  password: `Aa1!${randomUUID()}`,
};

const client = new pg.Client({ connectionString: dbUrl });
const query = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows;

describe("seed (G-8, G-20)", () => {
  it("loads allowed domains, 2 companies and 4 users, and can run again", async () => {
    await client.connect();
    await runSeed(options);
    await runSeed(options); // a second run changes nothing

    const domains = await query("select domain from public.allowed_domains where domain = $1", [
      "seed-test.example",
    ]);
    expect(domains).toHaveLength(1);

    const companies = await query(
      `select name from public.companies
       where name in ('Harbor Logistics', 'Northwind Foods') and archived_at is null`,
    );
    expect(companies.map((c) => c.name).sort()).toEqual(["Harbor Logistics", "Northwind Foods"]);

    const people = await query(
      `select u.email, p.display_name, p.is_super_admin
       from auth.users u join public.profiles p on p.id = u.id
       where u.email like '%@seed-test.example' order by u.email`,
    );
    expect(people.map((p) => p.display_name)).toEqual(["Hoa", "Khoa", "Linh", "Minh"]);
    expect(people.filter((p) => p.is_super_admin).map((p) => p.display_name)).toEqual(["Linh"]);

    const roles = await query(
      `select p.display_name as who, c.name as company, m.role
       from public.memberships m
       join public.profiles p on p.id = m.user_id
       join auth.users u on u.id = m.user_id
       join public.companies c on c.id = m.company_id
       where u.email like '%@seed-test.example'
         and c.name in ('Harbor Logistics', 'Northwind Foods')
         and m.archived_at is null
       order by who, company`,
    );
    expect(roles).toEqual([
      { who: "Hoa", company: "Harbor Logistics", role: "member" },
      { who: "Khoa", company: "Harbor Logistics", role: "observer" },
      { who: "Minh", company: "Harbor Logistics", role: "owner" },
      { who: "Minh", company: "Northwind Foods", role: "owner" },
    ]); // Linh is Super admin and has no membership
  });

  it("refuses to run without a password or with a personal domain", async () => {
    await expect(runSeed({ ...options, password: "" })).rejects.toThrow(/SEED_USER_PASSWORD/);
    await expect(runSeed({ ...options, domains: [] })).rejects.toThrow(/ALLOWED_EMAIL_DOMAINS/);
  });

  it("refuses to seed anything but a local Supabase", async () => {
    for (const supabaseUrl of ["https://abcd.supabase.co", "http://10.0.0.5:54321"]) {
      await expect(runSeed({ ...options, supabaseUrl })).rejects.toThrow(/local/i);
    }
  });

  afterAll(async () => {
    await client.end().catch(() => undefined);
  });
});
