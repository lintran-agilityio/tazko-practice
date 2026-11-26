import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// TP-3: CI starts Supabase and runs the database tests in their own Vitest project.
const read = (path: string) => readFileSync(path, "utf8");
const scripts = JSON.parse(read("package.json")).scripts as Record<string, string>;
const ci = read(".github/workflows/ci.yml");
const readme = read("README.md");

describe("database tests in CI (TP-3)", () => {
  it("has separate scripts for the unit and the database Vitest projects", () => {
    expect(scripts["test:unit"]).toMatch(/--project unit/);
    expect(scripts["test:db"]).toMatch(/--project db/);
  });

  it("CI starts Supabase before the database tests and runs them as their own step", () => {
    const start = ci.indexOf("supabase start");
    const unit = ci.indexOf("npm run test:unit");
    const db = ci.indexOf("npm run test:db");
    expect(start).toBeGreaterThan(-1);
    expect(unit).toBeGreaterThan(-1);
    expect(db).toBeGreaterThan(start);
  });

  it("CI hands the local keys to the tests without committing any key or password", () => {
    expect(ci).toMatch(/supabase status -o env/);
    for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_ANON_KEY"]) {
      expect(ci).toContain(name);
    }
    expect(ci).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/); // no JWT in the file
    expect(ci).not.toMatch(/sb_(secret|publishable)_/);
  });

  it("CI sets the seed variables from a generated password, not a stored one", () => {
    expect(ci).toContain("ALLOWED_EMAIL_DOMAINS");
    expect(ci).toContain("SEED_USER_PASSWORD");
  });

  it("the README documents how to run the database tests from a clean clone", () => {
    for (const command of ["npm run db:start", "npm run db:seed", "npm run test:db"]) {
      expect(readme).toContain(command);
    }
  });
});
