export interface ImageGenerationRequest {
  invite: string
  prompt: string
  size: string
  referenceImages: string[]
}

export interface ImageGenerationResponse {
  data?: Array<{ url?: string; b64_json?: string }>
  httpStatus?: number
  durationMs?: number
  error?: string
  upstreamCode?: number
  requestId?: string
}

export type ImageGenerationFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

async function readImageResponse(response: Response): Promise<ImageGenerationResponse> {
  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text()
  if (!contentType.includes('application/json')) {
    throw new Error(response.status === 404 ? '生图接口尚未部署，请更新并重启 API 服务' : '服务器返回了异常响应，请稍后再试')
  }
  try {
    return JSON.parse(text) as ImageGenerationResponse
  } catch {
    throw new Error('服务器返回的数据格式不正确')
  }
}

export async function requestImageGeneration(
  request: ImageGenerationRequest,
  fetcher: ImageGenerationFetcher = fetch,
): Promise<ImageGenerationResponse> {
  const response = await fetcher('/api/images/generations', {
    method: 'POST',
    headers: { authorization: `Bearer ${request.invite}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: request.prompt,
      model: 'openai/gpt-5.4-image-2',
      size: request.size,
      n: 1,
      referenceImages: request.referenceImages,
    }),
  })
  const payload = await readImageResponse(response)
  if (!response.ok) return { ...payload, httpStatus: response.status }
  return payload
}
