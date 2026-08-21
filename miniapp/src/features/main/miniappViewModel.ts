import type { MiniappTab } from '../../components/MiniappTabBar'

export function shouldShowNestFeedback(activeTab: MiniappTab, loading: boolean, message: string) {
  return activeTab === 'nest' && (loading || Boolean(message))
}

export function getProfilePresentation(user: { displayName?: string | null; avatarUrl?: string | null } | null) {
  return {
    displayName: user?.displayName?.trim() || '微信用户',
    avatarUrl: user?.avatarUrl || null,
  }
}

export function getGenderLabel(gender: 'female' | 'male' | 'private' | null | undefined) {
  if (gender === 'female') return '女'
  if (gender === 'male') return '男'
  return '保密'
}

export function getInvitationButtonState(shareReady: boolean, preparing: boolean) {
  if (preparing) {
    return { label: '正在准备邀请…', disabled: true, shareReady: false }
  }
  if (shareReady) {
    return { label: '邀请好友一起养', disabled: false, shareReady: true }
  }
  return { label: '重新准备邀请', disabled: false, shareReady: false }
}

export function getFortuneAvailability(birthday: string | null | undefined) {
  return birthday
    ? { ready: true, message: '' }
    : { ready: false, message: '请先在“我的”中设置生日' }
}
