import { useCallback, useEffect, useState } from 'react'
import type { AppNotification } from '../domain/types'
import { socialApi } from '../services/socialApi'

interface NotificationCenterProps {
  onClose(): void
  onUnreadChange(unread: number): void
}

const TYPE_LABEL: Record<string, string> = {
  friend_request: '好友邀请',
  friend_accepted: '成为好友',
  post_liked: '动态被点赞',
  pet_post: '小多利发动态',
  codeword: '每日暗号',
  game_invite: '游戏邀请',
  system: '系统通知'
}

const TYPE_ICON: Record<string, string> = {
  friend_request: '🤝',
  friend_accepted: '🎉',
  post_liked: '❤️',
  pet_post: '🐶',
  codeword: '🔑',
  game_invite: '🎮',
  system: '📢'
}

function timeLabel(raw: string): string {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(date)
}

function notificationText(item: AppNotification): string {
  const payload = item.payload ?? {}
  if (typeof payload.text === 'string' && payload.text) return payload.text
  if (typeof payload.message === 'string' && payload.message) return payload.message
  switch (item.type) {
    case 'friend_request': return `${String(payload.name ?? '有人')}邀请你一起养小多利`
    case 'friend_accepted': return `你和${String(payload.name ?? '好友')}成为好友，小窝已开启`
    case 'post_liked': return '有人给你的动态点了赞'
    case 'pet_post': return '小多利发了一条新动态'
    case 'codeword': return 'TA 也答完暗号啦，快去看彼此的答案'
    default: return '有一条新通知'
  }
}

export function NotificationCenter({ onClose, onUnreadChange }: NotificationCenterProps) {
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await socialApi.listNotifications()
      setItems(result.items)
      onUnreadChange(result.unread)
      if (result.unread > 0) {
        const marked = await socialApi.markAllNotificationsRead()
        onUnreadChange(marked.unread)
        setItems((current) => current.map((item) => ({ ...item, read: true })))
      }
    } catch { /* 静默 */ } finally {
      setLoading(false)
    }
  }, [onUnreadChange])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="notification-screen">
      <header className="notification-screen__header">
        <button onClick={onClose} aria-label="关闭">‹</button>
        <h3>系统通知</h3>
        <span />
      </header>
      <ul className="notification-screen__list">
        {loading && <li className="notification-screen__empty">正在加载通知…</li>}
        {!loading && items.length === 0 && <li className="notification-screen__empty">暂时没有通知，小多利会在这里叫你～</li>}
        {items.map((item) => (
          <li key={item.id} className={`notification-item ${item.read ? '' : 'notification-item--unread'}`}>
            <span className="notification-item__icon">{TYPE_ICON[item.type] ?? '🔔'}</span>
            <div className="notification-item__body">
              <strong>{TYPE_LABEL[item.type] ?? '通知'}</strong>
              <p>{notificationText(item)}</p>
              <time>{timeLabel(item.createdAt)}</time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
