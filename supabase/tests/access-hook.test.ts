import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

// M3-5 (#148): the custom access token hook refuses sign-in and token refresh when the
// email's domain is not on allowed_domains (G-20, TP-13). Real Auth stack, real users.
const url = process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const dbUrl = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const domain = `hook-${randomUUID().slice(0, 8)}.example`;
const email = `person@${domain}`;
const password = `Aa1!${randomUUID()}`;
const noSession = { auth: { autoRefreshToken: false, persistSession: false } };

const db = new pg.Client({ connectionString: dbUrl });
const admin = createClient(url, serviceKey, noSession);
const fresh = () => createClient(url, anonKey, noSession);

beforeAll(async () => {
  await db.connect();
  await db.query("insert into public.allowed_domains (domain) values ($1)", [domain]);
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
}, 30000);

afterAll(async () => {
  await db.end().catch(() => undefined);
});

const setDomainArchived = (archived: boolean) =>
  db.query("update public.allowed_domains set archived_at = $2 where domain = $1", [
    domain,
    archived ? new Date().toISOString() : null,
  ]);

// A failed assertion must not leave the domain archived for the next test.
afterEach(() => setDomainArchived(false));

describe("access token hook (G-20, TP-13)", () => {
  it("is registered as a Postgres function the Auth service may run", async () => {
    const { rows } = await db.query(
      `select has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'execute') as ok`,
    );
    expect(rows[0].ok).toBe(true);
    const anon = await db.query(
      `select has_function_privilege('anon', 'public.custom_access_token_hook(jsonb)', 'execute') as ok`,
    );
    expect(anon.rows[0].ok).toBe(false);
  });

  it("signs in a person whose domain is allowed", async () => {
    const { data, error } = await fresh().auth.signInWithPassword({ email, password });
    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();
  });

  it("refuses sign-in once the domain is removed, with a hook error", async () => {
    await setDomainArchived(true);
    const { data, error } = await fresh().auth.signInWithPassword({ email, password });
    expect(data.session).toBeNull();
    expect(error).not.toBeNull();
    await setDomainArchived(false);
  });

  it("refuses the next token refresh of an existing session (TP-13)", async () => {
    const client = fresh();
    const { data } = await client.auth.signInWithPassword({ email, password });
    const refreshToken = data.session!.refresh_token;

    await setDomainArchived(true);
    const refused = await fresh().auth.refreshSession({ refresh_token: refreshToken });
    expect(refused.data.session).toBeNull();
    expect(refused.error).not.toBeNull();

    // Back on the list, the person can sign in again.
    await setDomainArchived(false);
    const again = await fresh().auth.signInWithPassword({ email, password });
    expect(again.error).toBeNull();
  });

  it("never answers a caller who has not proved the password", async () => {
    await setDomainArchived(true);
    const wrong = await fresh().auth.signInWithPassword({ email, password: "wrong-Password-1!" });
    // The refusal is the ordinary credentials error, not the hook's domain error.
    expect(wrong.error?.message).toMatch(/invalid login credentials/i);
    await setDomainArchived(false);
  });
});
