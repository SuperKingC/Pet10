import { useEffect, useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { buildInvitationShare } from '../../domain/invitationShare'
import type { PetAction, PetState } from '../../domain/types'
import { resolveInvitationLaunchToken } from '../../domain/invitationLaunch'
import { hasAuthenticatedSession } from '../../domain/sessionState'
import { authApi } from '../../services/authApi'
import { normalizeWechatProfile } from '../../domain/wechatProfile'
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
import { MiniappGobangPanel } from '../../features/main/MiniappGobangPanel'
import { MiniappTarotFlow } from '../../features/tarot/MiniappTarotFlow'
import { getInvitationButtonState, shouldShowNestFeedback } from '../../features/main/miniappViewModel'
import './index.scss'

const activeRoomKey = 'pet10_active_room_id'
const invitationKey = 'pet10_invitation_token'
const actionMessages: Record<PetAction, string> = {
  feed: '小多利吃饱了一点',
  play: '小多利玩得很开心',
  clean: '小多利变得干净了',
  sleep: '小多利休息了一会儿',
}

function readWechatAvatar(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    Taro.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (result) => resolve(`data:image/jpeg;base64,${result.data as string}`),
      fail: reject
    })
  })
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
  const [gobangOpen, setGobangOpen] = useState(false)
  const [tarotOpen, setTarotOpen] = useState(false)
  const [wechatName, setWechatName] = useState('')
  const [wechatAvatar, setWechatAvatar] = useState('')

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
      setMessage(invitationToken ? '收到一份好友邀请，请确认加入' : '')
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
      const avatarUrl = wechatAvatar && !wechatAvatar.startsWith('http')
        ? await readWechatAvatar(wechatAvatar)
        : wechatAvatar
      await authApi.loginWithWechat(normalizeWechatProfile({
        displayName: wechatName,
        avatarUrl
      }))
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

  if (!hasAuthenticatedSession(accessToken)) {
    return <View className="home-page home-page--login">
      <View className="login-panel">
        <View className="login-profile">
          <Button
            className="login-avatar-button"
            openType="chooseAvatar"
            onChooseAvatar={(event) => setWechatAvatar(event.detail.avatarUrl)}
          >
            {wechatAvatar ? <Image className="login-avatar" src={wechatAvatar} mode="aspectFill" /> : <Text>选择头像</Text>}
          </Button>
          <Input
            className="login-name-input"
            type="nickname"
            value={wechatName}
            placeholder="填写微信昵称（可选）"
            onInput={(event) => setWechatName(event.detail.value)}
          />
        </View>
        <Text className="panel-title">欢迎来到 Pet10</Text>
        <Text className="login-caption">微信登录后，和重要的人一起照顾一只小多利。</Text>
        <Button className="wechat-button" loading={loading} onClick={loginWithWechat}>微信登录</Button>
      </View>
      {message && <View className="feedback"><Text>{loading ? '正在登录…' : message}</Text></View>}
    </View>
  }

  const invitationButton = getInvitationButtonState(Boolean(shareInvitation), preparingShare)

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
    {renderMainContent()}

    {shouldShowNestFeedback(activeTab, loading, message) && <View className="feedback"><Text>{loading ? '正在同步…' : message}</Text></View>}
    <MiniappPawMenu
      open={pawMenuOpen}
      roomId={roomId}
      onClose={() => setPawMenuOpen(false)}
      onOpenMap={() => { setPawMenuOpen(false); setMapPanelOpen(true) }}
      onOpenGobang={() => { setPawMenuOpen(false); setGobangOpen(true) }}
      onOpenTarot={() => { setPawMenuOpen(false); setTarotOpen(true) }}
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
    {gobangOpen && context && roomId && (
      <MiniappGobangPanel
        roomId={roomId}
        myUserId={context.user.id}
        friendId={context.rooms.find((room) => room.id === roomId)?.partner.id || ''}
        friendName={context.rooms.find((room) => room.id === roomId)?.partner.displayName || '好友'}
        onClose={() => setGobangOpen(false)}
      />
    )}
    {tarotOpen && (
      <MiniappTarotFlow roomId={roomId} onClose={() => setTarotOpen(false)} />
    )}
    {hasAuthenticatedSession(accessToken) && activeTab === 'nest' && (invitationButton.shareReady ? (
      <Button className="share-button" openType="share">
        {invitationButton.label}
      </Button>
    ) : (
      <Button className="share-button" disabled={invitationButton.disabled} onClick={() => void prepareInvitation()}>
        {invitationButton.label}
      </Button>
    ))}
    {hasAuthenticatedSession(accessToken) && <MiniappTabBar
      active={activeTab}
      onChange={(tab) => { setPawMenuOpen(false); setActiveTab(tab) }}
      onOpenPawMenu={() => setPawMenuOpen((open) => !open)}
      unreadCount={context?.rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0)}
    />}
  </View>
}
