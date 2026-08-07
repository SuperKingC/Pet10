import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends Request {
  userId?: string
}

export function createAuthMiddleware(secret: string) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return response.status(401).json({ error: 'unauthorized' })
    try {
      const payload = jwt.verify(token, secret)
      if (typeof payload === 'string' || !payload.sub) throw new Error('invalid_token')
      request.userId = String(payload.sub)
      next()
    } catch {
      response.status(401).json({ error: 'unauthorized' })
    }
  }
}
