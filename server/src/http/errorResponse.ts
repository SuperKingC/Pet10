import { ZodError } from 'zod'

export function resolveErrorResponse(error: unknown) {
  if (error instanceof ZodError) return { status: 400, error: 'invalid_input' }
  const message = error instanceof Error ? error.message : 'internal_server_error'
  const status = message.includes('not_found') ? 404 :
    message.includes('rate_limit') ? 429 :
    message.includes('not_configured') ? 503 :
    message.includes('forbidden') || message.includes('not_allowed') ? 403 :
    message.includes('unauthorized') ? 401 :
    message.includes('invalid') ||
      message.includes('limit') ||
      message.includes('exists') ||
      message === 'birthday_required' ||
      message === 'cannot_invite_self' ||
      message === 'invitation_expired' ||
      message === 'invitation_unavailable' ||
      message === 'relationship_already_exists'
      ? 400
      : 500
  return {
    status,
    error: status === 500 ? 'internal_server_error' : message,
  }
}
