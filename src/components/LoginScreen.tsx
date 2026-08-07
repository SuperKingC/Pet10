import { useState } from 'react'
import { authApi } from '../services/authApi'

interface LoginScreenProps {
  onLoggedIn: () => void
}

export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('PET10-DEMO')
  const [code, setCode] = useState('')
  const [requested, setRequested] = useState(false)
  const [developmentCode, setDevelopmentCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function requestCode() {
    setBusy(true)
    setError('')
    try {
      const result = await authApi.requestCode(email, inviteCode)
      setDevelopmentCode(result.developmentCode ?? '')
      if (result.developmentCode) setCode(result.developmentCode)
      setRequested(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '发送验证码失败')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode() {
    setBusy(true)
    setError('')
    try {
      await authApi.verifyCode(email, code)
      onLoggedIn()
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : '验证码错误')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="onboarding-shell">
      <div className="onboarding-card">
        <div className="onboarding-pet">🐶</div>
        <span className="eyebrow">PET10 · PRIVATE BETA</span>
        <h1>和朋友一起养<br />小多利</h1>
        <p>一个只属于你们两个人的共享 AI 小狗。</p>
        <label>
          内部邀请码
          <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="PET10-DEMO" />
        </label>
        <label>
          邮箱
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" />
        </label>
        {requested && (
          <label>
            邮箱验证码
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="输入 6 位验证码" />
          </label>
        )}
        {developmentCode && <div className="form-hint">内部测试验证码：<strong>{developmentCode}</strong></div>}
        {error && <div className="form-error">{error}</div>}
        <button className="primary-action" disabled={busy || !email || !inviteCode} onClick={() => void (requested ? verifyCode() : requestCode())}>
          {busy ? '请稍候…' : requested ? '进入小多利的家' : '发送邮箱验证码'}
        </button>
        {requested && <button className="text-action" onClick={() => {
          setRequested(false)
          setDevelopmentCode('')
          setCode('')
        }}>更换邮箱或邀请码</button>}
      </div>
    </main>
  )
}
