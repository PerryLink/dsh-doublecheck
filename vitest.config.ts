import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      // Global thresholds, a few points below the measured baseline
      // (93.4% stmts / 86.3% branch / 91.4% funcs / 93.4% lines) so noise
      // does not flake CI while regressions still fail it.
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 85,
        lines: 90,
      },
    },
  },
})
