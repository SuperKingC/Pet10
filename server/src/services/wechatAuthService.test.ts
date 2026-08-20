import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createWechatAuthService } from './wechatAuthService.js'

describe('wechat auth service', () => {
  it('creates a Pet10 user and JWT for a new WeChat identity', async () => {
    const repositories = createMemoryRepositories()
    const service = createWechatAuthService({
      repositories,
      jwtSecret: 'test-secret',
      exchangeCode: async () => ({ openId: 'openid-new', unionId: 'unionid-new' })
    })

    const result = await service.login('wx-code', {
      displayName: '微信昵称',
      avatarUrl: 'https://example.com/avatar.png'
    })

    expect(result.token).toEqual(expect.any(String))
    expect(result.user.displayName).toBe('微信昵称')
    expect(result.user.avatarUrl).toBe('https://example.com/avatar.png')
    expect(await repositories.wechatIdentities.findByOpenId('openid-new')).toMatchObject({
      userId: result.user.id,
      openId: 'openid-new',
      unionId: 'unionid-new'
    })
  })

  it('restores the same user when the WeChat identity logs in again', async () => {
    const repositories = createMemoryRepositories()
    let exchangeCount = 0
    const service = createWechatAuthService({
      repositories,
      jwtSecret: 'test-secret',
      exchangeCode: async () => {
        exchangeCount += 1
        return { openId: 'openid-existing' }
      }
    })

    const first = await service.login('first-code', { displayName: '第一次昵称' })
    const second = await service.login('second-code', { displayName: '第二次昵称' })

    expect(second.user.id).toBe(first.user.id)
    expect(second.user.displayName).toBe('第二次昵称')
    expect(exchangeCount).toBe(2)
  })

  it('rejects an empty WeChat login code', async () => {
    const service = createWechatAuthService({
      repositories: createMemoryRepositories(),
      jwtSecret: 'test-secret',
      exchangeCode: async () => ({ openId: 'unused' })
    })

    await expect(service.login('   ', {})).rejects.toThrow('invalid_wechat_code')
  })
})
