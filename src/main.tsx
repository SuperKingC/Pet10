import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatScreen } from './components/ChatScreen'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatScreen />
  </StrictMode>
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
