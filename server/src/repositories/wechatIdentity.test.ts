import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from './memoryRepositories.js'

describe('wechat identity repository', () => {
  it('creates one identity for a user and finds it by open id', async () => {
    const repositories = createMemoryRepositories()
    const user = await repositories.users.create({
      email: 'wechat@example.com',
      username: 'wechat_user',
      displayName: '微信用户'
    })

    const identity = await repositories.wechatIdentities.create({
      userId: user.id,
      openId: 'openid-1',
      unionId: 'unionid-1'
    })

    expect(await repositories.wechatIdentities.findByOpenId('openid-1')).toEqual(identity)
    expect(await repositories.wechatIdentities.findByUserId(user.id)).toEqual(identity)
  })

  it('does not create a second identity for the same open id', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({
      email: 'first@example.com',
      username: 'first_wechat',
      displayName: '第一位'
    })
    const second = await repositories.users.create({
      email: 'second@example.com',
      username: 'second_wechat',
      displayName: '第二位'
    })

    await repositories.wechatIdentities.create({ userId: first.id, openId: 'openid-duplicate' })

    await expect(
      repositories.wechatIdentities.create({ userId: second.id, openId: 'openid-duplicate' })
    ).rejects.toThrow('wechat_identity_already_exists')
  })
})
