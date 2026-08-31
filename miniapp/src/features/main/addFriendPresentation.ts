import type { MiniappFriendLookup } from '../../services/socialCircleApi'

export type FriendRelation = MiniappFriendLookup['relation']

export interface FriendRequestAction {
  /** 按钮文案；空串表示该状态下不展示按钮，由提示文案说明 */
  label: string
  disabled: boolean
  /** 信息卡里的关系提示文案 */
  hint: string
}

// 搜索结果卡的状态机：只有 relation === 'none' 才出现「加好友」按钮，其余状态只读提示
export function getFriendRequestAction(relation: FriendRelation): FriendRequestAction {
  switch (relation) {
    case 'self':
      return { label: '', disabled: true, hint: '这是你自己的 UID 呀~' }
    case 'friends':
      return { label: '', disabled: true, hint: '你们已经是好友啦' }
    case 'request_sent':
      return { label: '', disabled: true, hint: '好友申请已发送，等 Ta 通过吧' }
    case 'request_received':
      return { label: '', disabled: true, hint: 'Ta 也想加你，去通知里通过申请' }
    default:
      return { label: '加好友', disabled: false, hint: '找到 Ta 啦，打个招呼吧' }
  }
}

// 推荐行右侧小按钮：本次弹窗内已发过申请就置灰为「已申请」
export function getSuggestionAction(sent: boolean): { label: string; disabled: boolean } {
  return sent ? { label: '已申请', disabled: true } : { label: '加好友', disabled: false }
}
