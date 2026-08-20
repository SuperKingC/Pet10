import { useEffect, useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { PetActionBar } from '../../components/PetActionBar'
import { PetStatusCard } from '../../components/PetStatusCard'
import type { PetAction, PetState } from '../../domain/types'
import { authApi } from '../../services/authApi'
import { getAccessToken } from '../../services/apiClient'
import { petApi } from '../../services/petApi'
import { mapRoomPet } from '../../services/petMapper'
import './index.scss'

const roomKey = 'pet10_room_id'
const actionMessages: Record<PetAction, string> = {
  feed: '小多利吃饱了一点。',
  play: '小多利玩得很开心。',
  clean: '小多利变得干净了。',
  sleep: '小多利休息了一会儿。',
}

export default function Index() {
  const [pet, setPet] = useState<PetState | null>(null)
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [code, setCode] = useState('')
  const [roomId, setRoomId] = useState(Taro.getStorageSync<string>(roomKey) || '')
  const [message, setMessage] = useState('请登录并填写共享房间 ID')
  const [loading, setLoading] = useState(false)
  const [loginCode, setLoginCode] = useState('')

  const loadPet = async () => {
    if (!getAccessToken() || !roomId) return
    setLoading(true)
    try {
      const result = await petApi.getRoom(roomId)
      setPet(result.pet ? mapRoomPet(result.pet) : null)
      setMessage(result.pet ? '已连接真实共享宠物' : '当前房间还没有宠物')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取宠物失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadPet() }, [])

  const requestCode = async () => {
    try {
      const result = await authApi.requestCode(email.trim(), inviteCode.trim())
      setLoginCode(result.developmentCode ?? '')
      setMessage(result.developmentCode ? '开发环境验证码已显示，请填写并验证' : '验证码已发送')
    } catch (error) { setMessage(error instanceof Error ? error.message : '验证码请求失败') }
  }

  const verifyCode = async () => {
    try {
      await authApi.verifyCode(email.trim(), code.trim())
      setMessage('登录成功，请填写共享房间 ID')
    } catch (error) { setMessage(error instanceof Error ? error.message : '登录失败') }
  }

  const handleAction = async (action: PetAction) => {
    if (!pet || !roomId) return
    setLoading(true)
    try {
      setPet(await petApi.applyAction(roomId, action))
      setMessage(actionMessages[action])
    } catch (error) { setMessage(error instanceof Error ? error.message : '动作失败') }
    finally { setLoading(false) }
  }

  const saveRoom = () => {
    Taro.setStorageSync(roomKey, roomId.trim())
    void loadPet()
  }

  return <View className="home-page">
    {!getAccessToken() && <View className="login-panel">
      <Text className="panel-title">连接 Pet10 账号</Text>
      <Input className="text-input" value={email} placeholder="邮箱" onInput={(event) => setEmail(event.detail.value)} />
      <Input className="text-input" value={inviteCode} placeholder="邀请码" onInput={(event) => setInviteCode(event.detail.value)} />
      <View className="inline-actions"><Button onClick={requestCode}>获取验证码</Button><Input className="code-input" value={code} placeholder="验证码" onInput={(event) => setCode(event.detail.value)} /><Button onClick={verifyCode}>登录</Button></View>
      {loginCode && <Text className="dev-code">开发验证码：{loginCode}</Text>}
    </View>}
    <View className="page-heading">
      <Text className="eyebrow">PET10 · 微信小程序第二阶段</Text>
      <Text className="page-title">照顾你们的小多利</Text>
      <Text className="page-description">真实共享房间数据，资源与排版复用 Pet10 PWA。</Text>
    </View>
    <View className="room-panel">
      <Input className="text-input" value={roomId} placeholder="输入共享房间 ID" onInput={(event) => setRoomId(event.detail.value)} />
      <Button onClick={saveRoom}>连接房间</Button>
    </View>
    {pet && <><PetStatusCard pet={pet} /><PetActionBar onAction={handleAction} /></>}
    <View className="feedback"><Text>{loading ? '正在同步…' : message}</Text></View>
    <Button className="room-button" onClick={() => Taro.navigateTo({ url: '/pages/room/room' })}>进入双人共享房间</Button>
  </View>
}
