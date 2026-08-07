import { useState } from 'react'
import { friendshipApi } from '../services/friendshipApi'
import type { ServerSession } from '../services/sessionApi'

interface FriendSetupScreenProps {
  session: ServerSession
  onChanged: () => void
}

export function FriendSetupScreen({ session, onChanged }: FriendSetupScreenProps) {
  const [identifier, setIdentifier] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const incoming = session.status === 'pending_incoming'

  async function submit() {
    setBusy(true)
    setError('')
    try {
      if (incoming && session.relationship) await friendshipApi.acceptRequest(session.relationship.id)
      else await friendshipApi.sendRequest(identifier)
      onChanged()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="onboarding-shell">
      <div className="onboarding-card friend-setup-card">
        <div className="onboarding-pet">🏠</div>
        <span className="eyebrow">欢迎，{session.user.displayName}</span>
        <p className="account-identity">你的用户名：<strong>@{session.user.username}</strong></p>
        <h1>{incoming ? '有朋友邀请你' : session.status === 'pending_outgoing' ? '等待朋友接受' : '先找到你的朋友'}</h1>
        {incoming && session.friend && <p><strong>{session.friend.displayName}</strong>（@{session.friend.username}）邀请你一起养小多利。</p>}
        {session.status === 'pending_outgoing' && session.friend && <p>已向 <strong>{session.friend.displayName}</strong>（@{session.friend.username}）发送邀请。对方接受后，你们的聊天室会自动出现。</p>}
        {session.status === 'unbound' && (
          <>
            <p>输入朋友的完整用户名或注册邮箱。对方接受后，你们会共同拥有一只小多利。</p>
            <label>
              朋友用户名或邮箱
              <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="例如：xiaoming_1234 或邮箱" />
            </label>
          </>
        )}
        {error && <div className="form-error">{error}</div>}
        <button className="primary-action" disabled={busy || (!incoming && session.status === 'unbound' && identifier.trim().length < 3)} onClick={() => void submit()}>
          {busy ? '请稍候…' : incoming ? '接受邀请，开始养小多利' : session.status === 'pending_outgoing' ? '刷新邀请状态' : '发送好友邀请'}
        </button>
      </div>
    </main>
  )
}
