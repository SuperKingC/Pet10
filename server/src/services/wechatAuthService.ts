import { createHash, randomInt } from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { RepositoryBundle } from '../repositories/contracts.js'

export interface WechatProfile {
  displayName?: string
  avatarUrl?: string
}

export interface WechatCodeExchangeResult {
  openId: string
  unionId?: string
}

interface WechatAuthDependencies {
  repositories: RepositoryBundle
  jwtSecret: string
  jwtExpiresIn?: string
  exchangeCode: (code: string) => Promise<WechatCodeExchangeResult>
}

function syntheticEmail(openId: string) {
  const digest = createHash('sha256').update(openId).digest('hex').slice(0, 24)
  return `wechat_${digest}@pet10.local`
}

function syntheticUsername(openId: string) {
  const digest = createHash('sha256').update(openId).digest('hex').slice(0, 12)
  return `wechat_${digest}_${randomInt(1000, 10000)}`
}

export function createWechatAuthService(dependencies: WechatAuthDependencies) {
  return {
    async login(code: string, profile: WechatProfile) {
      const normalizedCode = code.trim()
      if (!normalizedCode) throw new Error('invalid_wechat_code')

      const exchanged = await dependencies.exchangeCode(normalizedCode)
      if (!exchanged.openId) throw new Error('invalid_wechat_identity')

      const identity = await dependencies.repositories.wechatIdentities.findByOpenId(exchanged.openId)
      let user = identity
        ? await dependencies.repositories.users.findById(identity.userId)
        : undefined

      if (!user) {
        user = await dependencies.repositories.users.create({
          email: syntheticEmail(exchanged.openId),
          username: syntheticUsername(exchanged.openId),
          displayName: profile.displayName?.trim() || '微信用户'
        })
        await dependencies.repositories.users.updateProfile(user.id, {
          avatarUrl: profile.avatarUrl ?? null
        })
        user = await dependencies.repositories.users.findById(user.id)
        if (!user) throw new Error('user_not_found')
        await dependencies.repositories.wechatIdentities.create({
          userId: user.id,
          openId: exchanged.openId,
          unionId: exchanged.unionId ?? null
        })
      } else {
        user = await dependencies.repositories.users.updateProfile(user.id, {
          displayName: profile.displayName?.trim() || undefined,
          avatarUrl: profile.avatarUrl
        })
      }

      const token = jwt.sign({ sub: user.id, authProvider: 'wechat' }, dependencies.jwtSecret, {
        expiresIn: (dependencies.jwtExpiresIn ?? '30d') as jwt.SignOptions['expiresIn']
      })
      return { token, user }
    }
  }
}
