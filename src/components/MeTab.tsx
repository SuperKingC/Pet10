import { useRef, useState } from 'react'
import { zodiacFromBirthday, type UserProfile } from '../domain/types'
import { sessionApi } from '../services/sessionApi'
import { socialApi } from '../services/socialApi'
import { uploadImageToOss } from '../services/uploadApi'
import { runtimeConfig } from '../services/runtimeConfig'
import { disableWebPush, enableWebPush } from '../services/pushClient'

interface MeTabProps {
  user: UserProfile
  uploadRoomId?: string
  onProfileUpdated(user: UserProfile): void
  onOpenMbti(): void
  onLogout(): void
}

async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = 160
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas_unavailable')
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const width = bitmap.width * scale
  const height = bitmap.height * scale
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function MeTab({ user, uploadRoomId, onProfileUpdated, onOpenMbti, onLogout }: MeTabProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(user.displayName)
  const [birthdayDraft, setBirthdayDraft] = useState(user.birthday?.slice(0, 10) ?? '')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(() => window.localStorage.getItem('pet10_notify_enabled') !== 'off')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const zodiac = zodiacFromBirthday(user.birthday)

  async function saveUsername() {
    const value = nameDraft.trim()
    if (!value || busy) return
    setBusy('rename')
    setNotice('')
    try {
      const updated = await sessionApi.updateUsername(value)
      onProfileUpdated({ ...user, displayName: updated.displayName, username: updated.username })
      setRenameOpen(false)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败')
    } finally {
      setBusy('')
    }
  }

  async function saveBirthday(value: string) {
    setBirthdayDraft(value)
    setBusy('birthday')
    try {
      const updated = await socialApi.updateProfile({ birthday: value || null })
      onProfileUpdated({ ...user, birthday: updated.birthday ?? null })
    } catch {
      setNotice('生日保存失败')
    } finally {
      setBusy('')
    }
  }

  async function handleAvatarFile(file?: File) {
    if (!file || busy) return
    setBusy('avatar')
    setNotice('')
    try {
      let avatarUrl: string
      if (!runtimeConfig.useMockApi && uploadRoomId) {
        avatarUrl = await uploadImageToOss(uploadRoomId, file)
      } else {
        avatarUrl = await fileToAvatarDataUrl(file)
      }
      const updated = await socialApi.updateProfile({ avatarUrl })
      onProfileUpdated({ ...user, avatarUrl: updated.avatarUrl })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '头像上传失败')
    } finally {
      setBusy('')
    }
  }

  function toggleNotify() {
    const next = !notifyEnabled
    setNotifyEnabled(next)
    window.localStorage.setItem('pet10_notify_enabled', next ? 'on' : 'off')
    if (next) {
      void enableWebPush().then((result) => {
        if (result === 'enabled') setNotice('后台推送已开启，小多利可以在锁屏上叫你了')
        else if (result === 'denied') setNotice('浏览器拒绝了通知权限，请到浏览器设置里开启')
        else if (result === 'unsupported') setNotice('当前浏览器不支持后台推送（前台通知仍然有效）')
      })
    } else {
      void disableWebPush()
    }
  }

  return (
    <section className="me-tab">
      <header className="me-tab__header"><h2>我的</h2></header>

      <section className="me-profile-card">
        <button className="me-profile-card__avatar" onClick={() => avatarInputRef.current?.click()} aria-label="更换头像">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.displayName} />
            : <span>{user.displayName.slice(0, 1)}</span>}
          <em>换头像</em>
        </button>
        <input
          ref={avatarInputRef}
          className="visually-hidden"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            void handleAvatarFile(file)
          }}
        />
        <div className="me-profile-card__info">
          <h3>
            {user.displayName}
            <button className="me-profile-card__edit" onClick={() => { setNameDraft(user.displayName); setRenameOpen(true) }}>✏️</button>
          </h3>
          <p className="me-profile-card__id">
            ID：{user.username}
            <button onClick={() => void navigator.clipboard?.writeText(user.username)}>复制</button>
          </p>
          <div className="me-profile-card__badges">
            {zodiac && <span>{zodiac.icon} {zodiac.name}</span>}
            {user.mbti && <span className="me-profile-card__mbti">{user.mbti}</span>}
            <button className="me-profile-card__mbti-test" onClick={onOpenMbti}>
              {user.mbti ? '重测 MBTI' : 'MBTI 测试'}
            </button>
          </div>
        </div>
      </section>

      {notice && <p className="me-tab__notice">{notice}</p>}

      <section className="me-list">
        <label className="me-list__item">
          <span>🎂 生日（用于星座运势）</span>
          <input
            type="date"
            value={birthdayDraft}
            disabled={busy === 'birthday'}
            onChange={(event) => void saveBirthday(event.target.value)}
          />
        </label>
        <label className="me-list__item">
          <span>🔔 消息通知</span>
          <button
            className={`me-switch ${notifyEnabled ? 'me-switch--on' : ''}`}
            onClick={toggleNotify}
            aria-pressed={notifyEnabled}
            aria-label="消息通知开关"
          />
        </label>
        <a className="me-list__item" href="mailto:pet10-support@example.com">
          <span>💌 联系我们</span>
          <em>›</em>
        </a>
        <button className="me-list__item" onClick={() => setNotice('小多利 v2.0：两位好友共养的 AI 小狗，水彩手账风社交小窝。')}>
          <span>🐾 关于小多利</span>
          <em>›</em>
        </button>
        <button className="me-list__item me-list__item--danger" onClick={onLogout}>
          <span>🚪 退出登录</span>
        </button>
      </section>

      {renameOpen && (
        <div className="sheet-overlay" onClick={() => setRenameOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <h3>修改昵称</h3>
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              placeholder="3-24 位字母/数字/下划线"
              onKeyDown={(event) => { if (event.key === 'Enter') void saveUsername() }}
            />
            {notice && <p className="sheet__error">{notice}</p>}
            <div className="sheet__actions">
              <button className="sheet__cancel" onClick={() => setRenameOpen(false)}>取消</button>
              <button className="sheet__confirm" disabled={busy === 'rename'} onClick={() => void saveUsername()}>
                {busy === 'rename' ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
