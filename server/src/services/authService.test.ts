import { describe, expect, it } from 'vitest'
import { createAuthService } from './authService.js'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'

describe('auth service', () => {
  it('rejects an invalid invite code', async () => {
    const repositories = createMemoryRepositories()
    const service = createAuthService({
      repositories,
      jwtSecret: 'test-secret',
      loginCodeTtlSeconds: 600,
      mailMode: 'console',
      logCode: () => undefined
    })

    await expect(service.requestLoginCode('person@example.com', 'WRONG')).rejects.toThrow('invalid_invite_code')
  })

  it('creates a user and issues a token after verifying a console code', async () => {
    const repositories = createMemoryRepositories()
    let sentCode = ''
    const service = createAuthService({
      repositories,
      jwtSecret: 'test-secret',
      loginCodeTtlSeconds: 600,
      mailMode: 'console',
      logCode: (_email, code) => { sentCode = code }
    })

    const request = await service.requestLoginCode('person@example.com', 'PET10-DEMO')
    const result = await service.verifyLoginCode('person@example.com', sentCode)

    expect(request.developmentCode).toBe(sentCode)
    expect(result.user.email).toBe('person@example.com')
    expect(result.token.split('.')).toHaveLength(3)
  })

  it('does not expose the login code outside console mode', async () => {
    const repositories = createMemoryRepositories()
    const service = createAuthService({
      repositories,
      jwtSecret: 'test-secret',
      loginCodeTtlSeconds: 600,
      mailMode: 'smtp',
      logCode: () => undefined
    })

    const result = await service.requestLoginCode('person@example.com', 'PET10-DEMO')

    expect(result).toEqual({ expiresInSeconds: 600 })
  })
})
