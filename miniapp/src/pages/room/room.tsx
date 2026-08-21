import { useEffect, useMemo, useState } from 'react'
import { Button, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { launchContextApi, type LaunchContext } from '../../services/launchContextApi'
import { roomApi, type RoomBootstrap, type RoomMessage } from '../../services/roomApi'
import './room.scss'

const activeRoomKey = 'pet10_active_room_id'

export default function Room() {
  const [roomId, setRoomId] = useState('')
  const [context, setContext] = useState<LaunchContext | null>(null)
  const [bootstrap, setBootstrap] = useState<RoomBootstrap | null>(null)
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('正在进入共享房间')
  const [submitting, setSubmitting] = useState(false)
  const [visible, setVisible] = useState(true)

  Taro.useLoad((options) => {
    const nextRoomId = typeof options?.roomId === 'string'
      ? options.roomId
      : Taro.getStorageSync<string>(activeRoomKey) || ''
    setRoomId(nextRoomId)
    if (nextRoomId) Taro.setStorageSync(activeRoomKey, nextRoomId)
  })

  Taro.useDidShow(() => setVisible(true))
  Taro.useDidHide(() => setVisible(false))

  const partner = useMemo(
    () => context?.rooms.find((room) => room.id === roomId)?.partner,
    [context, roomId],
  )

  const loadRoom = async () => {
    if (!roomId) {
      setStatus('请先在首页选择一个小窝')
      return
    }
    try {
      const [nextBootstrap, nextContext] = await Promise.all([
        roomApi.bootstrap(roomId),
        launchContextApi.get(roomId),
      ])
      setBootstrap(nextBootstrap)
      setMessages(nextBootstrap.messages)
      setContext(nextContext)
      setStatus('已连接真实 Pet10 房间')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '进入共享房间失败')
    }
  }

  const refreshMessages = async () => {
    if (!roomId) return
    try {
      setMessages(await roomApi.listMessages(roomId))
    } catch {
      setStatus('消息同步暂时失败，正在重试')
    }
  }

  useEffect(() => {
    void loadRoom()
  }, [roomId])

  useEffect(() => {
    if (!visible || !roomId) return
    const timer = setInterval(() => {
      void refreshMessages()
    }, 3000)
    return () => clearInterval(timer)
  }, [visible, roomId])

  const sendMessage = async () => {
    const text = draft.trim()
    if (!text || !roomId || submitting) return
    setSubmitting(true)
    try {
      const sent = await roomApi.sendMessage(roomId, text)
      setMessages((current) => [...current.filter((message) => message.id !== sent.id), sent])
      setDraft('')
      setStatus('消息已发送')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '消息发送失败')
    } finally {
      setSubmitting(false)
    }
  }

  const requestPetReply = async () => {
    if (!roomId || submitting) return
    setSubmitting(true)
    try {
      const reply = await roomApi.requestPetReply(roomId)
      setMessages((current) => [...current.filter((message) => message.id !== reply.id), reply])
      setStatus('小多利来啦')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '小多利暂时没有回应')
    } finally {
      setSubmitting(false)
    }
  }

  const senderName = (message: RoomMessage) => {
    if (message.senderType === 'pet') return bootstrap?.pet?.name || '小多利'
    if (message.senderId === context?.user.id) return '我'
    return partner?.displayName || '好友'
  }

  const lastMessageId = messages.length ? `message-${messages[messages.length - 1].id}` : undefined

  return (
    <View className="room-page">
      <View className="room-heading">
        <Text className="room-eyebrow">PET10 · 真实共享房间</Text>
        <Text className="room-title">{partner ? `和${partner.displayName}的小窝` : '双人共享房间'}</Text>
        <Text className="room-caption">
          {bootstrap?.pet
            ? `${bootstrap.pet.name} · Lv.${bootstrap.pet.level}`
            : '正在读取小窝信息'}
        </Text>
      </View>

      <ScrollView
        className="message-list"
        scrollY
        scrollIntoView={lastMessageId}
        enhanced
        showScrollbar={false}
      >
        {messages.length === 0 && <View className="empty-message">
          <Text>还没有消息，先和好友打个招呼吧。</Text>
        </View>}
        {messages.map((message) => {
          const mine = message.senderType === 'user' && message.senderId === context?.user.id
          return <View
            id={`message-${message.id}`}
            key={message.id}
            className={mine ? 'message-row message-row-mine' : 'message-row'}
          >
            <Text className="message-sender">{senderName(message)}</Text>
            <View className={message.senderType === 'pet'
              ? 'message-bubble message-bubble-pet'
              : mine
                ? 'message-bubble message-bubble-mine'
                : 'message-bubble'}
            >
              <Text>{message.text || (message.kind === 'image' ? '[图片]' : '')}</Text>
            </View>
          </View>
        })}
      </ScrollView>

      <View className="composer">
        <Input
          className="message-input"
          value={draft}
          maxlength={4000}
          confirmType="send"
          placeholder="和好友、小多利说点什么"
          onInput={(event) => setDraft(event.detail.value)}
          onConfirm={sendMessage}
        />
        <Button className="send-button" loading={submitting} onClick={sendMessage}>发送</Button>
      </View>

      <Button className="pet-reply-button" loading={submitting} onClick={requestPetReply}>
        叫小多利说句话
      </Button>
      <Text className="room-status">{status}</Text>
    </View>
  )
}
