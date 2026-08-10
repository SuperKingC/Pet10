import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyPetAction as applyMockPetAction, type PetAction } from '../domain/petRules'
import { parseAvatarConfig, type AvatarConfig, type Conversation, type Fortune, type Message, type UserProfile } from '../domain/types'
import { clearAppBadge, setAppBadge } from '../services/appBadge'
import { chatApi } from '../services/chatApi'
import { sortConversationsByLatest } from '../services/conversationOrder'
import { createMemoryService } from '../services/memoryService'
import { runtimeConfig } from '../services/runtimeConfig'
import type { ServerSession } from '../services/sessionApi'
import { normalizePet, socialApi } from '../services/socialApi'
import { uploadImageToOss } from '../services/uploadApi'
import { initialSnapshot } from '../state/mockStore'
import { useRoomRuntime } from '../state/useRoomRuntime'
import { AvatarStudio } from './AvatarStudio'
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
import { MapScreen } from '../games/map/MapScreen'
import { TarotGame } from '../games/tarot/TarotGame'
import { formatTarotDownloadTitle } from '../games/tarot/tarotDownloadStatus'
import { useTarotLauncher } from '../games/tarot/useTarotLauncher'
import { FortuneDetail } from './FortuneDetail'
import { mountFortuneHistory } from '../services/fortuneHistory'

interface AppShellProps {
  session?: ServerSession
  onLogout(): void
}

type Overlay = 'feed' | 'notifications' | 'mbti' | 'memory' | 'tarot' | 'gobang' | 'avatar' | 'map' | null

const MOCK_PROFILE: UserProfile = {
  id: 'you',
  email: 'you@pet10.local',
  username: 'you',
  displayName: initialSnapshot.currentUser.name
}

function notifyEnabled() {
  return window.localStorage.getItem('pet10_notify_enabled') !== 'off'
}

function readUiState(): { tab?: TabKey; roomId?: string } {
  try {
    const raw = window.sessionStorage.getItem('pet10_ui_state')
    return raw ? JSON.parse(raw) as { tab?: TabKey; roomId?: string } : {}
  } catch { return {} }
}

function maybeBrowserNotification(title: string, body: string) {
  if (!notifyEnabled()) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/pet/xiaoduoli.png' })
  } catch { /* 部分环境不支持构造 */ }
}

async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = 160
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas_unavailable')
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const width = bitmap.width * scale
  const height = bitmap.height * scale
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function AppShell({ session, onLogout }: AppShellProps) {
  const [profile, setProfile] = useState<UserProfile>(() => session
    ? {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        displayName: session.user.displayName,
        publicCode: session.user.publicCode ?? null,
        avatarUrl: session.user.avatarUrl ?? null,
        avatarConfig: session.user.avatarConfig ?? null,
        birthday: session.user.birthday ?? null,
        mbti: session.user.mbti ?? null
      }
    : MOCK_PROFILE)
  const [activeTab, setActiveTab] = useState<TabKey>(() => readUiState().tab ?? 'messages')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentRoomId, setCurrentRoomId] = useState<string | undefined>(() => readUiState().roomId)
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [notificationUnread, setNotificationUnread] = useState(0)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [fortuneDetail, setFortuneDetail] = useState<Fortune>()
  const [mapVersion, setMapVersion] = useState(0)

  const currentRoomIdRef = useRef(currentRoomId)
  currentRoomIdRef.current = currentRoomId
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab
  const typingThrottleRef = useRef<Record<string, number>>({})
  const mockReplyTimersRef = useRef<Record<string, number>>({})
  const mockMessageBatchesRef = useRef<Record<string, Message[]>>({})
  const studioUploadRef = useRef<HTMLInputElement>(null)
  const tarotLauncher = useTarotLauncher({ onOpen: () => setOverlay('tarot') })

  useEffect(() => {
    if (!fortuneDetail) return
    return mountFortuneHistory(() => setFortuneDetail(undefined))
  }, [fortuneDetail])

  const pairRoom = useMemo(() => conversations.find((item) => item.type === 'pair'), [conversations])
  const petDmRoom = useMemo(() => conversations.find((item) => item.type === 'pet_dm'), [conversations])

  const runtime = useRoomRuntime({
    userId: profile.id,
    onIncomingMessage(roomId, message) {
      if (message.sender === 'you') return
      // 会话列表最新一条消息同步
      const receivedAt = new Date().toISOString()
      setConversations((current) => sortConversationsByLatest(current.map((item) => item.roomId === roomId
        ? {
            ...item,
            latestMessage: { id: message.id, text: message.text, kind: message.kind, createdAt: receivedAt },
            updatedAt: receivedAt
          }
        : item)))
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
    },
    onProfileUpdated() {
      // 好友改昵称/头像/捏脸后重拉会话列表，标题/头像/名字全刷新
      socialApi.listConversations().then(setConversations).catch(() => undefined)
    },
    onMapLit() {
      // 好友点亮地图点位 → 地图页实时刷新
      setMapVersion((version) => version + 1)
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

  // 回到前台且停留在消息页时清角标
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) clearAppBadge()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // UI 状态持久化：iOS 杀后台重载后恢复聊天页/标签
  useEffect(() => {
    window.sessionStorage.setItem('pet10_ui_state', JSON.stringify({ tab: activeTab, roomId: currentRoomId }))
  }, [activeTab, currentRoomId])

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
    const sentAt = new Date().toISOString()
    setConversations((current) => sortConversationsByLatest(current.map((item) => item.roomId === roomId
      ? {
          ...item,
          latestMessage: { id: sent.id, text: sent.text, kind: sent.kind, createdAt: sentAt },
          updatedAt: sentAt
        }
      : item)))
    if (runtimeConfig.useMockApi) {
      const conversation = conversations.find((item) => item.roomId === roomId)
      const batch = [...(mockMessageBatchesRef.current[roomId] ?? []), sent]
      mockMessageBatchesRef.current[roomId] = batch
      window.clearTimeout(mockReplyTimersRef.current[roomId])
      const delay = conversation?.type === 'pet_dm' ? 250 : 1500
      mockReplyTimersRef.current[roomId] = window.setTimeout(async () => {
        const pending = mockMessageBatchesRef.current[roomId] ?? []
        mockMessageBatchesRef.current[roomId] = []
        const knownMessages = runtime.states[roomId]?.messages ?? []
        const reply = await chatApi.requestPetReply(roomId, [...knownMessages, ...pending], initialSnapshot.pet)
        runtime.appendMessage(roomId, reply)
        const repliedAt = new Date().toISOString()
        setConversations((current) => sortConversationsByLatest(current.map((item) => item.roomId === roomId
          ? {
              ...item,
              latestMessage: { id: reply.id, text: reply.text, kind: reply.kind, createdAt: repliedAt },
              updatedAt: repliedAt
            }
          : item)))
      }, delay)
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

  async function handleAvatarSave(config: AvatarConfig) {
    const serialized = JSON.stringify(config)
    const updated = await socialApi.updateProfile({ avatarConfig: serialized })
    setProfile((current) => ({ ...current, avatarConfig: updated.avatarConfig ?? serialized }))
    setOverlay(null)
  }

  async function handleStudioPhoto(file?: File) {
    if (!file) return
    try {
      const roomId = pairRoom?.roomId ?? petDmRoom?.roomId
      let avatarUrl: string
      if (!runtimeConfig.useMockApi && roomId) {
        avatarUrl = await uploadImageToOss(roomId, file)
      } else {
        avatarUrl = await fileToAvatarDataUrl(file)
      }
      const updated = await socialApi.updateProfile({ avatarUrl })
      setProfile((current) => ({ ...current, avatarUrl: updated.avatarUrl ?? avatarUrl }))
      setOverlay(null)
    } catch { /* 静默 */ }
  }

  async function shareTarotToChat(text: string) {
    const target = pairRoom ?? conversations[0]
    if (!target) throw new Error('no_room')
    await chatApi.sendMessage({ roomId: target.roomId, text })
  }

  function handleLogout() {
    window.localStorage.removeItem('pet10_access_token')
    window.sessionStorage.removeItem('pet10_ui_state')
    onLogout()
  }

  const activeConversation = conversations.find((item) => item.roomId === currentRoomId)
  const activeRuntime = currentRoomId ? runtime.states[currentRoomId] : undefined
  const totalUnread = Object.values(unread).reduce((sum, value) => sum + value, 0) + notificationUnread
  const friendNames: Record<string, string> = {
    [profile.id]: profile.displayName,
    ...(pairRoom?.friend ? { [pairRoom.friend.id]: pairRoom.friend.displayName } : {})
  }

  function openGame(game: 'tarot' | 'gobang' | 'map') {
    if (game !== 'tarot') {
      setOverlay(game)
      return
    }
    void tarotLauncher.open()
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
          friendNames={friendNames}
          onAction={handlePetAction}
          onOpenMemories={() => setOverlay('memory')}
          onOpenGame={openGame}
        />
      </section>
      <section className={`tab-panel ${activeTab === 'calendar' ? 'tab-panel--active' : ''}`}>
        <CalendarTab
          pairRoom={pairRoom}
          messages={pairRoom ? runtime.states[pairRoom.roomId]?.messages ?? [] : []}
          myUserId={profile.id}
          friendId={pairRoom?.friend?.id}
          friendName={pairRoom?.friend?.displayName ?? ''}
          onMoodSet={() => undefined}
          onOpenFortune={setFortuneDetail}
          onSetBirthday={() => setActiveTab('me')}
          active={activeTab === 'calendar'}
          birthday={profile.birthday}
        />
      </section>
      <section className={`tab-panel ${activeTab === 'me' ? 'tab-panel--active' : ''}`}>
        <MeTab
          user={profile}
          onProfileUpdated={setProfile}
          onOpenAvatar={() => setOverlay('avatar')}
          onOpenMbti={() => setOverlay('mbti')}
          onLogout={handleLogout}
        />
      </section>

      {/* 聊天页（全屏覆盖） */}
      {activeConversation && activeTab === 'messages' && (
        <ChatView
          conversation={activeConversation}
          currentUser={profile}
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
          myProfile={profile}
          friendName={pairRoom?.friend?.displayName ?? ''}
          onClose={() => setOverlay(null)}
        />
      )}
      {fortuneDetail && <FortuneDetail fortune={fortuneDetail} onClose={() => setFortuneDetail(undefined)} />}
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
      {tarotLauncher.load && (
        <section className="tarot-download" role="dialog" aria-modal="true" aria-label="塔罗资源下载">
          <div className="tarot-download__sigil" aria-hidden="true"><span>II</span></div>
          <h2>{tarotLauncher.load.error ? '资源尚未准备好' : formatTarotDownloadTitle(tarotLauncher.load.progress)}</h2>
          <p>{tarotLauncher.load.error ?? '正在准备 22 张牌面与塔罗场景'}</p>
          <div className="tarot-download__bar" aria-label={`下载进度 ${Math.round(tarotLauncher.load.progress * 100)}%`}>
            <span style={{ width: `${tarotLauncher.load.progress * 100}%` }} />
          </div>
          <div className="tarot-download__actions">
            {tarotLauncher.load.error && <button onClick={() => void tarotLauncher.open()}>重新下载</button>}
            <button onClick={tarotLauncher.closeLoad}>关闭</button>
          </div>
        </section>
      )}
      {overlay === 'avatar' && (
        <>
          <AvatarStudio
            initialConfig={parseAvatarConfig(profile.avatarConfig)}
            onSave={(config) => void handleAvatarSave(config)}
            onUploadPhoto={() => studioUploadRef.current?.click()}
            onClose={() => setOverlay(null)}
          />
          <input
            ref={studioUploadRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void handleStudioPhoto(file)
            }}
          />
        </>
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
      {overlay === 'map' && pairRoom && (
        <MapScreen
          roomId={pairRoom.roomId}
          myUserId={profile.id}
          friendNames={friendNames}
          refreshKey={mapVersion}
          onClose={() => setOverlay(null)}
        />
      )}
    </main>
  )
}
