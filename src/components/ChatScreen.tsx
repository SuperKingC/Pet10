import { useEffect, useMemo, useRef, useState } from 'react'
import { applyPetAction, type PetAction } from '../domain/petRules'
import type { Message } from '../domain/types'
import { initialSnapshot } from '../state/mockStore'
import { chatApi } from '../services/chatApi'
import { createMemoryService } from '../services/memoryService'
import { runtimeConfig } from '../services/runtimeConfig'
import type { ServerSession } from '../services/sessionApi'
import { connectRealtime } from '../services/realtimeClient'
import { uploadImageToOss } from '../services/uploadApi'
import { MemoryPanel } from './MemoryPanel'
import { MessageBubble } from './MessageBubble'
import { PetActionBar } from './PetActionBar'
import { PetStatusCard } from './PetStatusCard'

interface ChatScreenProps {
  session?: ServerSession
  onSessionChanged?: () => void
}

export function ChatScreen({ session, onSessionChanged }: ChatScreenProps) {
  const roomId = session?.room?.id ?? initialSnapshot.room.id
  const [pet, setPet] = useState(session?.pet ?? initialSnapshot.pet)
  const [messages, setMessages] = useState(session?.messages ?? initialSnapshot.messages)
  const [memories, setMemories] = useState(session?.memories ?? initialSnapshot.memories)
  const [draft, setDraft] = useState('')
  const [pendingImage, setPendingImage] = useState<string>()
  const [petThinking, setPetThinking] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const realMemoryService = useMemo(() => createMemoryService(roomId), [roomId])

  const subtitle = useMemo(
    () => `${initialSnapshot.friend.online ? '在线' : '离线'} · 你们和小多利的家`,
    []
  )

  async function triggerPetReply(nextMessages: Message[]) {
    setPetThinking(true)
    try {
      const reply = await chatApi.requestPetReply(roomId, nextMessages, pet)
      setMessages((current) => [...current, reply])
    } finally {
      setPetThinking(false)
    }
  }

  async function sendMessage(forcePetReply = false) {
    const text = draft.trim()
    if (!text && !pendingImage) return

    const sent = await chatApi.sendMessage({
      roomId: initialSnapshot.room.id,
      text: text || '分享了一张照片',
      imageUrl: pendingImage
    })
    const nextMessages = [...messages, sent]
    setMessages(nextMessages)
    setDraft('')
    setPendingImage(undefined)

    if (forcePetReply || text.includes('@小多利') || Boolean(sent.imageUrl)) {
      await triggerPetReply(nextMessages)
    }
  }

  async function handleImage(file?: File) {
    if (!file) return
    const imageUrl = runtimeConfig.useMockApi
      ? await chatApi.uploadImage(file)
      : await uploadImageToOss(roomId, file)
    setPendingImage(imageUrl)
  }

  function handlePetAction(action: PetAction) {
    if (runtimeConfig.useMockApi) {
      setPet((current) => applyPetAction(current, action))
      return
    }
    void chatApi.applyPetAction(roomId, action).then(setPet)
  }

  async function removeMemory(memoryId: string) {
    setMemories(await realMemoryService.removeMemory(memories, memoryId))
  }

  useEffect(() => {
    const socket = connectRealtime(roomId, {
      onMessage: (incoming) => {
        const message = incoming as Message
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message])
      },
      onPetUpdated: (incoming) => setPet(incoming as typeof pet),
      onMemoryDeleted: ({ id }) => setMemories((current) => current.filter((memory) => memory.id !== id))
    })
    return () => {
      socket?.disconnect()
    }
  }, [roomId])

  return (
    <main className="app-shell">
      <header className="room-header">
          <button className="header-button" aria-label="返回" onClick={onSessionChanged}>‹</button>
        <div className="room-header__people">
          <div className="stacked-avatar stacked-avatar--you">你</div>
          <div className="stacked-avatar stacked-avatar--friend">友</div>
          <div>
            <strong>共同养小多利</strong>
            <span>{subtitle}</span>
          </div>
        </div>
        <button className="header-button" aria-label="更多">•••</button>
      </header>

      <div className="scroll-area">
        <PetStatusCard pet={pet} onOpenMemories={() => setMemoryOpen(true)} />
        <PetActionBar onAction={handlePetAction} />

        <section className="chat-section">
          <div className="day-divider"><span>今天</span></div>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} friendAvatar={initialSnapshot.friend.avatar} />
          ))}
          {petThinking && (
            <div className="pet-thinking">
              <span /><span /><span />
              小多利正在想怎么回答
            </div>
          )}
        </section>
      </div>

      <footer className="composer">
        {pendingImage && (
          <div className="pending-image">
            <img src={pendingImage} alt="待发送图片" />
            <button onClick={() => setPendingImage(undefined)}>×</button>
          </div>
        )}
        <div className="composer__quick">
          <button onClick={() => setDraft((current) => `${current}${current ? ' ' : ''}@小多利 `)}>@小多利</button>
          <button onClick={() => void triggerPetReply(messages)}>叫宠物</button>
        </div>
        <div className="composer__row">
          <button className="circle-button" onClick={() => fileInputRef.current?.click()} aria-label="发送图片">＋</button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void sendMessage()
              }
            }}
            placeholder="和好友、小多利说点什么…"
          />
          <button className="send-button" onClick={() => void sendMessage()}>发送</button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={(event) => void handleImage(event.target.files?.[0])}
          />
        </div>
      </footer>

      {memoryOpen && (
        <MemoryPanel memories={memories} onClose={() => setMemoryOpen(false)} onRemove={(id) => void removeMemory(id)} />
      )}
    </main>
  )
}
