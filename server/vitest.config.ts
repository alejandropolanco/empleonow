import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./src/test/global-setup.ts'],
    include: ['src/**/*.test.ts'],
    hookTimeout: 60000,
    testTimeout: 30000,
    fileParallelism: false,
  },
})
