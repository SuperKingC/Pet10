import { createSign, createPrivateKey } from 'node:crypto'
import type { RepositoryBundle, PushSubscriptionRecord } from '../repositories/contracts.js'

/**
 * 零依赖 Web Push（VAPID）：
 * - 只发“空载荷”推送（浏览器唤醒 Service Worker 后展示通用通知），无需内容加密。
 * - 私钥为 P-256 原始 32 字节标量的 base64url，公钥为未压缩点（04 开头）的 base64url。
 */

export interface PushConfig {
  enabled: boolean
  publicKey?: string
  privateKey?: string
  subject: string
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function buildPrivateKeyPem(rawScalarBase64Url: string) {
  const scalar = base64UrlDecode(rawScalarBase64Url)
  // PKCS8（SEC1 嵌套）DER：前缀 + 32 字节私钥标量 + P-256 曲线 OID 后缀
  const prefix = Buffer.from('30410201010420', 'hex')
  const suffix = Buffer.from('a00a06082a8648ce3d030107', 'hex')
  return createPrivateKey({ key: Buffer.concat([prefix, scalar, suffix]), format: 'der', type: 'pkcs8' })
}

function buildVapidJwt(privateKeyBase64Url: string, publicKeyBase64Url: string, subject: string, audience: string): string {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject }
  const unsigned = `${base64UrlEncode(Buffer.from(JSON.stringify(header)))}.${base64UrlEncode(Buffer.from(JSON.stringify(payload)))}`
  const signature = createSign('SHA256')
    .update(unsigned)
    .sign({ key: buildPrivateKeyPem(privateKeyBase64Url), dsaEncoding: 'ieee-p1363' })
  return `${unsigned}.${base64UrlEncode(signature)}`
}

export function createPushService(config: PushConfig, repositories: RepositoryBundle) {
  async function deliver(record: PushSubscriptionRecord): Promise<boolean> {
    try {
      const url = new URL(record.endpoint)
      const jwt = buildVapidJwt(config.privateKey!, config.publicKey!, config.subject, `${url.protocol}//${url.host}`)
      const response = await fetch(record.endpoint, {
        method: 'POST',
        headers: {
          TTL: '60',
          Authorization: `WebPush ${jwt}`,
          'Crypto-Key': `p256ecdsa=${record.p256dh}`
        }
      })
      if (response.status === 404 || response.status === 410) {
        await repositories.pushSubscriptions.deleteByEndpoint(record.userId, record.endpoint)
        return false
      }
      return response.ok
    } catch {
      return false
    }
  }

  return {
    enabled: config.enabled,
    publicKey: config.publicKey ?? '',

    async subscribe(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
      if (!subscription.endpoint) throw new Error('invalid_subscription')
      await repositories.pushSubscriptions.save(userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth)
    },

    async unsubscribe(userId: string, endpoint: string) {
      await repositories.pushSubscriptions.deleteByEndpoint(userId, endpoint)
    },

    /** 给用户全部设备发一条唤醒推送（fire-and-forget） */
    async notifyUser(userId: string) {
      if (!config.enabled) return
      const records = await repositories.pushSubscriptions.listForUser(userId)
      await Promise.allSettled(records.map((record) => deliver(record)))
    }
  }
}

export type PushService = ReturnType<typeof createPushService>
