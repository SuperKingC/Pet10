import { describe, expect, it, vi } from 'vitest'
import { createImagePromptOptimizer } from './imagePromptOptimizer.js'

const config = {
  upstreamBaseUrl: 'https://example.com/v1',
  upstreamApiKey: 'upstream-secret',
  promptModel: 'text-model',
  maxPromptLength: 4000
}

describe('image prompt optimizer', () => {
  it('rewrites the prompt with kind-specific system rules', async () => {
    const requestBodies: Array<{ model: string; messages: Array<{ role: string; content: string }> }> = []
    const fetcher: typeof fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ choices: [{ message: { content: '一只毛茸茸的小狗在草地上奔跑，水彩风格，光线明亮。画面中不出现任何文字、字母、数字、水印或 logo' } }] }), { status: 200 })
    })
    const optimize = createImagePromptOptimizer(config, fetcher)
    const image = await optimize({ prompt: '小狗奔跑', kind: 'image' })
    const video = await optimize({ prompt: '小狗奔跑', kind: 'video', hasFirstFrame: true })
    const textToVideo = await optimize({ prompt: '小狗奔跑', kind: 'video', hasFirstFrame: false })
    expect(image).toContain('水彩')
    expect(video).toContain('小狗')
    expect(textToVideo).toContain('小狗')
    expect(requestBodies).toHaveLength(3)
    expect(requestBodies.every(body => body.model === 'text-model' && body.messages[0].role === 'system')).toBe(true)
    expect(requestBodies[0].messages[0].content).toContain('文生图提示词优化专家')
    expect(requestBodies[1].messages[0].content).toContain('图生视频提示词优化专家')
    expect(requestBodies[2].messages[0].content).toContain('文生视频提示词优化专家')
  })

  it('rejects empty prompts and surfaces upstream failures without leaking internals', async () => {
    const fetcher: typeof fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'sensitive account state', code: 403 } }), { status: 200 }))
    const optimize = createImagePromptOptimizer(config, fetcher)
    await expect(optimize({ prompt: '   ', kind: 'image' })).rejects.toThrow('invalid_prompt')
    const error = await optimize({ prompt: '测试', kind: 'image' }).catch(caught => caught)
    expect(error.message).toBe('upstream_rejected')
    expect(JSON.stringify(error)).not.toContain('sensitive account state')
  })
})
