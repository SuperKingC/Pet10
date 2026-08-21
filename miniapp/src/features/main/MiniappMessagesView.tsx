import { useEffect, useState } from 'react'
import { Button, Input, ScrollView, Text, View } from '@tarojs/components'
import { roomApi, type RoomMessage } from '../../services/roomApi'
import './MiniappMessagesView.scss'

interface MiniappMessagesViewProps {
  roomId: string
  onOpenRoom(): void
}

export function MiniappMessagesView({ roomId, onOpenRoom }: MiniappMessagesViewProps) {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    const load = async () => {
      try {
        const next = await roomApi.listMessages(roomId)
        if (!cancelled) setMessages(next)
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : '消息加载失败')
      }
    }
    void load()
    const timer = setInterval(() => void load(), 3000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [roomId])

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

  return (
    <View className="miniapp-messages">
      <View className="miniapp-messages__header">
        <Text className="miniapp-messages__title">消息</Text>
        <Text className="miniapp-messages__caption">你们的每一句话都会被小多利记住。</Text>
      </View>
      {roomId ? (
        <>
          <Button className="miniapp-messages__conversation" onClick={onOpenRoom}>
            <View>
              <Text className="miniapp-messages__conversation-title">共享房间</Text>
              <Text className="miniapp-messages__conversation-copy">你们和小多利的共同聊天</Text>
            </View>
            <Text className="miniapp-messages__arrow">›</Text>
          </Button>
          <ScrollView className="miniapp-messages__list" scrollY>
            {messages.length === 0 && <Text className="miniapp-messages__empty">还没有消息，先打个招呼吧。</Text>}
            {messages.map((message) => (
              <View key={message.id} className={message.senderType === 'user' ? 'miniapp-message miniapp-message--mine' : 'miniapp-message'}>
                <Text className="miniapp-message__sender">{message.senderType === 'pet' ? '小多利' : '我'}</Text>
                <Text className="miniapp-message__bubble">{message.text || (message.kind === 'image' ? '[图片]' : '')}</Text>
              </View>
            ))}
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
      ) : (
        <View className="miniapp-messages__empty">
          <Text>还没有消息</Text>
          <Text>接受好友邀请后，这里会显示你们的聊天。</Text>
        </View>
      )}
    </View>
  )
}
