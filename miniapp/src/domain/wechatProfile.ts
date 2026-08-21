export interface WechatProfileDraft {
  displayName?: string
  avatarUrl?: string
}

export function normalizeWechatProfile(draft: WechatProfileDraft) {
  const displayName = draft.displayName?.trim()
  const avatarUrl = draft.avatarUrl?.trim()
  return {
    ...(displayName ? { displayName } : {}),
    ...(avatarUrl ? { avatarUrl } : {})
  }
}
