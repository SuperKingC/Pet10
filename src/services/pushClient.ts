import { apiRequest } from './httpClient'
import { runtimeConfig } from './runtimeConfig'

/**
 * Web Push 订阅流程：请求通知权限 → 拉取 VAPID 公钥 → 订阅 → 上报服务端。
 * 服务端发空载荷唤醒推送，由 sw.js 展示通知。
 */
export async function enableWebPush(): Promise<'enabled' | 'unsupported' | 'not_configured' | 'denied'> {
  if (runtimeConfig.useMockApi) return 'not_configured'
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const { enabled, publicKey } = await apiRequest<{ enabled: boolean; publicKey: string }>('/api/social/push/vapid-public-key')
  if (!enabled || !publicKey) return 'not_configured'

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlSafeBase64ToArrayBuffer(publicKey)
    })
  }
  const json = subscription.toJSON()
  await apiRequest('/api/social/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' }
    })
  })
  return 'enabled'
}

export async function disableWebPush(): Promise<void> {
  if (runtimeConfig.useMockApi || !('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    await apiRequest('/api/social/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: subscription.endpoint })
    })
    await subscription.unsubscribe()
  } catch { /* 静默 */ }
}

function urlSafeBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output.buffer
}
