export function resolveInvitationViewer(inviterId: string, viewerId: string) {
  return inviterId === viewerId ? 'owner' : 'invitee'
}
