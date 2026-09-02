import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { Button, Input, Image, Picker, Text, View } from '@tarojs/components'
import type { LaunchContext } from '../../services/launchContextApi'
import { socialApi, type MiniappNotification } from '../../services/socialApi'
import { accountApi } from '../../services/accountApi'
import { clearAccessToken } from '../../services/apiClient'
import { gmApi } from '../../services/gmApi'
import { readGmTestMode, writeGmTestMode } from '../../services/gmTestStorage'
import { showInfo } from '../../services/feedback'
import { defaultAvatarConfig, parseAvatarConfig, type MiniappAvatarConfig } from '../../domain/avatarConfig'
import { MiniappAvatarEditor } from './MiniappAvatarEditor'
import { MiniappAvatarPreview } from './MiniappAvatarPreview'
import { MiniappModal } from '../../components/MiniappModal'
import { MiniappMbtiTest } from './MiniappMbtiTest'
import { getProfilePresentation } from './miniappViewModel'
import { XIAODUOLI_PROFILE_HEADLINE, XIAODUOLI_PROFILE_LINES } from './xiaoduoliProfile'
import './MiniappMeView.scss'

const birthdayIcon = require('../../assets/me/birthday.png')
const mbtiIcon = require('../../assets/me/mbti.png')
const notificationIcon = require('../../assets/me/notification.png')
const contactIcon = require('../../assets/me/contact.png')
const aboutIcon = require('../../assets/me/about.png')
const logoutIcon = require('../../assets/me/logout.png')

const CONTACT_EMAIL = 'pet10-support@example.com'
interface MiniappMeViewProps {
  context: LaunchContext | null
  onLogout(): void
  onDataChanged?(): void
  /** GM 模拟解锁小多利：切到小窝 tab 播放盒子跳出动画（不写真实解锁态） */
  onSimulateUnlock?(): void
}

export function MiniappMeView({ context, onLogout, onDataChanged, onSimulateUnlock }: MiniappMeViewProps) {
  const profilePresentation = getProfilePresentation(context?.user || null)
  const displayName = profilePresentation.displayName
  const uid = context?.user.uid || ''
  const [nameDraft, setNameDraft] = useState(displayName)
  const [birthday, setBirthday] = useState('')
  const [mbti, setMbti] = useState('')
  const [avatarConfig, setAvatarConfig] = useState<MiniappAvatarConfig>(defaultAvatarConfig)
  const [avatarUrl, setAvatarUrl] = useState(profilePresentation.avatarUrl)
  const [avatarEditing, setAvatarEditing] = useState(false)
  const [notifications, setNotifications] = useState<MiniappNotification[]>([])
  const [notificationUnread, setNotificationUnread] = useState(0)
  const [nameEditing, setNameEditing] = useState(false)
  const [mbtiTesting, setMbtiTesting] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [gmOpen, setGmOpen] = useState(false)
  const [gmCount, setGmCount] = useState(1)
  const [gmBusy, setGmBusy] = useState(false)
  // GM 本地测试模式开关：纯本地存储，不依赖服务端（services/gmTestStorage）
  const [gmTestMode, setGmTestMode] = useState(() => readGmTestMode())
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateBusy, setDeactivateBusy] = useState(false)
  const [busy, setBusy] = useState(false)

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
      void showInfo('通知暂时无法加载')
    }
  }

  const saveName = async () => {
    const trimmed = nameDraft.trim()
    if (trimmed.length < 2 || busy) return
    setBusy(true)
    try {
      await socialApi.updateProfile({ displayName: trimmed })
      setNameEditing(false)
    } catch {
      void showInfo('昵称保存失败')
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
    } catch {
      void showInfo('生日保存失败')
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
    } catch {
      void showInfo('头像保存失败')
    } finally {
      setBusy(false)
    }
  }

  const showUidToast = () => {
    const ordinal = uid ? String(Number(uid)) : ''
    void showInfo(ordinal ? `你是第 ${ordinal} 位小多利用户~` : 'UID 暂不可用，请稍后再试', 1600)
  }

  const copyContactEmail = () => {
    Taro.setClipboardData({ data: CONTACT_EMAIL })
      .then(() => void showInfo('邮箱已复制'))
      .catch(() => void showInfo('复制失败，请手动记录邮箱'))
  }

  const addGmFriends = async () => {
    if (gmBusy) return
    setGmBusy(true)
    try {
      const result = await gmApi.addFriends(gmCount)
      setGmOpen(false)
      Taro.showToast({ title: `已添加 ${result.added.length} 个好友`, icon: 'success' })
      onDataChanged?.()
    } catch {
      Taro.showToast({ title: '添加失败', icon: 'none' })
    } finally {
      setGmBusy(false)
    }
  }

  const removeGmFriends = async () => {
    if (gmBusy) return
    setGmBusy(true)
    try {
      const result = await gmApi.removeFriends()
      setGmOpen(false)
      Taro.showToast({
        title: result.removed.length > 0 ? `已删除 ${result.removed.length} 个测试好友` : '没有可删除的测试好友',
        icon: 'none'
      })
      onDataChanged?.()
    } catch {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    } finally {
      setGmBusy(false)
    }
  }

  // 小窝 GM：不关弹窗，方便连续加道具/切解锁开关
  const addGmNestItems = async () => {
    if (gmBusy) return
    setGmBusy(true)
    try {
      await gmApi.addNestItems()
      Taro.showToast({ title: '牛奶/皮球/香皂/骨头 各+9', icon: 'success' })
    } catch {
      Taro.showToast({ title: '添加失败', icon: 'none' })
    } finally {
      setGmBusy(false)
    }
  }

  const setGmWardrobeUnlock = async (enabled: boolean) => {
    if (gmBusy) return
    setGmBusy(true)
    try {
      await gmApi.setWardrobeUnlockAll(enabled)
      Taro.showToast({ title: enabled ? '已解锁全部衣服' : '已恢复条件解锁', icon: 'success' })
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      setGmBusy(false)
    }
  }

  // 本地测试模式开关：纯本地生效（onDataChanged 让首页立即重读开关），不走服务端
  const toggleGmTestMode = () => {
    const next = !gmTestMode
    writeGmTestMode(next)
    setGmTestMode(next)
    Taro.showToast({
      title: next ? '已开启：照顾与换装走本地模拟' : '已关闭：恢复服务端真实数据',
      icon: 'none',
      duration: 1800
    })
    onDataChanged?.()
  }

  // GM 模拟解锁：关掉 GM 弹窗，由首页切到小窝播放盒子跳出动画
  const simulateUnlock = () => {
    if (gmBusy) return
    setGmOpen(false)
    Taro.showToast({ title: '已切换到小窝播放解锁动画', icon: 'none', duration: 1200 })
    onSimulateUnlock?.()
  }

  const confirmDeactivate = async () => {
    if (deactivateBusy) return
    setDeactivateBusy(true)
    try {
      await accountApi.deactivate()
      clearAccessToken()
      setDeactivateOpen(false)
      onLogout()
    } catch {
      void showInfo('注销失败，请稍后再试')
    } finally {
      setDeactivateBusy(false)
    }
  }

  return (
    <View className="miniapp-me">
      <View className="miniapp-page-header miniapp-me__header">
        <Text className="miniapp-page-title miniapp-me__title">我的</Text>
      </View>
      <View className="miniapp-me__profile">
        <View className="miniapp-me__avatar" onClick={() => setAvatarEditing(true)}>
          {avatarUrl ? <Image className="miniapp-me__avatar-image" src={avatarUrl} mode="aspectFill" /> : <MiniappAvatarPreview config={avatarConfig} compact />}
        </View>
        <View className="miniapp-me__profile-info">
          <View className="miniapp-me__name-row" onClick={() => setNameEditing(true)}>
            <Text className="miniapp-me__name">{nameDraft || displayName}</Text>
            <Text className="miniapp-me__name-hint">修改 <Text className="miniapp-me__arrow">›</Text></Text>
          </View>
          {uid && (
            <View className="miniapp-me__uid-row" onClick={showUidToast} hoverClass="miniapp-me__uid-row--hover" hoverStayTime={80}>
              <Text className="miniapp-me__uid">UID: {uid}</Text>
            </View>
          )}
        </View>
      </View>
      <View className="miniapp-me__list">
        <Picker mode="date" value={birthday || '2000-01-01'} onChange={(event) => void updateBirthday(event.detail.value)}>
        <View className="miniapp-me__item"><Image src={birthdayIcon} mode="aspectFit" /><Text>生日</Text><Text className="miniapp-me__birthday-value">{birthday || '设置'}</Text></View>
        </Picker>
        <View className="miniapp-me__item" onClick={() => setMbtiTesting(true)}><Image src={mbtiIcon} mode="aspectFit" fadeIn={false} /><Text>性格类型</Text><Text className="miniapp-me__value">{mbti ? `${mbti} · 重新测试` : '开始测试'}</Text></View>
        <View className="miniapp-me__item" onClick={() => void loadNotifications()}><Image src={notificationIcon} mode="aspectFit" /><Text>消息通知</Text><Text>{notificationUnread > 0 ? `${notificationUnread} 条未读` : '查看'}</Text></View>
        <View className="miniapp-me__item" onClick={() => setContactOpen(true)}><Image src={contactIcon} mode="aspectFit" /><Text>联系我们</Text><Text className="miniapp-me__arrow">›</Text></View>
        <View className="miniapp-me__item" onClick={() => setAboutOpen(true)}><Image src={aboutIcon} mode="aspectFit" /><Text>关于小多利</Text><Text className="miniapp-me__arrow">›</Text></View>
        <Button className="miniapp-me__logout" onClick={onLogout}><Image src={logoutIcon} mode="aspectFit" /><Text>退出登录</Text></Button>
        <Button className="miniapp-me__deactivate" onClick={() => setDeactivateOpen(true)}><Text>注销账号</Text></Button>
      </View>
      {nameEditing && (
        <MiniappModal onClose={() => { if (!busy) setNameEditing(false) }}>
          <Text className="miniapp-rename__title">修改昵称</Text>
          <Input
            className="miniapp-rename__input"
            value={nameDraft}
            maxlength={12}
            focus
            placeholder="2-12 个字符"
            onInput={(event) => setNameDraft(event.detail.value)}
          />
          <Button className="miniapp-rename__save" loading={busy} disabled={busy || nameDraft.trim().length < 2} onClick={() => void saveName()}>保存</Button>
        </MiniappModal>
      )}
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
            void socialApi.updateProfile({ mbti: result }).catch(() => void showInfo('性格结果保存失败'))
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
            <Text className="miniapp-about__name">{XIAODUOLI_PROFILE_HEADLINE}</Text>
            {XIAODUOLI_PROFILE_LINES.map((line) => (
              <Text className="miniapp-about__line" key={line}>{line}</Text>
            ))}
          </View>
          <Text className="miniapp-about__version" onLongPress={() => setGmOpen(true)}>小多利 v2.0</Text>
        </MiniappModal>
      )}
      {gmOpen && (
        <MiniappModal onClose={() => { if (!gmBusy) setGmOpen(false) }}>
          <Text className="miniapp-gm__title">GM 工具</Text>
          <Text className="miniapp-gm__intro">为当前账号添加或删除测试好友，用于模拟一个或多个好友的场景。删除只作用于 GM 生成的测试好友。</Text>
          <View className="miniapp-gm__counts">
            {[1, 3, 5].map((value) => (
              <Button
                key={value}
                className={`miniapp-gm__count${gmCount === value ? ' miniapp-gm__count--active' : ''}`}
                onClick={() => setGmCount(value)}
              >
                {value} 个
              </Button>
            ))}
          </View>
          <View className="miniapp-gm__actions">
            <Button className="miniapp-gm__submit" disabled={gmBusy} onClick={() => void addGmFriends()}>
              {gmBusy ? '处理中…' : '添加好友'}
            </Button>
            <Button className="miniapp-gm__delete" disabled={gmBusy} onClick={() => void removeGmFriends()}>
              删除测试好友
            </Button>
          </View>
          <View className="miniapp-gm__divider" />
          <Text className="miniapp-gm__section">小窝调试</Text>
          <Text className="miniapp-gm__intro">给当前账号的小窝发放照顾道具；衣柜全解锁用于测试，可随时恢复。重新打开衣柜面板即见最新状态。</Text>
          <View className="miniapp-gm__actions">
            <Button className="miniapp-gm__submit" disabled={gmBusy} onClick={() => void addGmNestItems()}>
              道具各 +9
            </Button>
            <Button className="miniapp-gm__delete" disabled={gmBusy} onClick={() => void setGmWardrobeUnlock(true)}>
              解锁全部衣服
            </Button>
          </View>
          <View className="miniapp-gm__actions miniapp-gm__actions--gap">
            <Button className="miniapp-gm__delete" disabled={gmBusy} onClick={() => void setGmWardrobeUnlock(false)}>
              恢复条件解锁
            </Button>
          </View>
          <View className="miniapp-gm__divider" />
          <Text className="miniapp-gm__section">本地测试模式</Text>
          <Text className="miniapp-gm__intro">开启后照顾与换装不请求服务端：道具各 99、动作本地回状态，衣服全部可穿、保存在本机，用于自测表现；关闭即恢复真实数据。</Text>
          <View className="miniapp-gm__actions">
            <Button
              className={gmTestMode ? 'miniapp-gm__delete' : 'miniapp-gm__submit'}
              disabled={gmBusy}
              onClick={toggleGmTestMode}
            >
              {gmTestMode ? '关闭本地测试模式' : '开启本地测试模式'}
            </Button>
          </View>
          <View className="miniapp-gm__divider" />
          <Text className="miniapp-gm__section">解锁动画调试</Text>
          <Text className="miniapp-gm__intro">切到小窝播放小多利从盒子里跳出来的解锁动画（不写入真实解锁状态，可反复触发）。</Text>
          <View className="miniapp-gm__actions">
            <Button className="miniapp-gm__submit" disabled={gmBusy} onClick={simulateUnlock}>
              模拟解锁小多利
            </Button>
          </View>
        </MiniappModal>
      )}
      {deactivateOpen && (
        <MiniappModal onClose={() => { if (!deactivateBusy) setDeactivateOpen(false) }}>
          <Text className="miniapp-deactivate__title">注销账号</Text>
          <Text className="miniapp-deactivate__intro">注销后，你的账号与全部数据将被永久删除且无法恢复，包括个人资料、聊天记录，以及和好友共养的小窝（对方的小窝也会一并消失）。</Text>
          <View className="miniapp-deactivate__actions">
            <Button className="miniapp-deactivate__cancel" disabled={deactivateBusy} onClick={() => setDeactivateOpen(false)}>再想想</Button>
            <Button className="miniapp-deactivate__confirm" loading={deactivateBusy} disabled={deactivateBusy} onClick={() => void confirmDeactivate()}>
              {deactivateBusy ? '注销中…' : '确认注销'}
            </Button>
          </View>
        </MiniappModal>
      )}
    </View>
  )
}
