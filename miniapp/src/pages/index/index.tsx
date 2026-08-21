import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { buildInvitationShare } from '../../domain/invitationShare'
import type { PetAction, PetState } from '../../domain/types'
import { resolveInvitationLaunchToken } from '../../domain/invitationLaunch'
import { resolveMiniappLaunchState } from '../../domain/launchState'
import { hasAuthenticatedSession } from '../../domain/sessionState'
import { authApi } from '../../services/authApi'
import { clearAccessToken, getAccessToken } from '../../services/apiClient'
import { roomApi, type RoomMemory } from '../../services/roomApi'
import { invitationApi, type InvitationSummary } from '../../services/invitationApi'
import { launchContextApi, type LaunchContext } from '../../services/launchContextApi'
import { petApi } from '../../services/petApi'
import { mapRoomPet } from '../../services/petMapper'
import { MiniappTabBar, type MiniappTab } from '../../components/MiniappTabBar'
import { MiniappNestView } from '../../features/main/MiniappNestView'
import { MiniappMessagesView } from '../../features/main/MiniappMessagesView'
import { MiniappCalendarView } from '../../features/main/MiniappCalendarView'
import { MiniappMeView } from '../../features/main/MiniappMeView'
import { MiniappPawMenu } from '../../features/main/MiniappPawMenu'
import { MiniappMemoryPanel } from '../../features/main/MiniappMemoryPanel'
import { MiniappMapPanel } from '../../features/main/MiniappMapPanel'
import './index.scss'

const activeRoomKey = 'pet10_active_room_id'
const invitationKey = 'pet10_invitation_token'
const actionMessages: Record<PetAction, string> = {
  feed: '小多利吃饱了一点',
  play: '小多利玩得很开心',
  clean: '小多利变得干净了',
  sleep: '小多利休息了一会儿',
}

export default function Index() {
  const [context, setContext] = useState<LaunchContext | null>(null)
  const [pet, setPet] = useState<PetState | null>(null)
  const [accessToken, setAccessToken] = useState(() => getAccessToken())
  const [roomId, setRoomId] = useState(Taro.getStorageSync<string>(activeRoomKey) || '')
  const [invitationToken, setInvitationToken] = useState('')
  const [shareInvitation, setShareInvitation] = useState<InvitationSummary | null>(null)
  const [preparingShare, setPreparingShare] = useState(false)
  const [message, setMessage] = useState('请使用微信登录')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<MiniappTab>('nest')
  const [pawMenuOpen, setPawMenuOpen] = useState(false)
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
  const [memories, setMemories] = useState<RoomMemory[]>([])
  const [memoryBusy, setMemoryBusy] = useState(false)
  const [mapPanelOpen, setMapPanelOpen] = useState(false)

  Taro.useLoad((options) => {
    const token = resolveInvitationLaunchToken(options)
    if (token) {
      Taro.setStorageSync(invitationKey, token)
      setInvitationToken(token)
    }
  })

  const prepareInvitation = async () => {
    if (!getAccessToken() || preparingShare) return
    setPreparingShare(true)
    try {
      setShareInvitation(await invitationApi.create())
    } catch (error) {
      setShareInvitation(null)
      setMessage(error instanceof Error ? error.message : '邀请准备失败，请重试')
    } finally {
      setPreparingShare(false)
    }
  }

  Taro.useShareAppMessage(() => {
    if (!shareInvitation) {
      return {
        title: '来 Pet10 和我一起养一只小多利',
        path: '/pages/index/index',
      }
    }
    return {
      ...buildInvitationShare(shareInvitation.token, context?.user.displayName || '好友'),
      success: () => {
        void prepareInvitation()
      },
    }
  })

  const loadContext = async (activeRoomId?: string) => {
    if (!getAccessToken()) return
    setLoading(true)
    try {
      const nextContext = await launchContextApi.get(activeRoomId, invitationToken)
      const nextRoomId = nextContext.activeRoomId || ''
      setContext(nextContext)
      setRoomId(nextRoomId)
      if (nextRoomId) Taro.setStorageSync(activeRoomKey, nextRoomId)
      setMessage(invitationToken ? '收到一份好友邀请，请确认加入' : '已恢复你的 Pet10 小窝')
      if (nextRoomId) {
        const result = await petApi.getRoom(nextRoomId)
        setPet(result.pet ? mapRoomPet(result.pet) : null)
      } else {
        setPet(null)
      }
      if (!shareInvitation) void prepareInvitation()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取 Pet10 状态失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getAccessToken()) void loadContext()
  }, [])

  Taro.useDidShow(() => {
    setAccessToken(getAccessToken())
  })

  useEffect(() => {
    if (invitationToken) {
      Taro.redirectTo({ url: `/pages/invite/invite?token=${encodeURIComponent(invitationToken)}` })
    }
  }, [invitationToken])

  const loginWithWechat = async () => {
    setLoading(true)
    try {
      await authApi.loginWithWechat()
      setAccessToken(getAccessToken())
      await loadContext()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '微信登录失败')
    } finally {
      setLoading(false)
    }
  }

  const selectRoom = (nextRoomId: string) => {
    setRoomId(nextRoomId)
    Taro.setStorageSync(activeRoomKey, nextRoomId)
    void loadContext(nextRoomId)
  }

  const handleAction = async (action: PetAction) => {
    if (!pet || !roomId) return
    setLoading(true)
    try {
      setPet(await petApi.applyAction(roomId, action))
      setMessage(actionMessages[action])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '动作失败')
    } finally {
      setLoading(false)
    }
  }

  const openMemories = async () => {
    if (!roomId) return
    setMemoryPanelOpen(true)
    setMemoryBusy(true)
    try {
      setMemories(await roomApi.listMemories(roomId))
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '记忆加载失败', icon: 'none' })
    } finally {
      setMemoryBusy(false)
    }
  }

  const removeMemory = async (memoryId: string) => {
    if (!roomId || memoryBusy) return
    setMemoryBusy(true)
    try {
      await roomApi.deleteMemory(roomId, memoryId)
      setMemories((current) => current.filter((memory) => memory.id !== memoryId))
      Taro.showToast({ title: '已删除', icon: 'none', duration: 1000 })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
    } finally {
      setMemoryBusy(false)
    }
  }

  const logout = () => {
    clearAccessToken()
    setAccessToken('')
    setContext(null)
    setPet(null)
    setRoomId('')
    setMessage('请使用微信登录')
    setShareInvitation(null)
  }

  const entry = context
    ? resolveMiniappLaunchState(context, invitationToken)
    : 'waiting-room'

  const renderMainContent = () => {
    if (activeTab === 'messages') {
      return <MiniappMessagesView
        roomId={roomId}
        onOpenRoom={(nextRoomId) => {
          setRoomId(nextRoomId)
          Taro.setStorageSync(activeRoomKey, nextRoomId)
          void loadContext(nextRoomId)
        }}
      />
    }
    if (activeTab === 'calendar') {
      return <MiniappCalendarView roomId={roomId} />
    }
    if (activeTab === 'me') {
      return <MiniappMeView context={context} onLogout={logout} />
    }
    return <MiniappNestView
      context={context}
      pet={pet}
      roomId={roomId}
      onAction={handleAction}
      onSelectRoom={selectRoom}
      onOpenMemories={() => void openMemories()}
    />
  }

  return <View className="home-page">
    {!hasAuthenticatedSession(accessToken) && <View className="login-panel">
      <Text className="panel-title">欢迎来到 Pet10</Text>
      <Text className="login-caption">微信登录后，和重要的人一起照顾一只小多利。</Text>
      <Button className="wechat-button" onClick={loginWithWechat}>微信登录</Button>
    </View>}

    <View className="page-heading">
      <Text className="eyebrow">PET10 · 共同小窝</Text>
      <Text className="page-title">{entry === 'waiting-room' ? '小多利正在等你' : '照顾你们的小多利'}</Text>
      <Text className="page-description">
        {entry === 'waiting-room'
          ? '邀请一位好友，建立一个只属于你们的共同小窝。'
          : invitationToken
            ? '这是一份好友邀请，接受后会创建新的共同小窝。'
            : '每一段关系，都有一只只属于你们的小多利。'}
      </Text>
    </View>

    {renderMainContent()}

    <View className="feedback"><Text>{loading ? '正在同步…' : message}</Text></View>
    <MiniappPawMenu
      open={pawMenuOpen}
      roomId={roomId}
      onClose={() => setPawMenuOpen(false)}
      onOpenMap={() => { setPawMenuOpen(false); setMapPanelOpen(true) }}
    />
    {memoryPanelOpen && (
      <MiniappMemoryPanel
        memories={memories}
        busy={memoryBusy}
        onClose={() => setMemoryPanelOpen(false)}
        onRemove={(memoryId) => void removeMemory(memoryId)}
      />
    )}
    {mapPanelOpen && <MiniappMapPanel roomId={roomId} onClose={() => setMapPanelOpen(false)} />}
    {hasAuthenticatedSession(accessToken) && activeTab === 'nest' && <Button
      className="share-button"
      openType="share"
      disabled={!shareInvitation || preparingShare}
    >
      {preparingShare ? '正在准备邀请…' : '邀请好友一起养'}
    </Button>}
    {hasAuthenticatedSession(accessToken) && <MiniappTabBar
      active={activeTab}
      onChange={(tab) => { setPawMenuOpen(false); setActiveTab(tab) }}
      onOpenPawMenu={() => setPawMenuOpen((open) => !open)}
      unreadCount={context?.rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0)}
    />}
  </View>
}
