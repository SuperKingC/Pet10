import { useState } from 'react'
import { createPortal } from 'react-dom'
import { zodiacFromBirthday, type UserProfile } from '../domain/types'
import { socialApi } from '../services/socialApi'
import { disableWebPush, enableWebPush } from '../services/pushClient'
import { AvatarView } from './AvatarView'

const CONTACT_EMAIL = 'pet10-support@example.com'

interface MeTabProps {
  user: UserProfile
  onProfileUpdated(user: UserProfile): void
  onOpenAvatar(): void
  onOpenMbti(): void
  onLogout(): void
}

export function MeTab({ user, onProfileUpdated, onOpenAvatar, onOpenMbti, onLogout }: MeTabProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactCopied, setContactCopied] = useState(false)
  const [nameDraft, setNameDraft] = useState(user.displayName)
  const [birthdayDraft, setBirthdayDraft] = useState(user.birthday?.slice(0, 10) ?? '')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(() => window.localStorage.getItem('pet10_notify_enabled') !== 'off')
  const zodiac = zodiacFromBirthday(user.birthday)
  const publicCode = user.publicCode ?? user.username

  async function saveDisplayName() {
    const value = nameDraft.trim()
    if (!value || busy) return
    setBusy('rename')
    setNotice('')
    try {
      const updated = await socialApi.updateProfile({ displayName: value })
      onProfileUpdated({ ...user, displayName: updated.displayName })
      setRenameOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      setNotice(message === 'invalid_display_name' ? '昵称需 2-12 个字符' : message)
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

  function openContact() {
    setContactCopied(false)
    setContactOpen(true)
  }

  function copyContactEmail() {
    void navigator.clipboard?.writeText(CONTACT_EMAIL).then(() => setContactCopied(true)).catch(() => setContactCopied(false))
  }

  return (
    <section className="me-tab">
      <header className="me-tab__header"><h2>我的</h2></header>

      <section className="me-profile-card">
        <button className="me-profile-card__avatar" onClick={onOpenAvatar} aria-label="捏脸/换头像">
          <AvatarView user={user} size={72} />
          <em>换形象</em>
        </button>
        <div className="me-profile-card__info">
          <h3>
            {user.displayName}
            <button className="me-profile-card__edit" onClick={() => { setNameDraft(user.displayName); setRenameOpen(true) }}>✏️</button>
          </h3>
          <p className="me-profile-card__id">
            ID：{publicCode}
            <button onClick={() => void navigator.clipboard?.writeText(publicCode)}>复制</button>
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
          <span><img className="me-list__icon" src="/me/birthday.png" alt="" />生日</span>
          <input
            type="date"
            value={birthdayDraft}
            disabled={busy === 'birthday'}
            onChange={(event) => void saveBirthday(event.target.value)}
          />
        </label>
        <label className="me-list__item">
          <span><img className="me-list__icon" src="/me/notification.png" alt="" />消息通知</span>
          <button
            className={`me-switch ${notifyEnabled ? 'me-switch--on' : ''}`}
            onClick={toggleNotify}
            aria-pressed={notifyEnabled}
            aria-label="消息通知开关"
          />
        </label>
        <button className="me-list__item" onClick={openContact}>
          <span><img className="me-list__icon" src="/me/contact.png" alt="" />联系我们</span>
          <em>›</em>
        </button>
        <button className="me-list__item" onClick={() => setNotice('小多利 v2.0：两位好友共养的 AI 小狗，水彩手账风社交小窝。')}>
          <span><img className="me-list__icon" src="/me/about.png" alt="" />关于小多利</span>
          <em>›</em>
        </button>
        <button className="me-list__item me-list__item--danger" onClick={onLogout}>
          <span><img className="me-list__icon" src="/me/logout.png" alt="" />退出登录</span>
        </button>
      </section>

      {renameOpen && createPortal(
        <div className="sheet-overlay" onClick={() => setRenameOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <h3>修改昵称</h3>
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              placeholder="2-12 个任意字符"
              onKeyDown={(event) => { if (event.key === 'Enter') void saveDisplayName() }}
            />
            {notice && <p className="sheet__error">{notice}</p>}
            <div className="sheet__actions">
              <button className="sheet__cancel" onClick={() => setRenameOpen(false)}>取消</button>
              <button className="sheet__confirm" disabled={busy === 'rename'} onClick={() => void saveDisplayName()}>
                {busy === 'rename' ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {contactOpen && createPortal(
        <div className="modal-overlay" onClick={() => setContactOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>联系我们</h3>
            <p>遇到问题、想提建议，或者只是想聊聊，都可以通过邮箱找到我们。</p>
            <div className="modal__email-row">
              <span className="modal__email">{CONTACT_EMAIL}</span>
              <button className="modal__copy" onClick={copyContactEmail}>复制</button>
            </div>
            {contactCopied && <p className="modal__notice">邮箱已复制，去邮箱里找我们吧～</p>}
            <div className="modal__actions">
              <button className="modal__cancel" onClick={() => setContactOpen(false)}>关闭</button>
              <a className="modal__confirm" href={`mailto:${CONTACT_EMAIL}`}>去发邮件</a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
