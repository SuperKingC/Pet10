import { createHash, randomInt } from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { RepositoryBundle } from '../repositories/contracts.js'

interface AuthDependencies {
  repositories: RepositoryBundle
  jwtSecret: string
  jwtExpiresIn?: string
  loginCodeTtlSeconds: number
  logCode: (email: string, code: string) => void
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

function makeUsername(email: string) {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18) || 'pet10user'
  return `${base}_${randomInt(1000, 9999)}`
}

export function createAuthService(dependencies: AuthDependencies) {
  return {
    async requestLoginCode(email: string, inviteCode: string) {
      const normalizedEmail = normalizeEmail(email)
      const invite = await dependencies.repositories.invites.findByCode(inviteCode)
      if (!invite || !invite.active || invite.useCount >= invite.maxUses) {
        throw new Error('invalid_invite_code')
      }
      const code = String(randomInt(100000, 1000000))
      await dependencies.repositories.loginCodes.save({
        email: normalizedEmail,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + dependencies.loginCodeTtlSeconds * 1000)
      })
      dependencies.logCode(normalizedEmail, code)
      return { expiresInSeconds: dependencies.loginCodeTtlSeconds }
    },

    async verifyLoginCode(email: string, code: string) {
      const normalizedEmail = normalizeEmail(email)
      const saved = await dependencies.repositories.loginCodes.findByEmail(normalizedEmail)
      if (!saved || saved.expiresAt.getTime() < Date.now() || saved.codeHash !== hashCode(code.trim())) {
        throw new Error('invalid_or_expired_code')
      }
      await dependencies.repositories.loginCodes.deleteByEmail(normalizedEmail)
      let user = await dependencies.repositories.users.findByEmail(normalizedEmail)
      if (!user) {
        await dependencies.repositories.invites.consume('PET10-DEMO')
        user = await dependencies.repositories.users.create({
          email: normalizedEmail,
          username: makeUsername(normalizedEmail),
          displayName: normalizedEmail.split('@')[0]
        })
      }
      const token = jwt.sign({ sub: user.id, email: user.email }, dependencies.jwtSecret, {
        expiresIn: (dependencies.jwtExpiresIn ?? '30d') as jwt.SignOptions['expiresIn']
      })
      return { token, user }
    }
  }
}
