import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Worktrees are full checkouts of other branches; their tests import files
    // that only exist on those branches and fail when run from here.
    exclude: [...configDefaults.exclude, '.worktrees/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
