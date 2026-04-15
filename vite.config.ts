import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const webrtcBackend = env.VITE_API_BASE ?? 'http://localhost:7860'

  return {
    plugins: [react(), tailwindcss(), svgr()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // In dev, proxy WebRTC routes so the browser uses relative URLs (no CORS preflight).
      // Vite forwards server-side to the actual backend, bypassing browser CORS restrictions.
      proxy: {
        '/start': { target: webrtcBackend, changeOrigin: true, secure: false },
        '/sessions': { target: webrtcBackend, changeOrigin: true, secure: false },
        '/api/offer': { target: webrtcBackend, changeOrigin: true, secure: false },
        '/api/feedback': { target: webrtcBackend, changeOrigin: true, secure: false },
      },
    },
  }
})
