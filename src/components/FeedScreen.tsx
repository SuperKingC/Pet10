import { useCallback, useEffect, useState } from 'react'
import type { Conversation, Post, UserProfile } from '../domain/types'
import { socialApi } from '../services/socialApi'
import { AvatarView } from './AvatarView'

interface FeedScreenProps {
  pairRoom?: Conversation
  myUserId: string
  myName: string
  myProfile?: UserProfile
  friendName: string
  onClose(): void
}

function timeAgo(raw: string): string {
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

export function FeedScreen({ pairRoom, myUserId, myName, myProfile, friendName, onClose }: FeedScreenProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const roomId = pairRoom?.roomId

  const refresh = useCallback(async () => {
    if (!roomId) return
    try {
      setPosts(await socialApi.listPosts(roomId))
    } catch { /* 静默 */ }
  }, [roomId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function publish() {
    const text = draft.trim()
    if (!text || !roomId || busy) return
    setBusy(true)
    try {
      await socialApi.createPost(roomId, { text })
      setDraft('')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function toggleLike(post: Post) {
    if (!post.likes) return
    const stats = await socialApi.likePost(post.id, !post.likes.likedByMe)
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likes: stats } : item))
  }

  function authorName(post: Post): string {
    if (post.authorType === 'pet') return '小多利'
    return post.authorId === myUserId ? myName : friendName || '好友'
  }

  return (
    <div className="feed-screen">
      <header className="feed-screen__header">
        <button onClick={onClose} aria-label="关闭">‹</button>
        <h3>小多利圈</h3>
        <span />
      </header>

      <div className="feed-screen__composer">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="发一条动态，小多利也在偷偷看…"
          onKeyDown={(event) => { if (event.key === 'Enter') void publish() }}
        />
        <button disabled={busy || !draft.trim()} onClick={() => void publish()}>发布</button>
      </div>

      <ul className="feed-screen__list">
        {posts.map((post) => (
          <li key={post.id} className={`feed-item ${post.authorType === 'pet' ? 'feed-item--pet' : ''}`}>
            <span className={`feed-item__avatar${post.authorType === 'pet' ? ' feed-item__avatar--pet' : ''}`}>
              {post.authorType === 'pet'
                ? <img className="pet-avatar-image" src="/pet/xiaoduoli.png" alt="" />
                : (() => {
                    const author = post.authorId === myUserId ? myProfile : pairRoom?.friend
                    return author
                      ? <AvatarView user={author} size={38} style={{ width: '100%', height: '100%' }} />
                      : <span>{authorName(post).slice(0, 1)}</span>
                  })()}
            </span>
            <div className="feed-item__body">
              <span className="feed-item__meta">
                <strong>{authorName(post)}</strong>
                <time>{timeAgo(post.createdAt)}</time>
              </span>
              <p>{post.text}</p>
              {post.imageUrl && <img src={post.imageUrl} alt="动态图片" />}
              <button
                className={`feed-item__like ${post.likes?.likedByMe ? 'feed-item__like--active' : ''}`}
                onClick={() => void toggleLike(post)}
              >
                {post.likes?.likedByMe ? '❤️' : '🤍'} {post.likes?.count ?? 0}
              </button>
            </div>
          </li>
        ))}
        {posts.length === 0 && <li className="feed-screen__empty">还没有动态，来抢第一条～小多利也会自己发动态哦。</li>}
      </ul>
    </div>
  )
}
