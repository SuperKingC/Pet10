import { useCallback, useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { buildInvitationShare } from '../../domain/invitationShare'
import type { PetAction, PetState } from '../../domain/types'
import { insufficientMessage } from '../../domain/nestTaskModel'
import { resolveInvitationLaunchToken } from '../../domain/invitationLaunch'
import { hasAuthenticatedSession, isAccountMissingError } from '../../domain/sessionState'
import { authApi } from '../../services/authApi'
import { MiniappLoginScreen } from '../../features/auth/MiniappLoginScreen'
import { MiniappLaunchLoading } from '../../features/auth/MiniappLaunchLoading'
import { authenticatedLaunchAssets, prepareLaunchAssets } from '../../services/launchAssetLoader'
import { clearAccessToken, getAccessToken } from '../../services/apiClient'
import { roomApi, type RoomMemory } from '../../services/roomApi'
import { invitationApi, type InvitationSummary } from '../../services/invitationApi'
import { launchContextApi, type LaunchContext } from '../../services/launchContextApi'
import { petApi } from '../../services/petApi'
import { prepareLaunchContext } from '../../services/launchPreparation'
import { MiniappTabBar, type MiniappTab } from '../../components/MiniappTabBar'
import { friendApi } from '../../services/socialCircleApi'
import { MiniappNestView } from '../../features/main/MiniappNestView'
import { MiniappMessagesView } from '../../features/main/MiniappMessagesView'
import { MiniappCoRaisePickerModal } from '../../features/main/MiniappCoRaisePickerModal'
import { MiniappCoRaiseConfirmModal } from '../../features/main/MiniappCoRaiseConfirmModal'
import { MiniappAddFriendModal } from '../../features/main/MiniappAddFriendModal'
import { MiniappCirclePage } from '../../features/main/MiniappCirclePage'
import { MiniappJournalView } from '../../features/main/MiniappJournalView'
import { clearCachedWeekDiaries, prefetchCurrentWeekDiaries } from '../../features/main/journalWeekCache'
import { clearCachedConversations } from '../../features/main/conversationListCache'
import { MiniappMeView } from '../../features/main/MiniappMeView'
import { MiniappPawMenu } from '../../features/main/MiniappPawMenu'
import { MiniappCodewordModal } from '../../features/main/MiniappCodewordModal'
import { MiniappMemoryPanel } from '../../features/main/MiniappMemoryPanel'
import { MiniappGamesPage } from '../../features/main/MiniappGamesPage'
import { MiniappGobangPanel } from '../../features/main/MiniappGobangPanel'
import { MiniappTarotFlow } from '../../features/tarot/MiniappTarotFlow'
import { getInvitationButtonState, getNestActionButton, type NestSceneMode } from '../../features/main/miniappViewModel'
import './index.scss'

// 确认弹窗顶部的小多利头像（头部裁切版，圆形/大图统一用这张）
const petAvatarSource = require('../../assets/xiaoduoli-avatar-v2.png')

const activeRoomKey = 'pet10_active_room_id'
const invitationKey = 'pet10_invitation_token'
const actionMessages: Record<PetAction, string> = {
  feed: '吃饱啦！要是有蛋黄，我会当场开口说谢谢',
  play: '出去玩是我最喜欢的事，仅次于吃',
  clean: '干净了，我走到哪都是人气小狗',
  sleep: '四脚朝天——只有对着信任的人，我才这样睡',
}

type LaunchPhase = 'login' | 'preparing' | 'ready'

export default function Index() {
  const [context, setContext] = useState<LaunchContext | null>(null)
  const [pet, setPet] = useState<PetState | null>(null)
  const [accessToken, setAccessToken] = useState(() => getAccessToken())
  const [roomId, setRoomId] = useState(Taro.getStorageSync<string>(activeRoomKey) || '')
  const [invitationToken, setInvitationToken] = useState('')
  const [shareInvitation, setShareInvitation] = useState<InvitationSummary | null>(null)
  const [preparingShare, setPreparingShare] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [launchPhase, setLaunchPhase] = useState<LaunchPhase>(() => hasAuthenticatedSession(getAccessToken()) ? 'preparing' : 'login')
  const [launchProgress, setLaunchProgress] = useState(() => hasAuthenticatedSession(getAccessToken()) ? 0 : 1)
  const [launchError, setLaunchError] = useState('')
  const [activeTab, setActiveTab] = useState<MiniappTab>('nest')
  const [pawMenuOpen, setPawMenuOpen] = useState(false)
  const [codewordOpen, setCodewordOpen] = useState(false)
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
  const [memories, setMemories] = useState<RoomMemory[]>([])
  const [memoryBusy, setMemoryBusy] = useState(false)
  const [gamesOpen, setGamesOpen] = useState(false)
  const [gobangOpen, setGobangOpen] = useState(false)
  const [tarotOpen, setTarotOpen] = useState(false)
  const [tarotShareTitle, setTarotShareTitle] = useState('')
  const [journalRefreshKey, setJournalRefreshKey] = useState(0)
  const [nestSceneMode, setNestSceneMode] = useState<NestSceneMode>('loading')
  const [boxPhase, setBoxPhase] = useState<'idle' | 'jumping'>('idle')
  // 消息页当前打开的全屏聊天页房间 ID（'' 表示停在会话列表），用于隐藏底部 tab 栏
  const [chatRoomId, setChatRoomId] = useState('')
  // 页面根层级全屏覆盖层：添加好友/小多利圈/选择合养好友/确认合养（必须盖过 tab 栏 z20，
  // 且渲染在消息页 z19 固定层之外，否则被压在下层——真机截图已验证）
  const [overlay, setOverlay] = useState<'' | 'addFriend' | 'circle' | 'coRaisePicker' | 'confirm'>('')
  // 小窝空状态邀请入口打开的选择合养好友弹窗（同样走 overlay）
  const [nestCoRaiseOpen, setNestCoRaiseOpen] = useState(false)
  // 待确认的合养邀请通知（确认弹窗数据）与确认请求状态
  const [coRaiseConfirmInvitation, setCoRaiseConfirmInvitation] = useState<{ relationshipId: string; fromName: string } | null>(null)
  const [coRaiseConfirmBusy, setCoRaiseConfirmBusy] = useState(false)
  // 圈层打开时隐藏 tab 栏
  const overlayHidesTabBar = overlay === 'circle'

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
    const invitationPath = shareInvitation
      ? buildInvitationShare(shareInvitation.token, context?.user.displayName || '好友').path
      : '/pages/index/index'
    if (tarotShareTitle) {
      return {
        title: tarotShareTitle,
        path: invitationPath,
        success: () => {
          void prepareInvitation()
        },
      }
    }
    if (!shareInvitation) {
      return {
        title: '我是小多利，我想认识你，顺便让你养我',
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
      const prepared = await prepareLaunchContext(
        () => launchContextApi.get(activeRoomId, invitationToken),
        petApi.getRoom,
      )
      setContext(prepared.context)
      setRoomId(prepared.roomId)
      if (prepared.roomId) Taro.setStorageSync(activeRoomKey, prepared.roomId)
      setMessage(invitationToken ? '收到一份好友邀请，请确认加入' : '')
      setPet(prepared.pet)
      if (!shareInvitation) void prepareInvitation()
    } finally {
      setLoading(false)
    }
  }

  const prepareLaunch = async (): Promise<boolean> => {
    if (!getAccessToken()) return false
    setLaunchPhase('preparing')
    setLaunchError('')
    setLaunchProgress(0)
    setLoading(true)
    try {
      await Promise.all([
        prepareLaunchAssets(authenticatedLaunchAssets, setLaunchProgress),
        loadContext(),
      ])
      setLaunchProgress(1)
      setLaunchPhase('ready')
      return true
    } catch (error) {
      if (isAccountMissingError(error)) {
        // 账号已在其他设备注销：令牌还有效但用户已不存在，清掉令牌退回登录页，避免卡死在准备页。
        clearAccessToken()
        setAccessToken('')
        setLaunchPhase('login')
        setLaunchError('')
        setMessage('账号已注销，请重新登录')
        return false
      }
      setLaunchError(error instanceof Error ? error.message : '资源准备失败，请重试')
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getAccessToken()) {
      void prepareLaunch()
      // 已登录启动时后台预取本周日记，首次进小记也能直接命中缓存
      prefetchCurrentWeekDiaries()
    } else {
      // 未登录时后台静默预热首屏资源（不驱动进度条），登录后进度条直接命中缓存
      void prepareLaunchAssets(authenticatedLaunchAssets, undefined).catch(() => undefined)
    }
  }, [])

  Taro.useDidShow(() => {
    setAccessToken(getAccessToken())
    setJournalRefreshKey((key) => key + 1)
  })

  useEffect(() => {
    if (invitationToken) {
      Taro.redirectTo({ url: `/pages/invite/invite?token=${encodeURIComponent(invitationToken)}` })
    }
  }, [invitationToken])


  const loginWithWechat = async () => {
    setLoading(true)
    setMessage('')
    setLaunchPhase('preparing')
    setLaunchProgress(0)
    setLaunchError('')
    try {
      await authApi.loginWithWechat()
      prefetchCurrentWeekDiaries()
      const ready = await prepareLaunch()
      if (ready) setAccessToken(getAccessToken())
    } catch (error) {
      if (!getAccessToken()) {
        setLaunchPhase('login')
        setLaunchError('')
      }
      setMessage(error instanceof Error ? error.message : '微信登录失败')
    } finally {
      setLoading(false)
    }
  }

  const retryLaunch = async () => {
    const ready = await prepareLaunch()
    if (ready) setAccessToken(getAccessToken())
  }

  const loadRoomContext = (nextRoomId: string) => {
    void loadContext(nextRoomId).catch((error) => {
      setMessage(error instanceof Error ? error.message : '读取 Pet10 状态失败')
    })
  }

  // 确认合养：服务端校验唯一共养名额后补建小多利，成功刷新上下文进活跃小窝
  const confirmCoRaiseInvitation = async () => {
    const invitation = coRaiseConfirmInvitation
    if (!invitation || coRaiseConfirmBusy) return
    setCoRaiseConfirmBusy(true)
    try {
      await friendApi.confirmCoRaise(invitation.relationshipId)
      setCoRaiseConfirmInvitation(null)
      setOverlay('')
      await loadContext()
      setBoxPhase((current) => current === 'idle' ? 'jumping' : current)
    } catch {
      Taro.showToast({ title: '确认失败，可能对方已和其他人一起养了小多利', icon: 'none', duration: 1800 })
    } finally {
      setCoRaiseConfirmBusy(false)
    }
  }

  const handleAction = async (action: PetAction) => {
    if (!pet || !roomId) return
    setLoading(true)
    try {
      setPet(await petApi.applyAction(roomId, action))
      setMessage(actionMessages[action])
    } catch (error) {
      const reason = error instanceof Error ? error.message : ''
      // 道具不足（服务端 409 insufficient_item）：提示去做任务
      setMessage(reason.includes('insufficient_item')
        ? `${insufficientMessage(action)}，去做任务可以获得道具`
        : (reason || '动作失败'))
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
    clearCachedWeekDiaries()
    clearCachedConversations()
    setAccessToken('')
    setContext(null)
    setPet(null)
    setRoomId('')
    setMessage('')
    setLaunchPhase('login')
    setLaunchProgress(1)
    setLaunchError('')
    setShareInvitation(null)
  }

  const handleJumpFinished = useCallback(() => {
    setBoxPhase('idle')
  }, [])

  if (!hasAuthenticatedSession(accessToken)) {
    return <MiniappLoginScreen
      busy={loading}
      message={message}
      launchPhase={launchPhase === 'ready' ? 'login' : launchPhase}
      launchProgress={launchProgress}
      launchError={launchError}
      onWechatLogin={() => void loginWithWechat()}
      onRetryLaunch={() => void retryLaunch()}
    />
  }

  if (launchPhase !== 'ready') {
    return <MiniappLaunchLoading
      progress={launchProgress}
      error={launchError}
      onRetry={() => void prepareLaunch()}
    />
  }

  const invitationButton = getInvitationButtonState(Boolean(shareInvitation), preparingShare)
  const nestAction = getNestActionButton(nestSceneMode, invitationButton, boxPhase === 'jumping')

  // 小多利一人一只：已在养（任一房间带 pet）时小窝空态邀请入口不再出现
  const hasPetSomewhere = Boolean(context?.rooms.some((room) => room.pet))

  // 小窝底部操作区（邀请/解锁按钮）：动作反馈不再以文字提示呈现（贡献榜下方不再出现「四脚朝天…」类文案），
  // 锁定/空状态时由 NestView 渲染进固定全屏层
  const nestFooter = hasAuthenticatedSession(accessToken) && activeTab === 'nest' ? (
    <>
      {nestAction === null ? null : nestAction.kind === 'unlock' ? (
        <Button className="share-button" disabled={nestAction.disabled} onClick={() => setBoxPhase('jumping')}>
          {nestAction.label}
        </Button>
      ) : nestAction.kind === 'invite' && !hasPetSomewhere ? (
        // 空状态：点「邀请好友一起养」打开选择一起养的好友弹窗（不再直接走微信分享）
        <Button className="share-button" onClick={() => setNestCoRaiseOpen(true)}>
          邀请好友一起养小多利吧~
        </Button>
      ) : (
        <Button className="share-button" openType="share">
          {nestAction.label}
        </Button>
      )}
    </>
  ) : null

  const renderMainContent = () => {
    if (activeTab === 'messages') {
      return <MiniappMessagesView
        roomId={roomId}
        viewerId={context?.user.id || ''}
        friendName={context?.rooms.find((room) => room.id === roomId)?.partner.displayName || '好友'}
        viewerName={context?.user.displayName || '我'}
        hasPet={hasPetSomewhere}
        overlay={overlay}
        onOverlayChange={setOverlay}
        onConfirmRequest={(invitation) => {
          setCoRaiseConfirmInvitation({
            relationshipId: String(invitation.payload?.relationshipId ?? ''),
            fromName: String(invitation.payload?.fromName || '好友'),
          })
        }}
        onOpenRoom={loadRoomContext}
        onChatOpenChange={setChatRoomId}
      />
    }
    if (activeTab === 'calendar') {
      return <MiniappJournalView
        roomId={roomId}
        refreshKey={journalRefreshKey}
      />
    }
    if (activeTab === 'me') {
      return <MiniappMeView context={context} onLogout={logout} onDataChanged={() => void loadContext(roomId)} />
    }
    return <MiniappNestView
      context={context}
      pet={pet}
      roomId={roomId}
      boxPhase={boxPhase}
      footer={nestFooter}
      onAction={handleAction}
      onOpenMemories={() => void openMemories()}
      onSceneModeChange={setNestSceneMode}
      onJumpFinished={handleJumpFinished}
    />
  }

  return <View className="home-page">
    {renderMainContent()}

    <MiniappPawMenu
      open={pawMenuOpen}
      onClose={() => setPawMenuOpen(false)}
      onOpenCodeword={() => { setPawMenuOpen(false); setCodewordOpen(true) }}
      onOpenGames={() => { setPawMenuOpen(false); setGamesOpen(true) }}
      onOpenTarot={() => { setPawMenuOpen(false); setTarotOpen(true) }}
    />
    {codewordOpen && (
      <MiniappCodewordModal
        roomId={roomId}
        onClose={() => setCodewordOpen(false)}
      />
    )}
    {memoryPanelOpen && (
      <MiniappMemoryPanel
        memories={memories}
        busy={memoryBusy}
        onClose={() => setMemoryPanelOpen(false)}
        onRemove={(memoryId) => void removeMemory(memoryId)}
      />
    )}
    {gamesOpen && (
      <MiniappGamesPage
        onClose={() => setGamesOpen(false)}
        onOpenGobang={() => setGobangOpen(true)}
      />
    )}
    {gobangOpen && context && (
      <MiniappGobangPanel
        roomId={roomId}
        myUserId={context.user.id}
        myAvatarUrl={context.user.avatarUrl || null}
        friendId={context.rooms.find((room) => room.id === roomId)?.partner.id || ''}
        friendName={context.rooms.find((room) => room.id === roomId)?.partner.displayName || '好友'}
        friendAvatarUrl={context.rooms.find((room) => room.id === roomId)?.partner.avatarUrl || null}
        onClose={() => setGobangOpen(false)}
      />
    )}
    {tarotOpen && (
      <MiniappTarotFlow
        roomId={roomId}
        onClose={() => { setTarotOpen(false); setTarotShareTitle('') }}
        onShareTitleChange={setTarotShareTitle}
      />
    )}
    {overlay === 'coRaisePicker' && (
      <MiniappCoRaisePickerModal
        onClose={() => setOverlay('')}
        onNeedAddFriend={() => setOverlay('addFriend')}
        onInvited={(name) => {
          setOverlay('')
          Taro.showToast({ title: `已向 ${name} 发出邀请，等 Ta 确认吧`, icon: 'none', duration: 1600 })
        }}
      />
    )}
    {overlay === 'addFriend' && (
      <MiniappAddFriendModal
        onClose={() => setOverlay('')}
      />
    )}
    {overlay === 'circle' && (
      <MiniappCirclePage
        onBack={() => setOverlay('')}
        onOpenAddFriend={() => setOverlay('addFriend')}
      />
    )}
    {nestCoRaiseOpen && (
      <MiniappCoRaisePickerModal
        onClose={() => setNestCoRaiseOpen(false)}
        onNeedAddFriend={() => setNestCoRaiseOpen(false)}
        onInvited={(name) => {
          setNestCoRaiseOpen(false)
          Taro.showToast({ title: `已向 ${name} 发出邀请，等 Ta 确认吧`, icon: 'none', duration: 1600 })
        }}
      />
    )}
    {hasAuthenticatedSession(accessToken) && <MiniappTabBar
      active={activeTab}
      onChange={(tab) => { setPawMenuOpen(false); setActiveTab(tab) }}
      onOpenPawMenu={() => setPawMenuOpen((open) => !open)}
      unreadCount={context?.rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0)}
      hidden={(activeTab === 'messages' && Boolean(chatRoomId)) || overlayHidesTabBar}
    />}
    {overlay === 'confirm' && (
      <MiniappCoRaiseConfirmModal
        busy={coRaiseConfirmBusy}
        friendName={String(coRaiseConfirmInvitation?.fromName || '好友')}
        petAvatarSource={petAvatarSource}
        onCancel={() => {
          setCoRaiseConfirmInvitation(null)
          setOverlay('')
        }}
        onConfirm={() => void confirmCoRaiseInvitation()}
      />
    )}
  </View>
}
