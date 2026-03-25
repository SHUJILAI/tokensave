import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isGHPages = process.env.DEPLOY_TARGET === 'ghpages'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: isGHPages ? '/tokensave/' : './',
})
