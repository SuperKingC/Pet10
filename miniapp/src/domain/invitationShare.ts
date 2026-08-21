export function buildInvitationShare(token: string, inviterDisplayName: string) {
  return {
    title: `${inviterDisplayName}邀请你一起养一只小多利`,
    path: `/pages/invite/invite?token=${encodeURIComponent(token)}`,
  }
}
