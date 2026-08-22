import type { RepositoryBundle } from '../repositories/contracts.js'

export function createAccountService(repositories: RepositoryBundle) {
  return {
    async deactivate(userId: string) {
      const user = await repositories.users.findById(userId)
      if (!user) throw new Error('user_not_found')
      // 外键均配置 ON DELETE CASCADE / SET NULL，删除用户行即级联清理全部关联数据
      await repositories.users.deleteById(userId)
      return { deactivated: true }
    }
  }
}
