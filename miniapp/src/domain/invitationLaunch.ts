export function resolveInvitationLaunchToken(options?: Record<string, unknown>) {
  return typeof options?.token === 'string' ? options.token : ''
}
