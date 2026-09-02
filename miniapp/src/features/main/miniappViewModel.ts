import type { MiniappTab } from '../../components/MiniappTabBar'
import type { LaunchContext } from '../../services/launchContextApi'
import type { PetState } from '../../domain/types'
import { UNLOCK_BUTTON_LABEL, isRoomUnlocked, type XiaoduoliUnlockState } from '../../domain/xiaoduoliUnlock'

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
    return { label: '邀请好友一起养一只小多利吧~', disabled: false, shareReady: true }
  }
  return { label: '重新准备邀请', disabled: false, shareReady: false }
}

export function getNestActionButton(
  sceneMode: NestSceneMode,
  invitation: ReturnType<typeof getInvitationButtonState>,
  jumping = false,
) {
  if (sceneMode === 'locked') {
    return {
      kind: 'unlock' as const,
      label: UNLOCK_BUTTON_LABEL,
      disabled: jumping,
      shareReady: false,
    }
  }
  // 小多利一人一只：已在养（active）时不再展示邀请好友入口
  if (sceneMode === 'active') {
    return null
  }
  return {
    kind: 'invite' as const,
    ...invitation,
  }
}

export function getFortuneAvailability(birthday: string | null | undefined) {
  return birthday
    ? { ready: true, message: '' }
    : { ready: false, message: '请先在“我的”中设置生日' }
}

export type NestSceneMode = 'loading' | 'empty' | 'locked' | 'active'

// 信件场景（空状态/锁定）整层固定占满一屏：内容高度固定且接近一屏，
// 若留在文档流会连同 220px 底部留白撑出整页滚动，真机上表现为整页可拖动。
export function shouldLockNestPageScroll(mode: NestSceneMode) {
  return mode === 'empty' || mode === 'locked'
}

export function getNestSceneMode(
  context: LaunchContext | null,
  pet: PetState | null,
  roomId = '',
  unlock: XiaoduoliUnlockState | null = null,
  simulateUnlock = false,
): NestSceneMode {
  if (!context) return 'loading'
  // GM 模拟解锁：无视真实解锁态强制锁定信纸场景（盒子待解锁），供播放跳出动画反复验收
  if (simulateUnlock) return 'locked'
  // 小多利只能和一位好友共养：没有任何带小多利的房间时，仍展示邀请信件引导邀请其他好友
  if (!context.rooms.some((room) => room.pet)) return 'empty'
  if (!pet) return 'loading'
  if (unlock?.initialized && !isRoomUnlocked(unlock, roomId)) return 'locked'
  return 'active'
}

export function hasFriendConversations(conversations: Array<{ type: string }>) {
  return conversations.some((conversation) => conversation.type === 'pair')
}

export interface ChatMessageLike {
  senderType: 'user' | 'pet'
  senderId?: string
}

export function getMessagePresentation(message: ChatMessageLike, viewerId: string, friendName: string) {
  if (message.senderType === 'pet') return { mine: false, name: '小多利' }
  if (message.senderId && message.senderId !== viewerId) return { mine: false, name: friendName }
  return { mine: true, name: '我' }
}
