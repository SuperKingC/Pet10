import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { PetActionBar } from '../../components/PetActionBar'
import { PetStatusCard } from '../../components/PetStatusCard'
import type { PetAction, PetState } from '../../domain/types'
import { resolveMiniappLaunchState } from '../../domain/launchState'
import { authApi } from '../../services/authApi'
import { clearAccessToken, getAccessToken } from '../../services/apiClient'
import { launchContextApi, type LaunchContext } from '../../services/launchContextApi'
import { petApi } from '../../services/petApi'
import { mapRoomPet } from '../../services/petMapper'
import './index.scss'

const activeRoomKey = 'pet10_active_room_id'
const invitationKey = 'pet10_invitation_token'
const actionMessages: Record<PetAction, string> = {
  feed: '小多利吃饱了一点。',
  play: '小多利玩得很开心。',
  clean: '小多利变得干净了。',
  sleep: '小多利休息了一会儿。',
}

export default function Index() {
  const [context, setContext] = useState<LaunchContext | null>(null)
  const [pet, setPet] = useState<PetState | null>(null)
  const [roomId, setRoomId] = useState(Taro.getStorageSync<string>(activeRoomKey) || '')
  const [invitationToken, setInvitationToken] = useState(Taro.getStorageSync<string>(invitationKey) || '')
  const [message, setMessage] = useState('请使用微信登录')
  const [loading, setLoading] = useState(false)

  Taro.useLoad((options) => {
    const token = typeof options?.token === 'string' ? options.token : ''
    if (token) {
      Taro.setStorageSync(invitationKey, token)
      setInvitationToken(token)
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取 Pet10 状态失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getAccessToken()) void loadContext()
  }, [])

  useEffect(() => {
    if (invitationToken) {
      Taro.redirectTo({ url: `/pages/invite/invite?token=${encodeURIComponent(invitationToken)}` })
    }
  }, [invitationToken])

  const loginWithWechat = async () => {
    setLoading(true)
    try {
      await authApi.loginWithWechat()
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

  const logout = () => {
    clearAccessToken()
    setContext(null)
    setPet(null)
    setRoomId('')
    setMessage('请使用微信登录')
  }

  const entry = context
    ? resolveMiniappLaunchState(context, invitationToken)
    : 'waiting-room'

  return <View className="home-page">
    {!getAccessToken() && <View className="login-panel">
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

    {context && entry === 'waiting-room' && <View className="waiting-panel">
      <Text className="panel-title">准备中的小窝</Text>
      <Text className="panel-copy">你可以先认识小多利，正式成长会在好友加入后开始。</Text>
      <Button className="room-button" onClick={() => setMessage('邀请分享将在下一阶段接入')}>邀请好友一起养</Button>
    </View>}

    {context && context.rooms.length > 0 && <View className="rooms-panel">
      <Text className="panel-title">我的小窝</Text>
      {context.rooms.map((room) => <Button
        key={room.id}
        className={room.id === roomId ? 'room-item room-item-active' : 'room-item'}
        onClick={() => selectRoom(room.id)}
      >
        和{room.partner.displayName} · 小多利 Lv.{room.pet.level}
      </Button>)}
    </View>}

    {pet && <><PetStatusCard pet={pet} /><PetActionBar onAction={handleAction} /></>}

    <View className="feedback"><Text>{loading ? '正在同步…' : message}</Text></View>
    {getAccessToken() && <Button className="secondary-button" onClick={logout}>退出登录</Button>}
    {getAccessToken() && <Button className="room-button" onClick={() => Taro.navigateTo({ url: '/pages/room/room' })}>进入共享房间</Button>}
  </View>
}
