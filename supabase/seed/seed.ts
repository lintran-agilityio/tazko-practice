import { createClient } from "@supabase/supabase-js";
import pg from "pg";

export type SeedOptions = {
  supabaseUrl: string;
  serviceRoleKey: string;
  dbUrl: string;
  /** From ALLOWED_EMAIL_DOMAINS (G-20). The seed users use the first one. */
  domains: string[];
  /** From SEED_USER_PASSWORD. Never committed. */
  password: string;
};

const COMPANIES = ["Harbor Logistics", "Northwind Foods"] as const;

// G-8: Linh (Super admin), Minh (Owner of both), Hoa (Member), Khoa (Observer), both in Harbor.
const PEOPLE = [
  { name: "Linh", superAdmin: true, roles: {} },
  {
    name: "Minh",
    superAdmin: false,
    roles: { "Harbor Logistics": "owner", "Northwind Foods": "owner" },
  },
  { name: "Hoa", superAdmin: false, roles: { "Harbor Logistics": "member" } },
  { name: "Khoa", superAdmin: false, roles: { "Harbor Logistics": "observer" } },
] as const;

/** Loads allowed domains, 2 companies and 4 users. Safe to run again: it changes nothing twice. */
export async function runSeed(options: SeedOptions): Promise<void> {
  const domains = options.domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (domains.length === 0) throw new Error("Set ALLOWED_EMAIL_DOMAINS before seeding.");
  if (!options.password) throw new Error("Set SEED_USER_PASSWORD before seeding.");
  if (!options.serviceRoleKey) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY before seeding.");

  // The seed resets passwords and creates users, so it only runs against a local stack.
  const host = new URL(options.supabaseUrl).hostname;
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    throw new Error(`The seed only runs against a local Supabase, not ${host}.`);
  }

  const db = new pg.Client({ connectionString: options.dbUrl });
  await db.connect();
  try {
    for (const domain of domains) {
      await db.query(
        "insert into public.allowed_domains (domain) values ($1) on conflict (domain) do nothing",
        [domain],
      );
    }

    const companyIds = new Map<string, string>();
    for (const name of COMPANIES) {
      await db.query(
        `insert into public.companies (name)
         select $1::text where not exists (
           select 1 from public.companies where lower(btrim(name)) = lower($1::text) and archived_at is null)`,
        [name],
      );
      const row = await db.query(
        "select id from public.companies where lower(btrim(name)) = lower($1::text) and archived_at is null",
        [name],
      );
      companyIds.set(name, row.rows[0].id);
    }

    const auth = createClient(options.supabaseUrl, options.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }).auth.admin;

    for (const person of PEOPLE) {
      const email = `${person.name.toLowerCase()}@${domains[0]}`;
      let id = (await db.query("select id from auth.users where email = $1", [email])).rows[0]?.id;
      if (!id) {
        const { data, error } = await auth.createUser({
          email,
          password: options.password,
          email_confirm: true,
          user_metadata: { display_name: person.name },
        });
        if (error) throw new Error(`Could not create ${email}: ${error.message}`);
        id = data.user.id;
      } else {
        // Keep the password in step with the local env, so a changed value still signs in.
        const { error } = await auth.updateUserById(id, { password: options.password });
        if (error) throw new Error(`Could not update ${email}: ${error.message}`);
      }
      await db.query(
        "update public.profiles set display_name = $2, is_super_admin = $3 where id = $1",
        [id, person.name, person.superAdmin],
      );
      for (const [company, role] of Object.entries(person.roles)) {
        await db.query(
          `insert into public.memberships (company_id, user_id, role) values ($1, $2, $3)
           on conflict (company_id, user_id) do nothing`,
          [companyIds.get(company), id, role],
        );
      }
    }
  } finally {
    await db.end();
  }
}
