import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '.worktrees/**',
      'miniapp/**',
    ],
    // 根 vitest 也会跑 server 测试；gobangRoutes 对局流程约 10 次真实
    // HTTP 往返，单跑 1.6s，并行下超过 vitest 默认 5s 上限。
    testTimeout: 30_000,
  },
})
