import { createImageRateLimiter } from './imageRateLimiter.js'

const SIZES = new Set(['1024x1024', '1024x1536', '1536x1024'])
const ASPECT_RATIOS: Record<string, string> = { '1024x1024': '1:1', '1024x1536': '2:3', '1536x1024': '3:2' }
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

function normalizeImageResponse(payload: unknown) {
  const root = payload as { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> }
  const imageUrl = root.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!imageUrl) throw new Error('upstream_invalid_response')
  const dataUrl = /^data:image\/[^;]+;base64,(.+)$/s.exec(imageUrl)
  return dataUrl ? { data: [{ b64_json: dataUrl[1] }] } : { data: [{ url: imageUrl }] }
}

export function createImageGenerationService(config: { inviteCode: string; upstreamBaseUrl: string; upstreamApiKey?: string; rateLimitPerMinute: number; dailyLimit: number; maxPromptLength: number }, fetcher: typeof fetch = fetch) {
  const limiter = createImageRateLimiter({ perMinute: config.rateLimitPerMinute, perDay: config.dailyLimit })
  return {
    async generate(input: { inviteCode: string; ip: string; prompt: string; model?: string; size?: string; n?: number; referenceImages?: string[] }) {
      if (!config.inviteCode || input.inviteCode !== config.inviteCode) throw new Error('unauthorized')
      if (!limiter.allow(input.ip)) throw new Error('rate_limit')
      if (!input.prompt.trim() || input.prompt.length > config.maxPromptLength) throw new Error('invalid_prompt')
      if (input.model && input.model !== 'openai/gpt-5.4-image-2') throw new Error('invalid_model')
      if (input.size && !SIZES.has(input.size)) throw new Error('invalid_size')
      if (input.n !== undefined && (!Number.isInteger(input.n) || input.n !== 1)) throw new Error('invalid_n')
      const referenceImages = input.referenceImages ?? []
      validateReferenceImages(referenceImages)
      if (!config.upstreamApiKey) throw new Error('upstream_unavailable')
      const size = input.size ?? '1024x1024'
      const content = referenceImages.length === 0 ? input.prompt : [{ type: 'text', text: input.prompt }, ...referenceImages.map(url => ({ type: 'image_url', image_url: { url } }))]
      const response = await fetcher(`${config.upstreamBaseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.upstreamApiKey}` }, body: JSON.stringify({ model: 'openai/gpt-5.4-image-2', messages: [{ role: 'user', content }], modalities: ['image'], image_config: { aspect_ratio: ASPECT_RATIOS[size], image_size: '2K' } }) })
      if (!response.ok) throw new Error(response.status >= 500 ? 'upstream_unavailable' : 'upstream_rejected')
      return normalizeImageResponse(await response.json())
    }
  }
}
