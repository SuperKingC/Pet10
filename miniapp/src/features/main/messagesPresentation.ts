/**
 * 消息页展示纯函数：会话列表行（名称/头像/预览/时间）与聊天页（日期分隔/气泡归属）。
 * 设计对齐 PWA 末版的 ConversationList / ChatView。
 */

export interface ConversationLike {
  type: 'pair' | 'pet_dm'
  title: string
}

export interface ConversationLatestMessageLike {
  kind: 'text' | 'image' | 'pet'
  text: string
}

export interface ConversationRowPresentation {
  /** 会话行主标题：pair 显示好友昵称，pet_dm 固定小多利 */
  name: string
  /** 远端头像 URL；pet_dm 用包内插画（由视图层解析），此处为 null */
  avatarUrl: string | null
  /** 无头像时的首字占位 */
  initial: string
  isPet: boolean
}

const PET_DM_FALLBACK_PREVIEW = '汪！我在呢，来找我聊天嘛～'
const PAIR_FALLBACK_PREVIEW = '成为好友啦，一起照顾小多利吧'

export function getConversationRowPresentation(input: {
  type: 'pair' | 'pet_dm'
  title: string
  friendName: string
  friendAvatarUrl: string | null
}): ConversationRowPresentation {
  if (input.type === 'pet_dm') {
    return { name: '小多利', avatarUrl: null, initial: '小', isPet: true }
  }
  const name = input.friendName.trim() || input.title
  return {
    name,
    avatarUrl: input.friendAvatarUrl,
    initial: name.slice(0, 1) || '好',
    isPet: false,
  }
}

export function getConversationPreviewText(
  latestMessage: ConversationLatestMessageLike | undefined,
  fallback: string,
  type: 'pair' | 'pet_dm',
): string {
  if (!latestMessage) {
    return fallback || (type === 'pet_dm' ? PET_DM_FALLBACK_PREVIEW : PAIR_FALLBACK_PREVIEW)
  }
  if (latestMessage.kind === 'image') return '[图片]'
  return latestMessage.text || PAIR_FALLBACK_PREVIEW
}

export function getConversationTimeLabel(raw: string, now = new Date()): string {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  if (isSameDay(date, now)) return formatClock(date)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function getDayDividerLabel(raw: string | undefined, now = new Date()): string | undefined {
  if (!raw) return undefined
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return undefined
  if (isSameDay(date, now)) return '今天'
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (isSameDay(date, yesterday)) return '昨天'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** 气泡内时间：仅时:分，无效时间返回空串不渲染 */
export function getChatClockLabel(raw: string): string {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return formatClock(date)
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatClock(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
