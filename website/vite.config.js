import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // NODE_RED_URL is read here only (server side) — it is not exposed to the bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.NODE_RED_URL || 'http://localhost:1880'
  const proxy = {
    '/api': { target, changeOrigin: true },
    '/ws': { target: target.replace(/^http/, 'ws'), ws: true, changeOrigin: true },
  }

  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})
