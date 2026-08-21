import { useEffect, useState } from 'react'
import { Button, Input, Image, Picker, Text, View } from '@tarojs/components'
import type { LaunchContext } from '../../services/launchContextApi'
import { socialApi, type MiniappNotification } from '../../services/socialApi'
import { defaultAvatarConfig, parseAvatarConfig, type MiniappAvatarConfig } from '../../domain/avatarConfig'
import { MiniappAvatarEditor } from './MiniappAvatarEditor'
import { MiniappAvatarPreview } from './MiniappAvatarPreview'
import { getProfilePresentation } from './miniappViewModel'
import './MiniappMeView.scss'

const birthdayIcon = require('../../assets/me/birthday.png')
const notificationIcon = require('../../assets/me/notification.png')
const contactIcon = require('../../assets/me/contact.png')
const aboutIcon = require('../../assets/me/about.png')
const logoutIcon = require('../../assets/me/logout.png')
const mbtiOptions = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']
interface MiniappMeViewProps {
  context: LaunchContext | null
  onLogout(): void
}

export function MiniappMeView({ context, onLogout }: MiniappMeViewProps) {
  const profilePresentation = getProfilePresentation(context?.user || null)
  const displayName = profilePresentation.displayName
  const [nameDraft, setNameDraft] = useState(displayName)
  const [birthday, setBirthday] = useState('')
  const [mbti, setMbti] = useState('')
  const [avatarConfig, setAvatarConfig] = useState<MiniappAvatarConfig>(defaultAvatarConfig)
  const [avatarUrl, setAvatarUrl] = useState(profilePresentation.avatarUrl)
  const [avatarEditing, setAvatarEditing] = useState(false)
  const [notifications, setNotifications] = useState<MiniappNotification[]>([])
  const [notificationUnread, setNotificationUnread] = useState(0)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setNameDraft(displayName)
  }, [displayName])

  useEffect(() => {
    void socialApi.getProfile().then((profile) => {
      setNameDraft(profile.displayName || displayName)
      setBirthday(profile.birthday || '')
      setMbti(profile.mbti || '')
      setAvatarConfig(parseAvatarConfig(profile.avatarConfig))
      setAvatarUrl(profile.avatarUrl || profilePresentation.avatarUrl)
    }).catch(() => undefined)
  }, [displayName])

  const loadNotifications = async () => {
    try {
      const result = await socialApi.listNotifications()
      setNotifications(result.items)
      setNotificationUnread(result.unread)
    } catch {
      setNotice('通知暂时无法加载')
    }
  }

  const saveProfile = async () => {
    if (!nameDraft.trim() || busy) return
    setBusy(true)
    try {
      await socialApi.updateProfile({ displayName: nameDraft.trim(), birthday: birthday || null, mbti: mbti || null })
      setNotice('资料已保存')
      setEditing(false)
    } catch {
      setNotice('资料保存失败')
    } finally {
      setBusy(false)
    }
  }

  const markNotificationsRead = async () => {
    await socialApi.markNotificationsRead()
    setNotificationUnread(0)
    setNotifications((items) => items.map((item) => ({ ...item, read: true })))
  }

  const updateBirthday = async (value: string) => {
    if (busy) return
    setBirthday(value)
    setBusy(true)
    try {
      await socialApi.updateProfile({ birthday: value || null })
      setNotice('生日已保存')
    } catch {
      setNotice('生日保存失败')
    } finally {
      setBusy(false)
    }
  }

  const saveAvatar = async () => {
    if (busy) return
    setBusy(true)
    try {
      await socialApi.updateProfile({ avatarConfig: JSON.stringify(avatarConfig) })
      setAvatarEditing(false)
      setNotice('头像已保存')
    } catch {
      setNotice('头像保存失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="miniapp-me">
      <View className="miniapp-page-header miniapp-me__header">
        <Text className="miniapp-page-title miniapp-me__title">我的</Text>
        <Text className="miniapp-page-caption miniapp-me__caption">管理你的 Pet10 资料和偏好。</Text>
      </View>
      <View className="miniapp-me__profile" onClick={() => setAvatarEditing(true)}>
        {avatarUrl ? <Image className="miniapp-me__avatar-image" src={avatarUrl} mode="aspectFill" /> : <MiniappAvatarPreview config={avatarConfig} compact />}
        <View>
          <Text className="miniapp-me__name">{nameDraft || displayName}</Text>
        </View>
      </View>
      <View className="miniapp-me__list">
        <Picker mode="date" value={birthday || '2000-01-01'} onChange={(event) => void updateBirthday(event.detail.value)}>
        <View className="miniapp-me__item"><Image src={birthdayIcon} mode="aspectFit" /><Text>生日</Text><Text className="miniapp-me__birthday-value">{birthday || '设置'}</Text></View>
        </Picker>
        <View className="miniapp-me__item" onClick={() => setEditing(true)}><Text className="miniapp-me__mbti-icon">MBTI</Text><Text>性格类型</Text><Text>{mbti || '设置'}</Text></View>
        <View className="miniapp-me__item" onClick={() => void loadNotifications()}><Image src={notificationIcon} mode="aspectFit" /><Text>消息通知</Text><Text>{notificationUnread > 0 ? `${notificationUnread} 条未读` : '查看'}</Text></View>
        <View className="miniapp-me__item"><Image src={contactIcon} mode="aspectFit" /><Text>联系我们</Text><Text>›</Text></View>
        <View className="miniapp-me__item"><Image src={aboutIcon} mode="aspectFit" /><Text>关于小多利</Text><Text>›</Text></View>
        <Button className="miniapp-me__logout" onClick={onLogout}><Image src={logoutIcon} mode="aspectFit" /><Text>退出登录</Text></Button>
      </View>
      {editing && <View className="miniapp-me__editor">
        <Text className="miniapp-me__editor-title">编辑资料</Text>
        <Input value={nameDraft} maxlength={20} placeholder="昵称" onInput={(event) => setNameDraft(event.detail.value)} />
        <Input value={birthday} type="text" placeholder="生日，例如 1990-01-01" onInput={(event) => setBirthday(event.detail.value)} />
        <Text className="miniapp-me__field-label">性格类型（可选）</Text>
        <View className="miniapp-me__mbti-grid">
          {mbtiOptions.map((option) => (
            <Button
              key={option}
              className={mbti === option ? 'miniapp-me__mbti-option miniapp-me__mbti-option--active' : 'miniapp-me__mbti-option'}
              onClick={() => setMbti(option)}
            >
              {option}
            </Button>
          ))}
        </View>
        <View className="miniapp-me__editor-actions">
          <Button onClick={() => setEditing(false)}>取消</Button>
          <Button loading={busy} onClick={() => void saveProfile()}>保存</Button>
        </View>
      </View>}
      {notifications.length > 0 && <View className="miniapp-me__notifications">
        <View className="miniapp-me__notifications-header">
          <Text>通知</Text>
          {notificationUnread > 0 && <Button onClick={() => void markNotificationsRead()}>全部已读</Button>}
        </View>
        {notifications.slice(0, 8).map((item) => (
          <View key={item.id} className={item.read ? 'miniapp-me__notification' : 'miniapp-me__notification miniapp-me__notification--unread'}>
            <Text>{String(item.payload?.title || item.type || '新通知')}</Text>
            <Text>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        ))}
      </View>}
      {avatarEditing && (
        <MiniappAvatarEditor
          config={avatarConfig}
          busy={busy}
          onChange={setAvatarConfig}
          onSave={() => void saveAvatar()}
          onClose={() => setAvatarEditing(false)}
        />
      )}
      {notice && <Text className="miniapp-me__notice">{notice}</Text>}
    </View>
  )
}
