import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from './components/AppShell'
import { FriendSetupScreen } from './components/FriendSetupScreen'
import { LoginScreen } from './components/LoginScreen'
import { getAccessToken } from './services/httpClient'
import { clearAppBadge } from './services/appBadge'
import { sessionApi, type ServerSession } from './services/sessionApi'
import { runtimeConfig } from './services/runtimeConfig'
import './styles.css'

function App() {
  const [session, setSession] = useState<ServerSession>()
  const [loading, setLoading] = useState(!runtimeConfig.useMockApi)
  const [error, setError] = useState('')

  async function refreshSession() {
    if (runtimeConfig.useMockApi) return
    setLoading(true)
    setError('')
    try {
      setSession(await sessionApi.getHome())
    } catch (sessionError) {
      if (getAccessToken()) window.localStorage.removeItem('pet10_access_token')
      setError(sessionError instanceof Error ? sessionError.message : '会话加载失败')
      setSession(undefined)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshSession()
  }, [])

  if (runtimeConfig.useMockApi) return <AppShell onLogout={() => undefined} />
  if (loading) return <main className="loading-screen"><div className="loading-orb"><img src="/pet/xiaoduoli-small.jpg" alt="小多利" /></div><p>正在打开小多利的家…</p></main>
  if (!getAccessToken()) return <LoginScreen onLoggedIn={() => void refreshSession()} />
  if (error && !session) return <LoginScreen onLoggedIn={() => void refreshSession()} />
  if (!session) return <LoginScreen onLoggedIn={() => void refreshSession()} />
  if (session.status !== 'accepted') return <FriendSetupScreen session={session} onChanged={() => void refreshSession()} />
  return <AppShell session={session} onLogout={() => void refreshSession()} />
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

// 原生 App 手感：禁 iOS 捏合缩放/双击缩放（内部滚动容器不受影响）
document.addEventListener('gesturestart', (event) => event.preventDefault())
document.addEventListener('gesturechange', (event) => event.preventDefault())
document.addEventListener('dblclick', (event) => event.preventDefault())

document.getElementById('app-splash')?.remove()
clearAppBadge()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
