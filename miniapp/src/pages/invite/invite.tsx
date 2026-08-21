import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { authApi } from '../../services/authApi'
import { getAccessToken } from '../../services/apiClient'
import { resolveInvitationViewer } from '../../domain/invitationViewer'
import { invitationApi, type InvitationSummary } from '../../services/invitationApi'
import { launchContextApi } from '../../services/launchContextApi'
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
        void showInfo('这是你发出的邀请').then(() => {
          Taro.reLaunch({ url: '/pages/index/index' })
        })
        return
      }
      setMessage(
        nextViewerType === 'invitee'
          ? '这是你发出的邀请，请让另一位微信好友打开'
          : '确认后会创建一只只属于你们的小多利'
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取邀请失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token && getAccessToken()) void loadInvitation(token)
  }, [token])

  const loginWithWechat = async () => {
    setLoading(true)
    try {
      await authApi.loginWithWechat()
      await loadInvitation(token)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '微信登录失败')
    } finally {
      setLoading(false)
    }
  }

  const accept = async () => {
    if (!token) return
    setLoading(true)
    try {
      const result = await invitationApi.accept(token)
      Taro.removeStorageSync(invitationKey)
      Taro.setStorageSync(activeRoomKey, result.room.id)
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

  if (redirecting || (token && getAccessToken() && viewerType === null)) return null

  return <View className="invite-page">
    <View className="invite-card">
      <Text className="eyebrow">PET10 · 好友邀请</Text>
      <Text className="invite-title">{invitation ? `${invitation.inviter.displayName} 邀请你一起养小多利` : '一份共同小窝邀请'}</Text>
      <Text className="invite-copy">每位好友都会拥有独立的小窝和一只共同照顾的小多利。</Text>
      {!getAccessToken()
        ? <Button className="wechat-button" loading={loading} onClick={loginWithWechat}>微信登录后查看邀请</Button>
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
