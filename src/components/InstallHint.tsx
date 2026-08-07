import { useState } from 'react'

const DISMISS_KEY = 'pet10_install_hint_dismissed'

interface StandaloneNavigator extends Navigator {
  standalone?: boolean
}

function shouldShowHint(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.localStorage.getItem(DISMISS_KEY)) return false
    const standalone =
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as StandaloneNavigator).standalone === true
    if (standalone) return false
    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
    return isIos && isSafari
  } catch {
    return false
  }
}

export function InstallHint() {
  const [visible, setVisible] = useState(shouldShowHint)
  if (!visible) return null

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // localStorage 不可用时忽略，仅本次会话不再提示由 state 控制
    }
    setVisible(false)
  }

  return (
    <div className="install-hint" role="status">
      <span>💡 点底部「分享」按钮，选择「添加到主屏幕」，就能像 App 一样使用小多利。</span>
      <button aria-label="知道了" onClick={dismiss}>×</button>
    </div>
  )
}
