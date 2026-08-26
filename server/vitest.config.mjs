import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // gobangRoutes 的完整对局流程要跑约 10 次真实 HTTP 往返，
    // 单独跑约 1.6s，并行负载下会超过 vitest 默认的 5s 上限。
    testTimeout: 30_000,
  },
})
