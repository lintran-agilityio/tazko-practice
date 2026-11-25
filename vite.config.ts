import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Vitest 5.1.0 and 5.1.1 fail with "Cannot read properties of undefined (reading 'config')"
// in the default, forks and threads pools on this setup (Node 22, vite 8). Only vmThreads runs.
// Revisit when a newer vitest is released.
const pool = 'vmThreads' as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          pool,
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
          globals: false,
        },
      },
      {
        // Database tests run against the local Supabase stack (npm run db:start).
        extends: true,
        test: {
          name: 'db',
          pool,
          environment: 'node',
          include: ['supabase/**/*.test.ts'],
          fileParallelism: false,
          testTimeout: 20000,
          globals: false,
        },
      },
    ],
  },
})
