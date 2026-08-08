import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyPetAction as applyMockPetAction, type PetAction } from '../domain/petRules'
import type { Conversation, Fortune, Message, UserProfile } from '../domain/types'
import { clearAppBadge, setAppBadge } from '../services/appBadge'
import { chatApi } from '../services/chatApi'
import { createMemoryService } from '../services/memoryService'
import { runtimeConfig } from '../services/runtimeConfig'
import type { ServerSession } from '../services/sessionApi'
import { normalizePet, socialApi } from '../services/socialApi'
import { uploadImageToOss } from '../services/uploadApi'
import { initialSnapshot } from '../state/mockStore'
import { useRoomRuntime } from '../state/useRoomRuntime'
import { CalendarTab } from './CalendarTab'
import { ChatView } from './ChatView'
import { ConversationList } from './ConversationList'
import { FeedScreen } from './FeedScreen'
import { FloatingPet } from './FloatingPet'
import { MbtiTestScreen } from './MbtiTestScreen'
import { MeTab } from './MeTab'
import { MemoryPanel } from './MemoryPanel'
import { NestTab } from './NestTab'
import { NotificationCenter } from './NotificationCenter'
import { TabBar, type TabKey } from './TabBar'
import { GobangGame } from '../games/gobang/GobangGame'
import { TarotGame } from '../games/tarot/TarotGame'

interface AppShellProps {
  session?: ServerSession
  onLogout(): void
}

type Overlay = 'feed' | 'notifications' | 'mbti' | 'memory' | 'tarot' | 'gobang' | null

const MOCK_PROFILE: UserProfile = {
  id: 'you',
  email: 'you@pet10.local',
  username: 'you',
  displayName: initialSnapshot.currentUser.name
}

function notifyEnabled() {
  return window.localStorage.getItem('pet10_notify_enabled') !== 'off'
}

function maybeBrowserNotification(title: string, body: string) {
  if (!notifyEnabled()) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/pet/xiaoduoli-small.jpg' })
  } catch { /* 部分环境不支持构造 */ }
}

export function AppShell({ session, onLogout }: AppShellProps) {
  const [profile, setProfile] = useState<UserProfile>(() => session
    ? {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        displayName: session.user.displayName,
        avatarUrl: session.user.avatarUrl ?? null,
        birthday: session.user.birthday ?? null,
        mbti: session.user.mbti ?? null
      }
    : MOCK_PROFILE)
  const [activeTab, setActiveTab] = useState<TabKey>('messages')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentRoomId, setCurrentRoomId] = useState<string>()
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [notificationUnread, setNotificationUnread] = useState(0)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [fortune, setFortune] = useState<Fortune>()

  const currentRoomIdRef = useRef(currentRoomId)
  currentRoomIdRef.current = currentRoomId
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab
  const typingThrottleRef = useRef<Record<string, number>>({})

  const pairRoom = useMemo(() => conversations.find((item) => item.type === 'pair'), [conversations])
  const petDmRoom = useMemo(() => conversations.find((item) => item.type === 'pet_dm'), [conversations])

  const runtime = useRoomRuntime({
    userId: profile.id,
    onIncomingMessage(roomId, message) {
      if (message.sender === 'you') return
      // 会话列表最新一条消息同步
      setConversations((current) => current.map((item) => item.roomId === roomId
        ? {
            ...item,
            latestMessage: { id: message.id, text: message.text, kind: message.kind, createdAt: new Date().toISOString() },
            updatedAt: new Date().toISOString()
          }
        : item))
      const isViewing = currentRoomIdRef.current === roomId && activeTabRef.current === 'messages'
      if (!isViewing || document.hidden) {
        setUnread((current) => {
          const next = { ...current, [roomId]: (current[roomId] ?? 0) + 1 }
          setAppBadge(Object.values(next).reduce((sum, value) => sum + value, 0))
          return next
        })
        if (document.hidden) {
          maybeBrowserNotification(
            message.sender === 'pet' ? '小多利' : '新消息',
            message.kind === 'image' ? '[图片]' : message.text
          )
        }
      }
    },
    onIncomingNotification() {
      setNotificationUnread((count) => count + 1)
    }
  })

  // 会话列表加载 + 全部房间预载（切 tab 不丢消息）
  useEffect(() => {
    let cancelled = false
    socialApi.listConversations()
      .then((list) => {
        if (cancelled) return
        setConversations(list)
        for (const conversation of list) void runtime.loadRoom(conversation.roomId)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 今日运势（幸运互动提示）
  useEffect(() => {
    if (!pairRoom) return
    socialApi.getFortune(pairRoom.roomId).then(setFortune).catch(() => undefined)
  }, [pairRoom?.roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 回到前台且停留在消息页时清角标
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) clearAppBadge()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  function openConversation(roomId: string) {
    setCurrentRoomId(roomId)
    setUnread((current) => {
      const next = { ...current }
      delete next[roomId]
      setAppBadge(Object.values(next).reduce((sum, value) => sum + value, 0))
      return next
    })
    void runtime.loadRoom(roomId)
  }

  async function handleSend(roomId: string, text: string, imageUrl?: string) {
    const sent = await chatApi.sendMessage({ roomId, text, imageUrl })
    runtime.appendMessage(roomId, sent)
    if (runtimeConfig.useMockApi) {
      // Mock 模式没有服务端 brain：本地模拟小多利回复
      window.setTimeout(async () => {
        const reply = await chatApi.requestPetReply(roomId, runtime.states[roomId]?.messages ?? [], initialSnapshot.pet)
        runtime.appendMessage(roomId, reply)
      }, 800)
    }
  }

  function handleTyping(roomId: string) {
    const last = typingThrottleRef.current[roomId] ?? 0
    const now = Date.now()
    if (now - last < 1500) return
    typingThrottleRef.current[roomId] = now
    runtime.getRealtime()?.sendTyping(roomId)
  }

  async function handleUploadImage(roomId: string, file: File): Promise<string> {
    if (runtimeConfig.useMockApi) return chatApi.uploadImage(file)
    return uploadImageToOss(roomId, file)
  }

  function handlePetAction(action: PetAction) {
    if (!pairRoom) return
    const roomId = pairRoom.roomId
    if (runtimeConfig.useMockApi) {
      const current = runtime.states[roomId]?.pet ?? initialSnapshot.pet
      runtime.setPet(roomId, applyMockPetAction(current, action))
      return
    }
    void chatApi.applyPetAction(roomId, action)
      .then((pet) => runtime.setPet(roomId, normalizePet(pet)))
      .catch(() => undefined)
  }

  async function toggleProactive(enabled: boolean) {
    if (!pairRoom) return
    try {
      await socialApi.setProactive(pairRoom.roomId, enabled)
      setConversations((current) => current.map((item) =>
        item.roomId === pairRoom.roomId ? { ...item, proactiveEnabled: enabled } : item))
    } catch { /* 静默 */ }
  }

  async function handleMbtiComplete(mbti: string) {
    try {
      const updated = await socialApi.updateProfile({ mbti })
      setProfile((current) => ({ ...current, mbti: updated.mbti ?? mbti }))
    } finally {
      setOverlay(null)
    }
  }

  async function shareTarotToChat(text: string) {
    const target = pairRoom ?? conversations[0]
    if (!target) throw new Error('no_room')
    await chatApi.sendMessage({ roomId: target.roomId, text })
  }

  function handleLogout() {
    window.localStorage.removeItem('pet10_access_token')
    onLogout()
  }

  const activeConversation = conversations.find((item) => item.roomId === currentRoomId)
  const activeRuntime = currentRoomId ? runtime.states[currentRoomId] : undefined
  const totalUnread = Object.values(unread).reduce((sum, value) => sum + value, 0) + notificationUnread
  const friendNames: Record<string, string> = {
    [profile.id]: profile.displayName,
    ...(pairRoom?.friend ? { [pairRoom.friend.id]: pairRoom.friend.displayName } : {})
  }

  return (
    <main className="app-shell-v2">
      {/* 四面板常驻挂载（display 切换），切 tab 不丢状态 */}
      <section className={`tab-panel ${activeTab === 'messages' ? 'tab-panel--active' : ''}`}>
        <ConversationList
          conversations={conversations}
          unread={unread}
          onOpen={openConversation}
          onOpenFeed={() => setOverlay('feed')}
          onOpenNotifications={() => { setOverlay('notifications'); setNotificationUnread(0) }}
        />
      </section>
      <section className={`tab-panel ${activeTab === 'nest' ? 'tab-panel--active' : ''}`}>
        <NestTab
          pairRoom={pairRoom}
          pet={pairRoom ? runtime.states[pairRoom.roomId]?.pet ?? null : null}
          luckyAction={fortune?.content.luckyAction}
          friendNames={friendNames}
          onAction={handlePetAction}
          onOpenMemories={() => setOverlay('memory')}
          onOpenGame={(game) => setOverlay(game)}
        />
      </section>
      <section className={`tab-panel ${activeTab === 'calendar' ? 'tab-panel--active' : ''}`}>
        <CalendarTab
          pairRoom={pairRoom}
          messages={pairRoom ? runtime.states[pairRoom.roomId]?.messages ?? [] : []}
          myUserId={profile.id}
          friendId={pairRoom?.friend?.id}
          myName={profile.displayName}
          friendName={pairRoom?.friend?.displayName ?? ''}
          onMoodSet={() => undefined}
        />
      </section>
      <section className={`tab-panel ${activeTab === 'me' ? 'tab-panel--active' : ''}`}>
        <MeTab
          user={profile}
          uploadRoomId={pairRoom?.roomId ?? petDmRoom?.roomId}
          onProfileUpdated={setProfile}
          onOpenMbti={() => setOverlay('mbti')}
          onLogout={handleLogout}
        />
      </section>

      {/* 聊天页（全屏覆盖） */}
      {activeConversation && activeTab === 'messages' && (
        <ChatView
          conversation={activeConversation}
          runtime={activeRuntime ?? { loaded: false, messages: [], pet: null, memories: [], petTyping: false, friendTyping: false }}
          onBack={() => setCurrentRoomId(undefined)}
          onSend={(text, imageUrl) => handleSend(activeConversation.roomId, text, imageUrl)}
          onTyping={() => handleTyping(activeConversation.roomId)}
          onUploadImage={(file) => handleUploadImage(activeConversation.roomId, file)}
        />
      )}

      {/* 悬浮小多利：消息页可见，长按切换主动说话 */}
      {activeTab === 'messages' && !currentRoomId && pairRoom && (
        <FloatingPet
          proactiveEnabled={pairRoom.proactiveEnabled}
          onToggleProactive={(enabled) => void toggleProactive(enabled)}
        />
      )}

      <TabBar active={activeTab} onChange={setActiveTab} messageBadge={totalUnread} />

      {/* 全屏覆盖层 */}
      {overlay === 'feed' && (
        <FeedScreen
          pairRoom={pairRoom}
          myUserId={profile.id}
          myName={profile.displayName}
          friendName={pairRoom?.friend?.displayName ?? ''}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay === 'notifications' && (
        <NotificationCenter onClose={() => setOverlay(null)} onUnreadChange={setNotificationUnread} />
      )}
      {overlay === 'mbti' && (
        <MbtiTestScreen onComplete={(mbti) => void handleMbtiComplete(mbti)} onClose={() => setOverlay(null)} />
      )}
      {overlay === 'memory' && pairRoom && (
        <MemoryPanel
          memories={runtime.states[pairRoom.roomId]?.memories ?? []}
          onClose={() => setOverlay(null)}
          onRemove={async (memoryId) => {
            const service = createMemoryService(pairRoom.roomId)
            const remaining = await service.removeMemory(runtime.states[pairRoom.roomId]?.memories ?? [], memoryId)
            runtime.patchRoom(pairRoom.roomId, { memories: remaining })
          }}
        />
      )}
      {overlay === 'tarot' && (
        <TarotGame onClose={() => setOverlay(null)} onShareToChat={shareTarotToChat} />
      )}
      {overlay === 'gobang' && pairRoom && (
        <GobangGame
          roomId={pairRoom.roomId}
          myUserId={profile.id}
          friendName={pairRoom.friend?.displayName ?? '好友'}
          friendId={pairRoom.friend?.id}
          getRealtime={runtime.getRealtime}
          onClose={() => setOverlay(null)}
        />
      )}
    </main>
  )
}
