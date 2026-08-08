import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Conversation } from '../domain/types'
import { friendshipApi } from '../services/friendshipApi'
import { AvatarView } from './AvatarView'

interface ConversationListProps {
  conversations: Conversation[]
  unread: Record<string, number>
  onOpen(roomId: string): void
  onOpenFeed(): void
  onOpenNotifications(): void
}

function timeLabel(raw: string): string {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  }
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(date)
}

export function ConversationList({ conversations, unread, onOpen, onOpenFeed, onOpenNotifications }: ConversationListProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [addStatus, setAddStatus] = useState('')

  async function submitAdd() {
    const value = identifier.trim()
    if (!value) return
    setAddStatus('sending')
    try {
      await friendshipApi.sendRequest(value)
      setAddStatus('done')
      setIdentifier('')
    } catch (error) {
      setAddStatus(error instanceof Error ? error.message : 'failed')
    }
  }

  return (
    <section className="conversation-panel">
      <header className="conversation-panel__header">
        <h2>消息</h2>
      </header>

      <div className="entry-row">
        <button className="entry-card" onClick={onOpenFeed}>
          <span className="entry-card__icon entry-card__icon--feed">📷</span>
          <span>小多利圈</span>
        </button>
        <button className="entry-card" onClick={onOpenNotifications}>
          <span className="entry-card__icon entry-card__icon--notice">🔔</span>
          <span>系统通知</span>
        </button>
        <button className="entry-card" onClick={() => { setAddOpen(true); setAddStatus('') }}>
          <span className="entry-card__icon entry-card__icon--add">➕</span>
          <span>新朋友</span>
        </button>
      </div>

      <ul className="conversation-list">
        {conversations.map((conversation) => {
          const count = unread[conversation.roomId] ?? 0
          return (
            <li key={conversation.roomId}>
              <button className="conversation-item" onClick={() => onOpen(conversation.roomId)}>
                <span className="conversation-item__avatar">
                  {conversation.type === 'pet_dm'
                    ? (conversation.avatarUrl
                        ? <img className="img-multiply" src={conversation.avatarUrl} alt="" />
                        : <span className="conversation-item__letter">{conversation.title.slice(0, 1)}</span>)
                    : conversation.friend
                      ? <AvatarView user={conversation.friend} size={48} style={{ width: '100%', height: '100%' }} />
                      : <span className="conversation-item__letter">{conversation.title.slice(0, 1)}</span>}
                  {count > 0 && <em className="conversation-item__badge">{count > 99 ? '99+' : count}</em>}
                </span>
                <span className="conversation-item__body">
                  <span className="conversation-item__top">
                    <strong>{conversation.title}</strong>
                    {conversation.latestMessage && <time>{timeLabel(conversation.latestMessage.createdAt)}</time>}
                  </span>
                  <span className="conversation-item__preview">
                    {conversation.latestMessage
                      ? conversation.latestMessage.kind === 'image' ? '[图片]' : conversation.latestMessage.text
                      : conversation.type === 'pet_dm' ? '汪！我在呢，来找我聊天嘛～' : '成为好友啦，一起照顾小多利吧'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
        {conversations.length === 0 && <li className="conversation-list__empty">正在打开你的会话…</li>}
      </ul>

      {addOpen && createPortal(
        <div className="sheet-overlay" onClick={() => setAddOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <h3>添加新朋友</h3>
            <p className="sheet__hint">输入对方的公开 ID、用户名或邮箱，每对好友会共同拥有一只小多利。</p>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="公开 ID / 用户名 / 邮箱"
              onKeyDown={(event) => { if (event.key === 'Enter') void submitAdd() }}
            />
            {addStatus === 'done' && <p className="sheet__success">请求已发出，等对方接受吧～</p>}
            {addStatus !== '' && addStatus !== 'done' && addStatus !== 'sending' && (
              <p className="sheet__error">添加失败：{addStatus}</p>
            )}
            <div className="sheet__actions">
              <button className="sheet__cancel" onClick={() => setAddOpen(false)}>取消</button>
              <button className="sheet__confirm" disabled={addStatus === 'sending'} onClick={() => void submitAdd()}>
                {addStatus === 'sending' ? '发送中…' : '发送请求'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
