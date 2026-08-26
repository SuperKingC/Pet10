import React from 'react'
import { authApi } from './services/authApi'
import { registerSessionRecovery } from './services/sessionRecovery'
import './app.scss'

// 令牌失效时静默重登，微信登录不需要用户授权手势，用户无感。
registerSessionRecovery(() => authApi.loginWithWechat().then(() => undefined))

function App({ children }: { children?: React.ReactNode }) {
  return children
}

export default App
