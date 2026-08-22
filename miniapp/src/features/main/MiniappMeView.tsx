import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { Button, Input, Image, Picker, Text, View } from '@tarojs/components'
import type { LaunchContext } from '../../services/launchContextApi'
import { socialApi, type MiniappNotification } from '../../services/socialApi'
import { showInfo } from '../../services/feedback'
import { defaultAvatarConfig, parseAvatarConfig, type MiniappAvatarConfig } from '../../domain/avatarConfig'
import { MiniappAvatarEditor } from './MiniappAvatarEditor'
import { MiniappAvatarPreview } from './MiniappAvatarPreview'
import { MiniappModal } from '../../components/MiniappModal'
import { MiniappMbtiTest } from './MiniappMbtiTest'
import { getGenderLabel, getProfilePresentation } from './miniappViewModel'
import './MiniappMeView.scss'

const birthdayIcon = require('../../assets/me/birthday.png')
const notificationIcon = require('../../assets/me/notification.png')
const contactIcon = require('../../assets/me/contact.png')
const aboutIcon = require('../../assets/me/about.png')
const logoutIcon = require('../../assets/me/logout.png')

const CONTACT_EMAIL = 'pet10-support@example.com'
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
  const [gender, setGender] = useState<'female' | 'male' | 'private'>('private')
  const [avatarConfig, setAvatarConfig] = useState<MiniappAvatarConfig>(defaultAvatarConfig)
  const [avatarUrl, setAvatarUrl] = useState(profilePresentation.avatarUrl)
  const [avatarEditing, setAvatarEditing] = useState(false)
  const [notifications, setNotifications] = useState<MiniappNotification[]>([])
  const [notificationUnread, setNotificationUnread] = useState(0)
  const [editing, setEditing] = useState(false)
  const [mbtiTesting, setMbtiTesting] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
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
      setGender(profile.gender || 'private')
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
      await socialApi.updateProfile({ displayName: nameDraft.trim(), birthday: birthday || null, gender })
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

  const copyContactEmail = () => {
    Taro.setClipboardData({ data: CONTACT_EMAIL })
      .then(() => void showInfo('邮箱已复制'))
      .catch(() => setNotice('复制失败，请手动记录邮箱'))
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
        <View className="miniapp-me__item" onClick={() => setMbtiTesting(true)}><Text className="miniapp-me__mbti-icon">测</Text><Text>性格类型</Text><Text className="miniapp-me__value">{mbti ? `${mbti} · 重新测试` : '开始测试'}</Text></View>
        <View className="miniapp-me__item" onClick={() => setEditing(true)}><Text className="miniapp-me__mbti-icon">资</Text><Text>姓名与性别</Text><Text className="miniapp-me__value">{getGenderLabel(gender)} · 编辑</Text></View>
        <View className="miniapp-me__item" onClick={() => void loadNotifications()}><Image src={notificationIcon} mode="aspectFit" /><Text>消息通知</Text><Text>{notificationUnread > 0 ? `${notificationUnread} 条未读` : '查看'}</Text></View>
        <View className="miniapp-me__item" onClick={() => setContactOpen(true)}><Image src={contactIcon} mode="aspectFit" /><Text>联系我们</Text><Text>›</Text></View>
        <View className="miniapp-me__item" onClick={() => setAboutOpen(true)}><Image src={aboutIcon} mode="aspectFit" /><Text>关于小多利</Text><Text>›</Text></View>
        <Button className="miniapp-me__logout" onClick={onLogout}><Image src={logoutIcon} mode="aspectFit" /><Text>退出登录</Text></Button>
      </View>
      {editing && <View className="miniapp-me__editor">
        <Text className="miniapp-me__editor-title">编辑资料</Text>
        <Input value={nameDraft} maxlength={20} placeholder="昵称" onInput={(event) => setNameDraft(event.detail.value)} />
        <Text className="miniapp-me__field-label">性别</Text>
        <Picker mode="selector" range={['保密', '女', '男']} value={gender === 'private' ? 0 : gender === 'female' ? 1 : 2} onChange={(event) => setGender(['private', 'female', 'male'][Number(event.detail.value)] as 'female' | 'male' | 'private')}>
          <View className="miniapp-me__picker-value">{getGenderLabel(gender)} <Text>›</Text></View>
        </Picker>
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
      {mbtiTesting && (
        <MiniappMbtiTest
          onClose={() => setMbtiTesting(false)}
          onComplete={(result) => {
            setMbti(result)
            setMbtiTesting(false)
            void socialApi.updateProfile({ mbti: result }).then(() => setNotice(`性格测试完成：${result}`)).catch(() => setNotice('性格结果保存失败'))
          }}
        />
      )}
      {contactOpen && (
        <MiniappModal onClose={() => setContactOpen(false)}>
          <Text className="miniapp-contact__title">联系我们</Text>
          <Text className="miniapp-contact__intro">遇到问题、想提建议，或者只是想聊聊，都可以通过邮箱找到我们。</Text>
          <View className="miniapp-contact__email-row">
            <Text className="miniapp-contact__email">{CONTACT_EMAIL}</Text>
            <Button className="miniapp-contact__copy" onClick={copyContactEmail}>复制</Button>
          </View>
        </MiniappModal>
      )}
      {aboutOpen && (
        <MiniappModal onClose={() => setAboutOpen(false)}>
          <Text className="miniapp-about__title">关于小多利</Text>
          <View className="miniapp-about__card">
            <Text className="miniapp-about__name">小多利 · 男 · kk 家的小狗</Text>
            <Text className="miniapp-about__line">性格：粘人，老实巴交</Text>
            <Text className="miniapp-about__line">爱好：出去玩，吃东西</Text>
            <Text className="miniapp-about__line">工作经验：等妈妈回家。全年无休，从不迟到，表现优异，多次获得“第一个冲到门口”奖。</Text>
          </View>
          <Text className="miniapp-about__version">小多利 v2.0</Text>
        </MiniappModal>
      )}
      {notice && <Text className="miniapp-me__notice">{notice}</Text>}
    </View>
  )
}
