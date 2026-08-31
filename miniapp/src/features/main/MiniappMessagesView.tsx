import { useEffect, useRef, useState } from 'react'
import { Button, Image, Input, ScrollView, Text, View } from '@tarojs/components'
import { roomApi, type RoomMessage } from '../../services/roomApi'
import { startSingleFlightPolling } from '../../services/singleFlightPolling'
import { socialApi, type MiniappConversation, type MiniappNotification } from '../../services/socialApi'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { fetchConversationsWithCache, getCachedConversations as fetchCachedConversations } from './conversationListCache'
import { getMessagePresentation, hasFriendConversations } from './miniappViewModel'
import {
  getConversationPreviewText,
  getConversationRowPresentation,
  getConversationTimeLabel,
  getDayDividerLabel,
  getChatClockLabel,
} from './messagesPresentation'
import './MiniappMessagesView.scss'

const messagesEmpty = require('../../assets/messages-empty-v2.png')
// 头像框（圆形 aspectFill）统一用头部裁切版：全身图裁中间会落在胸口、脑袋显示偏下
const petAvatar = require('../../assets/xiaoduoli-avatar-v2.png')
const pawIcon = require('../../assets/navigation/paw.png')

const CHAT_BOTTOM_ANCHOR_ID = 'miniapp-chat-bottom'

interface MiniappMessagesViewProps {
  roomId: string
  viewerId: string
  friendName: string
  /** 是否已在任一小窝养小多利（共养后不再展示合养邀请入口） */
  hasPet: boolean
  /** 页面根层级全屏覆盖层开关（弹窗/圈要盖过 tab 栏，必须渲染在消息页固定层之外） */
  overlay: '' | 'addFriend' | 'circle' | 'coRaisePicker' | 'confirm'
  onOverlayChange(overlay: '' | 'addFriend' | 'circle' | 'coRaisePicker' | 'confirm'): void
  /** 用户点了邀请提示入口，携带待确认邀请给页面根层级渲染确认弹窗 */
  onConfirmRequest?(invitation: MiniappNotification): void
  onOpenRoom(roomId: string): void
  /** 全屏聊天页打开/关闭时上报，页面据此隐藏底部 tab 栏 */
  onChatOpenChange?(chatRoomId: string): void
}

function isOwnMessage(message: { senderType?: 'user' | 'pet'; senderId?: string }, viewerId: string) {
  return message.senderType === 'user' && (!message.senderId || message.senderId === viewerId)
}

export function MiniappMessagesView({ roomId, viewerId, friendName, hasPet, overlay, onOverlayChange, onConfirmRequest, onOpenRoom, onChatOpenChange }: MiniappMessagesViewProps) {
  // tab 切换会重挂载本组件：初始化 state 时先查会话缓存，命中就直出列表（不闪无好友空态页）
  const [conversations, setConversations] = useState<MiniappConversation[]>(() => fetchCachedConversations() ?? [])
  const [conversationsLoaded, setConversationsLoaded] = useState(() => fetchCachedConversations() !== null)
  // '' 表示停在会话列表页；非空表示打开了对应会话的全屏聊天页（PWA 末版两层结构）
  const [openRoomId, setOpenRoomId] = useState('')
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [messagesLoaded, setMessagesLoaded] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [unread, setUnread] = useState<Record<string, number>>({})
  // 各房间已读到的最新消息 ID：轮询发现更新的他人消息时计未读，打开会话即清零
  const lastSeenRef = useRef<Record<string, string>>({})
  const initializedRef = useRef(false)
  // 收到的合养邀请通知（小窝邀请提示入口数据源）；确认弹窗由页面根层级渲染
  const [coRaiseInvitations, setCoRaiseInvitations] = useState<MiniappNotification[]>([])

  // 会话列表 3 秒轮询：刷新预览与排序，并按最新消息累计未读角标
  useEffect(() => {
    const stopPolling = startSingleFlightPolling(async (isCurrent) => {
      const result = await fetchConversationsWithCache()
      if (!isCurrent()) return
      setConversations(result)
      setConversationsLoaded(true)
      setUnread((current) => {
        const next = { ...current }
        for (const conversation of result) {
          const latest = conversation.latestMessage
          if (!latest) continue
          if (lastSeenRef.current[conversation.roomId] === latest.id) continue
          const seenBefore = Boolean(lastSeenRef.current[conversation.roomId])
          lastSeenRef.current[conversation.roomId] = latest.id
          if (!seenBefore && !initializedRef.current) continue
          if (isOwnMessage(latest, viewerId)) continue
          if (openRoomId === conversation.roomId) continue
          next[conversation.roomId] = (next[conversation.roomId] ?? 0) + 1
        }
        initializedRef.current = true
        return next
      })
    }, 3000)
    return stopPolling
  }, [viewerId, openRoomId])

  // 打开的会话 3 秒轮询最新消息
  useEffect(() => {
    if (!openRoomId) return
    const stopPolling = startSingleFlightPolling(async (isCurrent) => {
      const next = await roomApi.listMessages(openRoomId)
      if (!isCurrent()) return
      setMessages(next)
      setMessagesLoaded(true)
      setError('')
      const latest = next[next.length - 1]
      if (latest) lastSeenRef.current[openRoomId] = latest.id
      if (latest) setUnread((current) => {
        if (!(openRoomId in current)) return current
        const nextUnread = { ...current }
        delete nextUnread[openRoomId]
        return nextUnread
      })
    }, 3000)
    return () => {
      stopPolling()
    }
  }, [openRoomId])

  // 打开会话时清空本地消息缓存，避免串房间
  useEffect(() => {
    setMessages([])
    setMessagesLoaded(false)
    setDraft('')
    setError('')
  }, [openRoomId])

  // 聊天页开关上报给页面（tab 栏隐藏逻辑）
  useEffect(() => {
    onChatOpenChange?.(openRoomId)
  }, [openRoomId, onChatOpenChange])

  // 合养邀请提示：进入消息页拉一次通知，筛选未确认的 co_raise_invitation
  useEffect(() => {
    if (hasPet) return
    let mounted = true
    void socialApi.listNotifications()
      .then((result) => {
        if (!mounted) return
        setCoRaiseInvitations(result.items.filter((item) => item.type === 'co_raise_invitation' && !item.read))
      })
      .catch(() => undefined)
    return () => { mounted = false }
  }, [hasPet, viewerId])

  const openConversation = (conversation: MiniappConversation) => {
    lastSeenRef.current[conversation.roomId] = conversation.latestMessage?.id ?? ''
    setUnread((current) => {
      const next = { ...current }
      delete next[conversation.roomId]
      return next
    })
    setOpenRoomId(conversation.roomId)
    if (conversation.roomId !== roomId) onOpenRoom(conversation.roomId)
  }

  const send = async () => {
    const text = draft.trim()
    if (!openRoomId || !text || busy) return
    setBusy(true)
    try {
      const message = await roomApi.sendMessage(openRoomId, text)
      setMessages((current) => [...current.filter((item) => item.id !== message.id), message])
      lastSeenRef.current[openRoomId] = message.id
      setDraft('')
      setError('')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '消息发送失败')
    } finally {
      setBusy(false)
    }
  }

  const showEmptyState = !hasFriendConversations(conversations)
  const activeConversation = openRoomId
    ? conversations.find((conversation) => conversation.roomId === openRoomId)
    : undefined

  // 聊天页：按天插入分隔条（今天/昨天/M月D日）
  const chatRows: Array<{ key: string; kind: 'day' | 'message'; dayLabel?: string; message?: RoomMessage }> = []
  let lastDay = ''
  for (const message of messages) {
    const day = getDayDividerLabel(message.createdAt)
    if (day && day !== lastDay) {
      lastDay = day
      chatRows.push({ key: `day-${message.id}`, kind: 'day', dayLabel: day })
    }
    chatRows.push({ key: message.id, kind: 'message', message })
  }

  return (
    <View className="miniapp-messages">
      <View className="miniapp-page-header miniapp-messages__header">
        <Text className="miniapp-page-title miniapp-messages__title">消息</Text>
        <View className="miniapp-messages__actions">
          <View
            className="miniapp-messages__action"
            hoverClass="miniapp-messages__action--hover"
            hoverStayTime={80}
            onClick={() => onOverlayChange('addFriend')}
          >
            <View className="miniapp-messages__action-badge miniapp-messages__action-badge--add">
              <Text className="miniapp-messages__action-glyph">＋</Text>
            </View>
            <View className="miniapp-messages__action-text">
              <Text className="miniapp-messages__action-label">添加好友</Text>
              <Text className="miniapp-messages__action-sub">用 UID 找到 Ta</Text>
            </View>
            <Text className="miniapp-messages__action-arrow">›</Text>
          </View>
          <View
            className="miniapp-messages__action"
            hoverClass="miniapp-messages__action--hover"
            hoverStayTime={80}
            onClick={() => onOverlayChange('circle')}
          >
            <View className="miniapp-messages__action-badge miniapp-messages__action-badge--circle">
              <Image className="miniapp-messages__action-paw" src={pawIcon} mode="aspectFit" fadeIn={false} />
            </View>
            <View className="miniapp-messages__action-text">
              <Text className="miniapp-messages__action-label">小多利圈</Text>
              <Text className="miniapp-messages__action-sub">看看新鲜事</Text>
            </View>
            <Text className="miniapp-messages__action-arrow">›</Text>
          </View>
        </View>
      </View>
      {!hasPet && coRaiseInvitations.length > 0 && !openRoomId && overlay !== 'confirm' && (
        <View
          className="miniapp-messages__invite-banner"
          hoverClass="miniapp-messages__invite-banner--hover"
          hoverStayTime={80}
          onClick={() => {
            const invitation = coRaiseInvitations[0]
            setPendingInvitation(invitation)
            onConfirmRequest?.(invitation)
            onOverlayChange('confirm')
          }}
        >
          <Image className="miniapp-messages__invite-pet" src={petAvatar} mode="aspectFill" fadeIn={false} />
          <View className="miniapp-messages__invite-body">
            <Text className="miniapp-messages__invite-title">{String(coRaiseInvitations[0].payload?.title || '有一份合养小多利的邀请')}</Text>
            <Text className="miniapp-messages__invite-copy">点这里查看邀请，确认后小多利就会住进你们的小窝</Text>
          </View>
          <Text className="miniapp-messages__invite-arrow">›</Text>
        </View>
      )}
      {showEmptyState ? (
        <View className="miniapp-messages__empty-card">
          <Image
            className="miniapp-messages__empty-illustration"
            mode="widthFix"
            src={messagesEmpty}
            fadeIn={false}
          />
          <Text className="miniapp-messages__empty-title">还没有消息</Text>
          <Text className="miniapp-messages__empty-copy">添加好友并通过后，这里会显示你们的聊天。</Text>
        </View>
      ) : (
        <View className="miniapp-messages__conversation-list">
          {!conversationsLoaded && conversations.length === 0 && (
            <Text className="miniapp-messages__list-loading">正在打开你的会话…</Text>
          )}
          {conversations.map((conversation) => {
            const row = getConversationRowPresentation({
              type: conversation.type,
              title: conversation.title,
              friendName: conversation.type === 'pair'
                ? (conversation.friend?.displayName || friendName)
                : '',
              friendAvatarUrl: conversation.friend?.avatarUrl ?? null,
            })
            const count = unread[conversation.roomId] ?? 0
            return (
              <View
                key={conversation.roomId}
                className="miniapp-messages__conversation"
                hoverClass="miniapp-messages__conversation--hover"
                hoverStayTime={80}
                onClick={() => openConversation(conversation)}
              >
                <View className={row.isPet
                  ? 'miniapp-messages__avatar miniapp-messages__avatar--pet'
                  : 'miniapp-messages__avatar'}
                >
                  {row.isPet ? (
                    <Image className="miniapp-messages__avatar-image" src={petAvatar} mode="aspectFill" />
                  ) : row.avatarUrl ? (
                    <Image className="miniapp-messages__avatar-image" src={row.avatarUrl} mode="aspectFill" />
                  ) : (
                    <Text className="miniapp-messages__avatar-letter">{row.initial}</Text>
                  )}
                  {count > 0 && <Text className="miniapp-messages__badge">{count > 99 ? '99+' : count}</Text>}
                </View>
                <View className="miniapp-messages__conversation-body">
                  <View className="miniapp-messages__conversation-top">
                    <Text className="miniapp-messages__conversation-title">{row.name}</Text>
                    {conversation.latestMessage && (
                      <Text className="miniapp-messages__conversation-time">
                        {getConversationTimeLabel(conversation.latestMessage.createdAt)}
                      </Text>
                    )}
                  </View>
                  <Text className="miniapp-messages__conversation-copy">
                    {getConversationPreviewText(
                      conversation.latestMessage,
                      conversation.type === 'pet_dm' ? '' : '开启你们的共同聊天',
                      conversation.type,
                    )}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {activeConversation && (
        <View className="miniapp-chat">
          <View className="miniapp-chat__header">
            <MiniappBackButton onClick={() => setOpenRoomId('')} />
            <View className="miniapp-chat__title">
              <Text className="miniapp-chat__name">
                {activeConversation.type === 'pet_dm'
                  ? '小多利'
                  : (activeConversation.friend?.displayName || friendName)}
              </Text>
              <Text className="miniapp-chat__subtitle">
                {activeConversation.type === 'pet_dm' ? '随时听你碎碎念' : '你们和小多利的家'}
              </Text>
            </View>
            <View className={activeConversation.type === 'pet_dm'
              ? 'miniapp-chat__avatar miniapp-chat__avatar--pet'
              : 'miniapp-chat__avatar'}
            >
              {activeConversation.type === 'pet_dm' ? (
                <Image className="miniapp-chat__avatar-image" src={petAvatar} mode="aspectFill" />
              ) : activeConversation.friend?.avatarUrl ? (
                <Image className="miniapp-chat__avatar-image" src={activeConversation.friend.avatarUrl} mode="aspectFill" />
              ) : (
                <Text className="miniapp-chat__avatar-letter">
                  {(activeConversation.friend?.displayName || friendName).slice(0, 1) || '好'}
                </Text>
              )}
            </View>
          </View>
          <ScrollView
            className="miniapp-chat__scroll"
            scrollY
            scrollIntoView={messagesLoaded ? CHAT_BOTTOM_ANCHOR_ID : ''}
            scrollWithAnimation={false}
          >
            {!messagesLoaded && <Text className="miniapp-chat__loading">正在加载消息…</Text>}
            {messagesLoaded && messages.length === 0 && (
              <Text className="miniapp-chat__loading">还没有消息，先打个招呼吧。</Text>
            )}
            {chatRows.map((row) => {
              if (row.kind === 'day') {
                return (
                  <View key={row.key} className="miniapp-chat__day-divider">
                    <Text>{row.dayLabel}</Text>
                  </View>
                )
              }
              const message = row.message!
              const presentation = getMessagePresentation(message, viewerId, friendName)
              const rowClass = presentation.mine ? 'miniapp-chat__row miniapp-chat__row--mine' : 'miniapp-chat__row'
              const bubbleClass = presentation.mine
                ? 'miniapp-chat__bubble miniapp-chat__bubble--mine'
                : message.senderType === 'pet'
                  ? 'miniapp-chat__bubble miniapp-chat__bubble--pet'
                  : 'miniapp-chat__bubble'
              if (presentation.mine) {
                return (
                  <View key={row.key} className={rowClass}>
                    <View className={bubbleClass}>
                      <Text className="miniapp-chat__bubble-text">{message.text || (message.kind === 'image' ? '[图片]' : '')}</Text>
                      <Text className="miniapp-chat__bubble-time">{getChatClockLabel(message.createdAt)}</Text>
                    </View>
                  </View>
                )
              }
              return (
                <View key={row.key} className={rowClass}>
                  <View className={message.senderType === 'pet'
                    ? 'miniapp-chat__row-avatar miniapp-chat__row-avatar--pet'
                    : 'miniapp-chat__row-avatar'}
                  >
                    {message.senderType === 'pet' ? (
                      <Image className="miniapp-chat__avatar-image" src={petAvatar} mode="aspectFill" />
                    ) : activeConversation.friend?.avatarUrl ? (
                      <Image className="miniapp-chat__avatar-image" src={activeConversation.friend.avatarUrl} mode="aspectFill" />
                    ) : (
                      <Text className="miniapp-chat__avatar-letter">{friendName.slice(0, 1) || '好'}</Text>
                    )}
                  </View>
                  <View className="miniapp-chat__row-body">
                    <Text className="miniapp-chat__sender">{presentation.name}</Text>
                    <View className={bubbleClass}>
                      <Text className="miniapp-chat__bubble-text">{message.text || (message.kind === 'image' ? '[图片]' : '')}</Text>
                      <Text className="miniapp-chat__bubble-time">{getChatClockLabel(message.createdAt)}</Text>
                    </View>
                  </View>
                </View>
              )
            })}
            <View id={CHAT_BOTTOM_ANCHOR_ID} className="miniapp-chat__bottom-anchor" />
          </ScrollView>
          <View className="miniapp-chat__composer">
            {error && <Text className="miniapp-chat__error">{error}</Text>}
            <View className="miniapp-chat__composer-row">
              <Input
                className="miniapp-chat__input"
                value={draft}
                confirmType="send"
                placeholder={activeConversation.type === 'pet_dm' ? '和小多利说点悄悄话…' : '和好友、小多利说点什么'}
                cursorSpacing={120}
                onInput={(event) => setDraft(event.detail.value)}
                onConfirm={send}
              />
              <Button className="miniapp-chat__send" loading={busy} onClick={send}>发送</Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
