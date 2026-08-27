import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { authApi } from '../../services/authApi'
import { getAccessToken } from '../../services/apiClient'
import { invitationViewerMessage, resolveInvitationViewer } from '../../domain/invitationViewer'
import { invitationApi, type InvitationSummary } from '../../services/invitationApi'
import { launchContextApi } from '../../services/launchContextApi'
import { addPendingUnlockRoom } from '../../services/xiaoduoliUnlockStorage'
import { showInfo } from '../../services/feedback'
import './invite.scss'

const invitationKey = 'pet10_invitation_token'
const activeRoomKey = 'pet10_active_room_id'

export default function Invite() {
  const [token, setToken] = useState('')
  const [invitation, setInvitation] = useState<InvitationSummary | null>(null)
  const [viewerType, setViewerType] = useState<'owner' | 'invitee' | null>(null)
  const [message, setMessage] = useState('正在读取好友邀请')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [failed, setFailed] = useState(false)

  Taro.useLoad((options) => {
    const nextToken = typeof options?.token === 'string'
      ? options.token
      : Taro.getStorageSync<string>(invitationKey) || ''
    if (!nextToken) {
      setMessage('邀请链接无效')
      return
    }
    Taro.setStorageSync(invitationKey, nextToken)
    setToken(nextToken)
  })

  const loadInvitation = async (invitationToken: string) => {
    if (!getAccessToken()) return
    setLoading(true)
    try {
      const [nextInvitation, context] = await Promise.all([
        invitationApi.get(invitationToken),
        launchContextApi.get(undefined, invitationToken),
      ])
      setInvitation(nextInvitation)
      const nextViewerType = resolveInvitationViewer(nextInvitation.inviter.id, context.user.id)
      setViewerType(nextViewerType)
      if (nextViewerType === 'owner') {
        setRedirecting(true)
        Taro.removeStorageSync(invitationKey)
        void showInfo(invitationViewerMessage(nextViewerType)).then(() => {
          Taro.reLaunch({ url: '/pages/index/index' })
        })
        return
      }
      setMessage(invitationViewerMessage(nextViewerType))
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error ? error.message : '读取邀请失败')
    } finally {
      setLoading(false)
    }
  }

  // 从邀请卡进入即用户明确意图，静默登录后直接展示邀请，省掉一次多余点击
  const openInvitation = async (invitationToken: string) => {
    setFailed(false)
    if (!getAccessToken()) {
      setLoading(true)
      try {
        await authApi.loginWithWechat()
      } catch (error) {
        setFailed(true)
        setMessage(error instanceof Error ? error.message : '微信登录失败，请重试')
        return
      } finally {
        setLoading(false)
      }
    }
    await loadInvitation(invitationToken)
  }

  useEffect(() => {
    if (token) void openInvitation(token)
  }, [token])

  const accept = async () => {
    if (!token) return
    setLoading(true)
    try {
      const result = await invitationApi.accept(token)
      Taro.removeStorageSync(invitationKey)
      Taro.setStorageSync(activeRoomKey, result.room.id)
      addPendingUnlockRoom(result.room.id)
      Taro.reLaunch({ url: '/pages/index/index' })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '接受邀请失败')
    } finally {
      setLoading(false)
    }
  }

  const decline = async () => {
    if (!token) return
    setLoading(true)
    try {
      await invitationApi.decline(token)
      Taro.removeStorageSync(invitationKey)
      Taro.reLaunch({ url: '/pages/index/index' })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '暂时无法拒绝邀请')
    } finally {
      setLoading(false)
    }
  }

  // 失败时必须渲染出来，否则错误文案和重试入口都被这层守卫吞掉，页面整屏空白
  if (redirecting || (token && getAccessToken() && viewerType === null && !failed)) return null

  return <View className="invite-page">
    <View className="invite-card">
      <Text className="eyebrow">PET10 · 好友邀请</Text>
      <Text className="invite-title">{invitation ? `${invitation.inviter.displayName} 选了你，做一起养我的人` : '请选好一起养我的人'}</Text>
      <Text className="invite-copy">我只有这一只，选了就是一辈子。选好之后，你们一起喂我、一起玩、一起看我四脚朝天地睡。</Text>
      {!getAccessToken() || (failed && !invitation)
        ? <Button className="wechat-button" loading={loading} disabled={loading || !token} onClick={() => void openInvitation(token)}>
          {failed ? '重试' : '正在为你打开邀请…'}
        </Button>
        : viewerType === 'owner'
          ? <View className="self-invite-notice">
            <Text>邀请链接已准备好，不能用邀请人自己的账号接受。</Text>
          </View>
          : <View className="action-row">
          <Button className="accept-button" loading={loading} disabled={!invitation} onClick={accept}>接受邀请</Button>
          <Button className="decline-button" loading={loading} disabled={!invitation} onClick={decline}>暂不加入</Button>
        </View>}
      <Text className="feedback">{loading ? '正在处理…' : message}</Text>
    </View>
  </View>
}
