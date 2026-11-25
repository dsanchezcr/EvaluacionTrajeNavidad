import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]

export default defineConfig({
  base: repository ? `/${repository}/` : './',
  plugins: [react(), tailwindcss()],
})
