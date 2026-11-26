import { runSeed } from "./seed.ts";

// Usage: npm run db:seed (reads .env through node --env-file).
await runSeed({
  supabaseUrl: process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  dbUrl: process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  domains: (process.env.ALLOWED_EMAIL_DOMAINS ?? "").split(","),
  password: process.env.SEED_USER_PASSWORD ?? "",
});
console.log("Seeded 2 companies and 4 users.");
