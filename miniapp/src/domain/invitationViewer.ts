export type InvitationViewer = 'owner' | 'invitee'

export function resolveInvitationViewer(inviterId: string, viewerId: string): InvitationViewer {
  return inviterId === viewerId ? 'owner' : 'invitee'
}

export function invitationViewerMessage(viewer: InvitationViewer): string {
  return viewer === 'owner' ? '这是你发出的邀请' : '带我回家吧——从此这个窝，是你们俩的。'
}
