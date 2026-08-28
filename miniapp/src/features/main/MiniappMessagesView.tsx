import { useEffect, useState } from 'react'
import { Button, Image, Input, ScrollView, Text, View } from '@tarojs/components'
import { roomApi, type RoomMessage } from '../../services/roomApi'
import { startSingleFlightPolling } from '../../services/singleFlightPolling'
import { socialApi, type MiniappConversation } from '../../services/socialApi'
import { getMessagePresentation, hasFriendConversations } from './miniappViewModel'
import './MiniappMessagesView.scss'

const messagesEmpty = require('../../assets/messages-empty.png')

interface MiniappMessagesViewProps {
  roomId: string
  viewerId: string
  friendName: string
  onOpenRoom(roomId: string): void
}

export function MiniappMessagesView({ roomId, viewerId, friendName, onOpenRoom }: MiniappMessagesViewProps) {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conversations, setConversations] = useState<MiniappConversation[]>([])

  useEffect(() => {
    if (!roomId) return
    const stopPolling = startSingleFlightPolling(async (isCurrent) => {
      try {
        const next = await roomApi.listMessages(roomId)
        if (!isCurrent()) return
        setMessages(next)
      } catch (loadError) {
        if (!isCurrent()) return
        setError(loadError instanceof Error ? loadError.message : '消息加载失败')
      }
    }, 3000)
    return stopPolling
  }, [roomId])

  useEffect(() => {
    let cancelled = false
    void socialApi.listConversations()
      .then((result) => { if (!cancelled) setConversations(result) })
      .catch(() => { if (!cancelled) setConversations([]) })
    return () => { cancelled = true }
  }, [])

  const send = async () => {
    const text = draft.trim()
    if (!roomId || !text || busy) return
    setBusy(true)
    try {
      const message = await roomApi.sendMessage(roomId, text)
      setMessages((current) => [...current.filter((item) => item.id !== message.id), message])
      setDraft('')
      setError('')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '消息发送失败')
    } finally {
      setBusy(false)
    }
  }

  const requestPetReply = async () => {
    if (!roomId || busy) return
    setBusy(true)
    try {
      const message = await roomApi.requestPetReply(roomId)
      setMessages((current) => [...current.filter((item) => item.id !== message.id), message])
      setError('')
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : '小多利暂时没有回复')
    } finally {
      setBusy(false)
    }
  }

  const showEmptyState = !hasFriendConversations(conversations)

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
        <>
          <View className="miniapp-messages__conversation-list">
            {conversations.map((conversation) => (
              <Button
                key={conversation.roomId}
                className={conversation.roomId === roomId
                  ? 'miniapp-messages__conversation miniapp-messages__conversation--active'
                  : 'miniapp-messages__conversation'}
                onClick={() => onOpenRoom(conversation.roomId)}
              >
                <View>
                  <Text className="miniapp-messages__conversation-title">{conversation.title}</Text>
                  <Text className="miniapp-messages__conversation-copy">
                    {conversation.latestMessage?.text || '开启你们的共同聊天'}
                  </Text>
                </View>
                <Text className="miniapp-messages__arrow">›</Text>
              </Button>
            ))}
          </View>
          <ScrollView className="miniapp-messages__list" scrollY>
            {messages.length === 0 && <Text className="miniapp-messages__empty">还没有消息，先打个招呼吧。</Text>}
            {messages.map((message) => {
              const presentation = getMessagePresentation(message, viewerId, friendName)
              return (
                <View key={message.id} className={presentation.mine ? 'miniapp-message miniapp-message--mine' : 'miniapp-message'}>
                  <Text className="miniapp-message__sender">{presentation.name}</Text>
                  <Text className="miniapp-message__bubble">{message.text || (message.kind === 'image' ? '[图片]' : '')}</Text>
                </View>
              )
            })}
          </ScrollView>
          <View className="miniapp-messages__composer">
            <Input
              className="miniapp-messages__input"
              value={draft}
              confirmType="send"
              placeholder="和好友、小多利说点什么"
              onInput={(event) => setDraft(event.detail.value)}
              onConfirm={send}
            />
            <Button className="miniapp-messages__send" loading={busy} onClick={send}>发送</Button>
          </View>
          <Button className="miniapp-messages__pet-reply" loading={busy} onClick={requestPetReply}>叫小多利说句话</Button>
          {error && <Text className="miniapp-messages__error">{error}</Text>}
        </>
      )}
    </View>
  )
}
