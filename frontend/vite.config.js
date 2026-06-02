import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Single shared .env lives at the repo root (one level up from this config).
// Point Vite's envDir there so the frontend reads the SAME .env as the backend.
// Only VITE_*-prefixed vars are exposed to the client bundle.
const rootEnvDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all vars (including non-VITE_ ones, used here in Node only) from the
  // root .env. FRONTEND_PORT configures the dev server; unset => Vite default.
  const env = loadEnv(mode, rootEnvDir, '')
  const port = env.FRONTEND_PORT ? Number(env.FRONTEND_PORT) : undefined

  return {
    plugins: [react()],
    envDir: rootEnvDir,
    server: { port },
  }
})
