import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Conversation, Message } from '../domain/types'
import type { RoomRuntime } from '../state/useRoomRuntime'
import { FriendProfileCard } from './FriendProfileCard'
import { AvatarView } from './AvatarView'
import { MentionPicker, type MentionOption } from './MentionPicker'

interface ChatViewProps {
  conversation: Conversation
  runtime: RoomRuntime
  onBack(): void
  onSend(text: string, imageUrl?: string): Promise<void>
  onTyping(): void
  onUploadImage(file: File): Promise<string>
}

function dayLabel(raw?: string): string | undefined {
  if (!raw) return undefined
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return undefined
  const now = new Date()
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(date, now)) return '今天'
  const yesterday = new Date(now.getTime() - 86400000)
  if (sameDay(date, yesterday)) return '昨天'
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(date)
}

export function ChatView({ conversation, runtime, onBack, onSend, onTyping, onUploadImage }: ChatViewProps) {
  const [draft, setDraft] = useState('')
  const [pendingImage, setPendingImage] = useState<string>()
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPetDm = conversation.type === 'pet_dm'

  const mentionOptions: MentionOption[] = useMemo(() => {
    const options: MentionOption[] = []
    if (conversation.friend) {
      options.push({ key: 'friend', label: conversation.friend.displayName, avatar: conversation.friend.avatarUrl ?? null, user: conversation.friend })
    }
    options.push({ key: 'pet', label: '小多利', avatar: '/pet/xiaoduoli-small.jpg', isPet: true })
    return options
  }, [conversation.friend, conversation.title])

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [runtime.messages.length, runtime.petTyping, runtime.friendTyping])

  function handleDraftChange(value: string) {
    setDraft(value)
    if (value.endsWith('@')) setMentionOpen(true)
    onTyping()
  }

  async function send() {
    const text = draft.trim()
    if ((!text && !pendingImage) || sending) return
    setSending(true)
    setSendError('')
    try {
      await onSend(text || '分享了一张照片', pendingImage)
      setDraft('')
      setPendingImage(undefined)
    } catch (error) {
      setSendError(error instanceof Error ? error.message : '消息发送失败')
    } finally {
      setSending(false)
    }
  }

  function renderRow(message: Message) {
    if (message.sender === 'you') {
      return (
        <div key={message.id} className="chat-row chat-row--mine">
          <div className="chat-bubble chat-bubble--mine">
            {message.imageUrl && <img className="chat-bubble__image" src={message.imageUrl} alt="图片消息" />}
            {message.text && <p>{message.text}</p>}
            <time>{message.createdAt}</time>
          </div>
        </div>
      )
    }
    const isPet = message.sender === 'pet'
    return (
      <div key={message.id} className="chat-row">
        <button
          className="chat-row__avatar"
          onClick={() => { if (!isPetDm && !isPet) setProfileOpen(true) }}
          aria-label={isPet ? '小多利' : `${conversation.title}的头像`}
        >
          {isPet
            ? <img className="img-multiply" src="/pet/xiaoduoli-small.jpg" alt="" />
            : conversation.friend
              ? <AvatarView user={conversation.friend} size={36} style={{ width: '100%', height: '100%' }} />
              : <span>{conversation.title.slice(0, 1)}</span>}
        </button>
        <div className="chat-row__body">
          <span className="chat-row__name">{isPet ? '小多利' : conversation.friend?.displayName ?? conversation.title}</span>
          <div className={`chat-bubble ${isPet ? 'chat-bubble--pet' : 'chat-bubble--friend'}`}>
            {message.imageUrl && <img className="chat-bubble__image" src={message.imageUrl} alt="图片消息" />}
            {message.text && <p>{message.text}</p>}
            <time>{message.createdAt}</time>
          </div>
        </div>
      </div>
    )
  }

  const rows: ReactNode[] = []
  let lastDay = ''
  for (const message of runtime.messages) {
    const label = dayLabel(message.rawCreatedAt)
    if (label && label !== lastDay) {
      lastDay = label
      rows.push(<div key={`day-${message.id}`} className="chat-day-divider"><span>{label}</span></div>)
    }
    rows.push(renderRow(message))
  }

  return (
    <section className="chat-view">
      <header className="chat-view__header">
        <button className="chat-view__back" onClick={onBack} aria-label="返回会话列表">‹</button>
        <button
          className="chat-view__title"
          onClick={() => { if (!isPetDm && conversation.friend) setProfileOpen(true) }}
        >
          <strong>{conversation.title}</strong>
          <span>
            {runtime.petTyping
              ? '小多利正在输入…'
              : runtime.friendTyping
                ? `${conversation.title}正在输入…`
                : isPetDm ? '随时听你碎碎念' : '你们和小多利的家'}
          </span>
        </button>
        {!isPetDm && conversation.friend && (
          <button className="chat-view__avatar" onClick={() => setProfileOpen(true)} aria-label="查看资料">
            <AvatarView user={conversation.friend} size={38} style={{ width: '100%', height: '100%' }} />
          </button>
        )}
        {isPetDm && <span className="chat-view__avatar"><img className="img-multiply" src="/pet/xiaoduoli-small.jpg" alt="" /></span>}
      </header>

      <div className="chat-view__scroll" ref={scrollRef}>
        {!runtime.loaded && <p className="chat-view__loading">正在加载消息…</p>}
        {rows}
        {runtime.petTyping && (
          <div className="chat-row">
            <span className="chat-row__avatar"><img className="img-multiply" src="/pet/xiaoduoli-small.jpg" alt="" /></span>
            <div className="chat-bubble chat-bubble--pet chat-bubble--typing"><span /><span /><span /></div>
          </div>
        )}
      </div>

      <footer className="composer">
        {sendError && <div className="composer-error">消息发送失败，请重试（{sendError}）</div>}
        {pendingImage && (
          <div className="pending-image">
            <img src={pendingImage} alt="待发送图片" />
            <button onClick={() => setPendingImage(undefined)} aria-label="移除图片">×</button>
          </div>
        )}
        <div className="composer__row">
          <button className="circle-button" onClick={() => fileInputRef.current?.click()} aria-label="发送图片">＋</button>
          <input
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
            placeholder={isPetDm ? '和小多利说点悄悄话…' : '输入 @ 可提及好友或小多利…'}
          />
          <button className="send-button" disabled={sending} onClick={() => void send()}>
            {sending ? '发送中…' : '发送'}
          </button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) setPendingImage(await onUploadImage(file))
            }}
          />
        </div>
      </footer>

      {mentionOpen && (
        <MentionPicker
          options={mentionOptions}
          onPick={(option) => {
            setDraft((current) => `${current.slice(0, -1)}@${option.label} `)
            setMentionOpen(false)
          }}
          onClose={() => setMentionOpen(false)}
        />
      )}

      {profileOpen && conversation.friend && (
        <FriendProfileCard user={conversation.friend} onClose={() => setProfileOpen(false)} />
      )}
    </section>
  )
}
