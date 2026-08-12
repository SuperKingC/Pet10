import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from './components/AppShell'
import { FriendSetupScreen } from './components/FriendSetupScreen'
import { LoginScreen } from './components/LoginScreen'
import { getAccessToken } from './services/httpClient'
import { clearAppBadge } from './services/appBadge'
import { preloadImage } from './services/imageResourceLoader'
import { ImageGenerationRoom } from './components/ImageGenerationRoom'
import { sessionApi, type ServerSession } from './services/sessionApi'
import { runtimeConfig } from './services/runtimeConfig'
import { TarotDevEntry } from './dev/tarot/TarotDevEntry'
import './styles.css'

const SESSION_STARTUP_TIMEOUT_MS = 8_000

if (window.location.pathname !== '/image' && (runtimeConfig.useMockApi || getAccessToken())) {
  preloadImage('/pet/xiaoduoli.png')
  preloadImage('/navigation/tab-bar-background.png')
  preloadImage('/navigation/nest.png')
  preloadImage('/navigation/journal.png')
  preloadImage('/navigation/paw.png')
  preloadImage('/navigation/messages.png')
  preloadImage('/navigation/me.png')
}

function App() {
  if (import.meta.env.DEV && window.location.pathname === '/dev/tarot') {
    return <TarotDevEntry />
  }
  if (window.location.pathname === '/image') return <ImageGenerationRoom />
  const [session, setSession] = useState<ServerSession>()
  const [loading, setLoading] = useState(!runtimeConfig.useMockApi)
  const [error, setError] = useState('')

  async function refreshSession() {
    if (runtimeConfig.useMockApi) return
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), SESSION_STARTUP_TIMEOUT_MS)
    setLoading(true)
    setError('')
    try {
      setSession(await sessionApi.getHome({ signal: controller.signal }))
    } catch (sessionError) {
      if (sessionError instanceof DOMException && sessionError.name === 'AbortError') {
        setError('服务器响应超时，请检查网络后重试')
        setSession(undefined)
        return
      }
      if (getAccessToken()) window.localStorage.removeItem('pet10_access_token')
      setError(sessionError instanceof Error ? sessionError.message : '会话加载失败')
      setSession(undefined)
    } finally {
      window.clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshSession()
  }, [])

  if (runtimeConfig.useMockApi) return <AppShell onLogout={() => undefined} />
  if (loading) return <main className="loading-screen"><div className="loading-orb"><img src="/pet/xiaoduoli-startup.png" alt="小多利" width="256" height="384" /></div><p>正在打开小多利的家…</p></main>
  if (error && getAccessToken() && !session) return <main className="loading-screen"><div className="loading-orb"><img src="/pet/xiaoduoli-startup.png" alt="小多利" width="256" height="384" /></div><p>{error}</p><button onClick={() => void refreshSession()}>重新连接</button></main>
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
