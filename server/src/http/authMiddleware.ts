import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends Request {
  userId?: string
}

export function createAuthMiddleware(secret: string, allowedEmails: string[] = []) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return response.status(401).json({ error: 'unauthorized' })
    try {
      const payload = jwt.verify(token, secret)
      if (typeof payload === 'string' || !payload.sub) throw new Error('invalid_token')
      const authProvider = payload.authProvider === 'wechat' ? 'wechat' : 'email'
      const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
      if (authProvider !== 'wechat' && allowedEmails.length > 0 && !allowedEmails.includes(email)) {
        return response.status(403).json({ error: 'email_not_allowed' })
      }
      request.userId = String(payload.sub)
      next()
    } catch {
      response.status(401).json({ error: 'unauthorized' })
    }
  }
}
