import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Vitest 5.1.0 and 5.1.1 fail with "Cannot read properties of undefined (reading 'config')"
    // in the default, forks and threads pools on this setup (Node 22, vite 8). Only vmThreads runs.
    // Revisit when a newer vitest is released.
    pool: 'vmThreads',
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: false,
  },
})
