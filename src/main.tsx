import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatScreen } from './components/ChatScreen'
import { FriendSetupScreen } from './components/FriendSetupScreen'
import { LoginScreen } from './components/LoginScreen'
import { getAccessToken } from './services/httpClient'
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

  if (runtimeConfig.useMockApi) return <ChatScreen />
  if (loading) return <main className="loading-screen"><div className="loading-orb">🐶</div><p>正在打开小多利的家…</p></main>
  if (!getAccessToken()) return <LoginScreen onLoggedIn={() => void refreshSession()} />
  if (error && !session) return <LoginScreen onLoggedIn={() => void refreshSession()} />
  if (!session) return <LoginScreen onLoggedIn={() => void refreshSession()} />
  if (session.status !== 'accepted') return <FriendSetupScreen session={session} onChanged={() => void refreshSession()} />
  return <ChatScreen session={session} onSessionChanged={() => void refreshSession()} />
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
