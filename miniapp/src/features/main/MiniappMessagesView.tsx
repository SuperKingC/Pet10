import { useEffect, useRef, useState } from 'react'
import { Button, Image, Input, ScrollView, Text, View } from '@tarojs/components'
import { roomApi, type RoomMessage } from '../../services/roomApi'
import { startSingleFlightPolling } from '../../services/singleFlightPolling'
import { socialApi, type MiniappConversation } from '../../services/socialApi'
import { MiniappBackButton } from '../../components/MiniappBackButton'
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
const petAvatar = require('../../assets/xiaoduoli.png')

const CHAT_BOTTOM_ANCHOR_ID = 'miniapp-chat-bottom'

interface MiniappMessagesViewProps {
  roomId: string
  viewerId: string
  friendName: string
  onOpenRoom(roomId: string): void
}

function isOwnMessage(message: { senderType?: 'user' | 'pet'; senderId?: string }, viewerId: string) {
  return message.senderType === 'user' && (!message.senderId || message.senderId === viewerId)
}

export function MiniappMessagesView({ roomId, viewerId, friendName, onOpenRoom }: MiniappMessagesViewProps) {
  const [conversations, setConversations] = useState<MiniappConversation[]>([])
  const [conversationsLoaded, setConversationsLoaded] = useState(false)
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

  // 会话列表 3 秒轮询：刷新预览与排序，并按最新消息累计未读角标
  useEffect(() => {
    const stopPolling = startSingleFlightPolling(async (isCurrent) => {
      const result = await socialApi.listConversations()
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

  const requestPetReply = async () => {
    if (!openRoomId || busy) return
    setBusy(true)
    try {
      const message = await roomApi.requestPetReply(openRoomId)
      setMessages((current) => [...current.filter((item) => item.id !== message.id), message])
      lastSeenRef.current[openRoomId] = message.id
      setError('')
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : '小多利暂时没有回复')
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
        <Text className="miniapp-page-caption miniapp-messages__caption">你们的每一句温暖都由小多帮您记住</Text>
      </View>
      {showEmptyState ? (
        <View className="miniapp-messages__empty-card">
          <Image
            className="miniapp-messages__empty-illustration"
            mode="widthFix"
            src={messagesEmpty}
            fadeIn={false}
          />
          <Text className="miniapp-messages__empty-title">还没有消息</Text>
          <Text className="miniapp-messages__empty-copy">搜索好友并通过后，这里会显示你们的聊天。</Text>
          <Button className="miniapp-messages__empty-action" openType="share">去邀请好友</Button>
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
            <View className="miniapp-chat__quick">
              <Button className="miniapp-chat__quick-button" loading={busy} onClick={requestPetReply}>叫小多利说句话</Button>
            </View>
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
