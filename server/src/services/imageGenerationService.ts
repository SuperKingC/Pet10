import { createImageRateLimiter, type ImageRateLimiter } from './imageRateLimiter.js'
import { isImageModel, resolveEnabledImageModels, type ImageModelDef } from './imageModels.js'

export class ImageGenerationError extends Error {
  constructor(
    message: string,
    readonly upstreamCode?: number,
    readonly requestId?: string
  ) {
    super(message)
    this.name = 'ImageGenerationError'
  }
}

const DEFAULT_IMAGE_MODEL = 'openai/gpt-5.4-image-2'
const SIZES = new Set(['1024x1024', '1024x1536', '1536x1024'])
const ASPECT_RATIOS: Record<string, string> = { '1024x1024': '1:1', '1024x1536': '2:3', '1536x1024': '3:2' }
const VIDEO_SIZES = new Set(['720x1280', '1280x720', '1024x1024'])
const VIDEO_SECONDS = new Set([4, 8, 12])
const VIDEO_POLL_INTERVAL_MS = 5000
const VIDEO_MAX_POLLS = 180
const REFERENCE_IMAGE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/
const MAX_REFERENCE_BYTES = 2 * 1024 * 1024

function validateReferenceImages(images: string[]) {
  if (images.length > 2) throw new Error('invalid_reference_images')
  for (const image of images) {
    const match = REFERENCE_IMAGE.exec(image)
    if (!match) throw new Error('invalid_reference_image')
    const padding = match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0
    const decodedBytes = Math.floor(match[2].length * 3 / 4) - padding
    if (decodedBytes > MAX_REFERENCE_BYTES) throw new Error('invalid_reference_image_size')
  }
}

function validatePrompt(prompt: string, maxPromptLength: number) {
  if (!prompt.trim() || prompt.length > maxPromptLength) throw new Error('invalid_prompt')
}

function normalizeImageResponse(payload: unknown) {
  const root = payload as { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> }
  const imageUrl = root.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!imageUrl) throw new Error('upstream_invalid_response')
  const dataUrl = /^data:image\/[^;]+;base64,(.+)$/s.exec(imageUrl)
  return dataUrl ? { data: [{ b64_json: dataUrl[1] }] } : { data: [{ url: imageUrl }] }
}

function upstreamDiagnostics(payload: unknown, fallbackCode?: number) {
  const root = payload as {
    error?: { code?: number | string; request_id?: string; requestId?: string; message?: string }
    request_id?: string
    requestId?: string
  }
  const error = root?.error
  if (!error) return undefined
  const parsedCode = typeof error.code === 'number' ? error.code : Number(error.code)
  const messageRequestId = typeof error.message === 'string' ? error.message.match(/\breq_[A-Za-z0-9_-]+\b/)?.[0] : undefined
  return {
    upstreamCode: Number.isFinite(parsedCode) ? parsedCode : fallbackCode,
    requestId: typeof error.request_id === 'string'
      ? error.request_id
      : typeof error.requestId === 'string'
        ? error.requestId
        : typeof root.request_id === 'string'
          ? root.request_id
          : typeof root.requestId === 'string'
            ? root.requestId
            : messageRequestId
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface ImageModelChoice {
  id: string
  kind: 'image' | 'video'
  label: string
  supportsSeconds?: boolean
}

export function createImageGenerationService(
  config: { inviteCode: string; upstreamBaseUrl: string; upstreamApiKey?: string; rateLimitPerMinute: number; dailyLimit: number; maxPromptLength: number; enabledModels?: string[] },
  fetcher: typeof fetch = fetch,
  limiter: ImageRateLimiter = createImageRateLimiter({ perMinute: config.rateLimitPerMinute, perDay: config.dailyLimit })
) {
  const enabledModels = resolveEnabledImageModels(config.enabledModels ?? [DEFAULT_IMAGE_MODEL])

  function resolveModel(modelId?: string): ImageModelDef {
    const requested = modelId ?? DEFAULT_IMAGE_MODEL
    const def = enabledModels.find((model) => model.id === requested)
    if (!def) throw new Error('invalid_model')
    return def
  }

  /** 同步接口的完整入口：鉴权→消耗限流→校验→调用上游（仅图片模型，视频一律走任务接口） */
  async function generate(input: { inviteCode: string; ip: string; prompt: string; model?: string; size?: string; n?: number; referenceImages?: string[] }) {
    if (!config.inviteCode) throw new Error('unauthorized')
    // 邀请码错误也必须消耗限流额度，否则失败尝试不占预算，邀请码可被在线爆破
    if (!limiter.allow(input.ip)) throw new Error('rate_limit')
    authorize(input.inviteCode)
    validatePrompt(input.prompt, config.maxPromptLength)
    const model = resolveModel(input.model)
    if (!isImageModel(model)) throw new Error('invalid_model')
    if (input.size && !SIZES.has(input.size)) throw new Error('invalid_size')
    if (input.n !== undefined && (!Number.isInteger(input.n) || input.n !== 1)) throw new Error('invalid_n')
    const referenceImages = input.referenceImages ?? []
    validateReferenceImages(referenceImages)
    return generateImageData({ prompt: input.prompt, model: model.id, size: input.size, referenceImages })
  }

  /** 图片上游调用（不含鉴权/限流，任务复用） */
  async function generateImageData(input: { prompt: string; model: string; size?: string; referenceImages?: string[] }) {
    if (!config.upstreamApiKey) throw new Error('upstream_unavailable')
    const size = input.size ?? '1024x1024'
    const referenceImages = input.referenceImages ?? []
    const content = referenceImages.length === 0 ? input.prompt : [{ type: 'text', text: input.prompt }, ...referenceImages.map(url => ({ type: 'image_url', image_url: { url } }))]
    let response: Response
    try {
      response = await fetcher(`${config.upstreamBaseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.upstreamApiKey}` }, body: JSON.stringify({ model: input.model, messages: [{ role: 'user', content }], modalities: ['image'], image_config: { aspect_ratio: ASPECT_RATIOS[size], image_size: '2K' } }) })
    } catch {
      throw new ImageGenerationError('upstream_unavailable')
    }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ImageGenerationError('upstream_invalid_response', response.status)
    }
    const diagnostics = upstreamDiagnostics(payload, response.status)
    if (diagnostics) {
      throw new ImageGenerationError(response.status >= 500 || (diagnostics.upstreamCode ?? 0) >= 500 ? 'upstream_unavailable' : 'upstream_rejected', diagnostics.upstreamCode, diagnostics.requestId)
    }
    if (!response.ok) throw new ImageGenerationError(response.status >= 500 ? 'upstream_unavailable' : 'upstream_rejected', response.status)
    try {
      return normalizeImageResponse(payload)
    } catch {
      throw new ImageGenerationError('upstream_invalid_response', response.status)
    }
  }

  /** 视频上游调用（OpenAI /videos 形状：创建→轮询→取片；不含鉴权/限流，任务复用） */
  async function generateVideo(input: { prompt: string; model: string; size?: string; seconds?: number }) {
    if (!config.upstreamApiKey) throw new Error('upstream_unavailable')
    if (input.size && !VIDEO_SIZES.has(input.size)) throw new Error('invalid_size')
    if (input.seconds !== undefined && !VIDEO_SECONDS.has(input.seconds)) throw new Error('invalid_seconds')
    const auth = { 'content-type': 'application/json', authorization: `Bearer ${config.upstreamApiKey}` }
    let created: { id?: string; status?: string; url?: string } & Record<string, unknown>
    try {
      const response = await fetcher(`${config.upstreamBaseUrl}/videos`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ model: input.model, prompt: input.prompt, ...(input.seconds === undefined ? {} : { seconds: String(input.seconds) }), ...(input.size === undefined ? {} : { size: input.size }) })
      })
      created = await response.json() as typeof created
      if (created?.error) throw new ImageGenerationError('upstream_rejected', response.status)
      if (!response.ok || !created?.id) throw new ImageGenerationError('upstream_invalid_response', response.status)
    } catch (error) {
      if (error instanceof ImageGenerationError) throw error
      throw new ImageGenerationError('upstream_unavailable')
    }
    for (let poll = 0; poll < VIDEO_MAX_POLLS; poll++) {
      await sleep(VIDEO_POLL_INTERVAL_MS)
      let payload: { id?: string; status?: string; url?: string } & Record<string, unknown>
      try {
        const response = await fetcher(`${config.upstreamBaseUrl}/videos/${created.id}`, { headers: { authorization: `Bearer ${config.upstreamApiKey}` } })
        payload = await response.json() as typeof payload
        if (payload?.error) throw new ImageGenerationError('upstream_rejected', response.status)
      } catch (error) {
        if (error instanceof ImageGenerationError) throw error
        continue
      }
      if (payload.status === 'completed') {
        if (typeof payload.url === 'string' && payload.url.startsWith('https://')) return { data: [{ url: payload.url, mime: 'video/mp4' }] }
        return await downloadVideo(created.id!)
      }
      if (payload.status === 'failed' || payload.status === 'cancelled') throw new ImageGenerationError('upstream_rejected')
    }
    throw new ImageGenerationError('upstream_unavailable')
  }

  async function downloadVideo(id: string) {
    let bytes: ArrayBuffer
    try {
      const response = await fetcher(`${config.upstreamBaseUrl}/videos/${id}/content`, { headers: { authorization: `Bearer ${config.upstreamApiKey}` } })
      if (!response.ok) throw new ImageGenerationError('upstream_invalid_response', response.status)
      bytes = await response.arrayBuffer()
    } catch (error) {
      if (error instanceof ImageGenerationError) throw error
      throw new ImageGenerationError('upstream_unavailable')
    }
    return { data: [{ b64_json: Buffer.from(bytes).toString('base64'), mime: 'video/mp4' }] }
  }

  function authorize(inviteCode: string) {
    if (!config.inviteCode || inviteCode !== config.inviteCode) throw new Error('unauthorized')
  }

  return {
    /** 是否配置了邀请码（任务提交在耗额度前需先判断，未配置时直接拒绝） */
    hasInviteConfig: () => Boolean(config.inviteCode),
    /** 同步生图（旧接口语义：阻塞直到出图） */
    generate,
    /** 轮询任务详情时的鉴权（不消耗限流额度） */
    authorize,
    resolveModel,
    listModels(): ImageModelChoice[] {
      return enabledModels.map(({ id, kind, label, supportsSeconds }) => ({ id, kind, label, supportsSeconds }))
    },
    /** 任务运行器用：无鉴权/限流的图片上游调用 */
    generateImageData,
    /** 任务运行器用：视频上游调用 */
    generateVideo
  }
}

export type ImageGenerationCore = ReturnType<typeof createImageGenerationService>
