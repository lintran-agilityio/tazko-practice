import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// M3-2 (#28): a profile row appears with every new user, created through the Auth admin API.
const url = process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const dbUrl = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const domain = `profile-${randomUUID().slice(0, 8)}.example`;
const password = `Aa1!${randomUUID()}`;
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const db = new pg.Client({ connectionString: dbUrl });
const profileOf = async (id: string) =>
  (await db.query("select * from public.profiles where id = $1", [id])).rows[0];

beforeAll(async () => {
  await db.connect();
  await db.query("insert into public.allowed_domains (domain) values ($1)", [domain]);
});
afterAll(async () => {
  await db.end().catch(() => undefined);
});

describe("handle_new_user", () => {
  it("creates a profile named from the display_name metadata", async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: `ada@${domain}`,
      password,
      email_confirm: true,
      user_metadata: { display_name: "  Ada Lovelace  " },
    });
    expect(error).toBeNull();
    const profile = await profileOf(data.user!.id);
    expect(profile.display_name).toBe("Ada Lovelace");
    expect(profile.is_super_admin).toBe(false);
    expect(profile.last_company_id).toBeNull();
  });

  it("falls back to the part of the email before the @", async () => {
    const { data } = await admin.auth.admin.createUser({
      email: `grace@${domain}`,
      password,
      email_confirm: true,
    });
    expect((await profileOf(data.user!.id)).display_name).toBe("grace");
  });

  it("never makes a new user a super admin, even if the metadata asks", async () => {
    const { data } = await admin.auth.admin.createUser({
      email: `eve@${domain}`,
      password,
      email_confirm: true,
      user_metadata: { is_super_admin: true },
    });
    expect((await profileOf(data.user!.id)).is_super_admin).toBe(false);
  });

  it("refuses a user outside the allowed domains, so no profile exists for it (G-20)", async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: `mallory@not-listed-${randomUUID().slice(0, 8)}.example`,
      password,
      email_confirm: true,
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});
