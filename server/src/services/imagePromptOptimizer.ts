import { ImageGenerationError } from './imageGenerationService.js'

const IMAGE_SYSTEM_PROMPT = [
  '你是文生图提示词优化专家。把用户给的简短提示词改写成可直接用于文生图模型的中文提示词：',
  '1) 保留用户的主体、意图与偏好，绝不更换或新增主体；',
  '2) 补全这些要素：主体外观与状态、动作或姿态、场景环境、艺术风格与媒介、构图与视角、光线氛围；',
  '3) 句式连贯自然，不要罗列碎片标签，总长控制在 60~200 字；',
  '4) 在结尾追加一句约束：「画面中不出现任何文字、字母、数字、水印或 logo」；',
  '5) 只输出优化后的提示词本身，不要解释、不要引号、不要分点。'
].join('\n')

const VIDEO_SYSTEM_PROMPT = [
  '你是图生视频提示词优化专家。首帧图已经决定画面外观，提示词只负责描述运动：',
  '1) 保留用户想要的动作意图，绝不更换主体或场景；',
  '2) 用一两句话描述主体的连续运动（动作幅度小而柔和）与镜头要求（镜头固定，不要切换镜头，不要新增元素，不要推拉镜头）；',
  '3) 用户提到风格或氛围时可少量保留，不要复述首帧图里的外观细节；',
  '4) 总长控制在 30~120 字；只输出优化后的提示词本身，不要解释、不要引号、不要分点。'
].join('\n')

const TEXT_TO_VIDEO_SYSTEM_PROMPT = [
  '你是文生视频提示词优化专家。用户没有提供首帧图，提示词需要自己交代画面：',
  '1) 保留用户的主体、意图与偏好，绝不更换或新增主体；',
  '2) 先用一句话交代场景与主体外观（简单、色块化、便于视频模型渲染），再描述动作（动作幅度小而柔和）与镜头（镜头固定，不要切换镜头，不要新增元素）；',
  '3) 总长控制在 60~200 字；只输出优化后的提示词本身，不要解释、不要引号、不要分点。'
].join('\n')

/** 提示词优化：调中转文本模型按图/视频两类规则改写（图=补全要素，视频=图管长相词管动作）。 */
export function createImagePromptOptimizer(
  config: { upstreamBaseUrl: string; upstreamApiKey?: string; promptModel: string; maxPromptLength: number },
  fetcher: typeof fetch = fetch
) {
  return async function optimizePrompt(input: { prompt: string; kind: 'image' | 'video'; hasFirstFrame?: boolean }): Promise<string> {
    if (!input.prompt.trim()) throw new Error('invalid_prompt')
    if (input.prompt.length > config.maxPromptLength) throw new Error('invalid_prompt')
    if (!config.upstreamApiKey) throw new Error('upstream_unavailable')
    const system = input.kind === 'video' ? (input.hasFirstFrame ? VIDEO_SYSTEM_PROMPT : TEXT_TO_VIDEO_SYSTEM_PROMPT) : IMAGE_SYSTEM_PROMPT
    let response: Response
    try {
      response = await fetcher(`${config.upstreamBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.upstreamApiKey}` },
        body: JSON.stringify({ model: config.promptModel, messages: [{ role: 'system', content: system }, { role: 'user', content: input.prompt.trim() }], max_tokens: 800 })
      })
    } catch {
      throw new ImageGenerationError('upstream_unavailable')
    }
    const payload = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: unknown } | null
    if (payload?.error) throw new ImageGenerationError('upstream_rejected', response.status)
    if (!response.ok) throw new ImageGenerationError(response.status >= 500 ? 'upstream_unavailable' : 'upstream_rejected', response.status)
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new ImageGenerationError('upstream_invalid_response', response.status)
    return content.trim().slice(0, config.maxPromptLength)
  }
}

export type ImagePromptOptimizer = ReturnType<typeof createImagePromptOptimizer>
