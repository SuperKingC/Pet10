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
export const VIDEO_RESOLUTIONS = new Set(['720p', '1080p'])
const VIDEO_TIMEOUT_MS = 15 * 60 * 1000
// openai 系生图模型才吃 image_config（aspect_ratio/image_size）；Gemini 系不支持该字段
const supportsImageConfig = (model: string) => /^openai\//.test(model) && /image/.test(model)
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

export { validateReferenceImages }

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
  config: { inviteCode: string; upstreamBaseUrl: string; upstreamApiKey?: string; rateLimitPerMinute: number; dailyLimit: number; maxPromptLength: number; enabledModels?: string[]; videoPollIntervalMs?: number },
  fetcher: typeof fetch = fetch,
  limiter: ImageRateLimiter = createImageRateLimiter({ perMinute: config.rateLimitPerMinute, perDay: config.dailyLimit })
) {
  const enabledModels = resolveEnabledImageModels(config.enabledModels ?? [DEFAULT_IMAGE_MODEL])
  const videoPollIntervalMs = config.videoPollIntervalMs ?? 5000

  function resolveModel(modelId?: string): ImageModelDef {
    const requested = modelId ?? enabledModels[0]?.id
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
    const upstreamBody: Record<string, unknown> = { model: input.model, messages: [{ role: 'user', content }], modalities: ['image'] }
    if (supportsImageConfig(input.model)) upstreamBody.image_config = { aspect_ratio: ASPECT_RATIOS[size], image_size: '2K' }
    let response: Response
    try {
      response = await fetcher(`${config.upstreamBaseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.upstreamApiKey}` }, body: JSON.stringify(upstreamBody) })
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

  /** 视频上游调用（中转 /videos 形状：创建→轮询→取片；首帧图可选走图生视频；不含鉴权/限流，任务复用） */
  async function generateVideo(input: { prompt: string; model: string; resolution?: string; referenceImages?: string[] }) {
    if (!config.upstreamApiKey) throw new Error('upstream_unavailable')
    if (input.resolution && !VIDEO_RESOLUTIONS.has(input.resolution)) throw new Error('invalid_resolution')
    const auth = { 'content-type': 'application/json', authorization: `Bearer ${config.upstreamApiKey}` }
    const createBody: Record<string, unknown> = { model: input.model, prompt: input.prompt, ...(input.resolution === undefined ? {} : { resolution: input.resolution }) }
    const firstFrame = (input.referenceImages ?? [])[0]
    if (firstFrame) createBody.frame_images = [{ type: 'image_url', image_url: { url: firstFrame }, frame_type: 'first_frame' }]
    let jobId: string | undefined
    try {
      const response = await fetcher(`${config.upstreamBaseUrl}/videos`, { method: 'POST', headers: auth, body: JSON.stringify(createBody) })
      const payload = await response.json() as { id?: string; jobId?: string; job_id?: string; task_id?: string; error?: unknown }
      if (payload?.error) throw new ImageGenerationError('upstream_rejected', response.status)
      jobId = payload?.id ?? payload?.jobId ?? payload?.job_id ?? payload?.task_id
      if (!response.ok || !jobId) throw new ImageGenerationError('upstream_invalid_response', response.status)
    } catch (error) {
      if (error instanceof ImageGenerationError) throw error
      throw new ImageGenerationError('upstream_unavailable')
    }
    const maxPolls = Math.ceil(VIDEO_TIMEOUT_MS / videoPollIntervalMs)
    for (let poll = 0; poll < maxPolls; poll++) {
      await sleep(videoPollIntervalMs)
      let payload: { status?: string; state?: string; unsigned_urls?: string[]; url?: string; data?: { status?: string } } & Record<string, unknown>
      try {
        const response = await fetcher(`${config.upstreamBaseUrl}/videos/${jobId}`, { headers: { authorization: `Bearer ${config.upstreamApiKey}` } })
        payload = await response.json() as typeof payload
        if (payload?.error) throw new ImageGenerationError('upstream_rejected', response.status)
      } catch (error) {
        if (error instanceof ImageGenerationError) throw error
        continue
      }
      const status = payload.status ?? payload.state ?? payload.data?.status
      if (status === 'completed') {
        const directUrl = (payload.unsigned_urls ?? [])[0] ?? payload.url
        return await downloadVideo(jobId, typeof directUrl === 'string' ? directUrl : undefined)
      }
      if (status === 'failed' || status === 'cancelled') throw new ImageGenerationError('upstream_rejected')
    }
    throw new ImageGenerationError('upstream_unavailable')
  }

  async function downloadVideo(jobId: string, directUrl?: string) {
    // 中转 /content 代理用本站 key 即可取片；unsigned_urls 直链指向上游（openrouter）需要上游侧鉴权，直接拉是空体
    try {
      const response = await fetcher(`${config.upstreamBaseUrl}/videos/${jobId}/content`, { headers: { authorization: `Bearer ${config.upstreamApiKey}` }, signal: AbortSignal.timeout(300000) })
      if (response.ok) {
        const bytes = await response.arrayBuffer()
        if (bytes.byteLength > 0) return { data: [{ b64_json: Buffer.from(bytes).toString('base64'), mime: 'video/mp4' }] }
      }
    } catch {
      // 代理不可用时兜底直链
    }
    if (directUrl) {
      const response = await fetcher(directUrl, { signal: AbortSignal.timeout(300000) })
      if (!response.ok) throw new ImageGenerationError('upstream_invalid_response', response.status)
      return { data: [{ b64_json: Buffer.from(await response.arrayBuffer()).toString('base64'), mime: 'video/mp4' }] }
    }
    throw new ImageGenerationError('upstream_invalid_response')
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
      return enabledModels.map(({ id, kind, label }) => ({ id, kind, label }))
    },
    /** 任务运行器用：无鉴权/限流的图片上游调用 */
    generateImageData,
    /** 任务运行器用：视频上游调用 */
    generateVideo
  }
}

export type ImageGenerationCore = ReturnType<typeof createImageGenerationService>
