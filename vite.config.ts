import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset URLs relative so the same build works on the web
// and inside the Electron desktop app.
export default defineConfig({
  base: './',
  plugins: [react()],
})
