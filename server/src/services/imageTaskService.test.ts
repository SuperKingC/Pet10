import { describe, expect, it } from 'vitest'
import { createImageRateLimiter } from './imageRateLimiter.js'
import { createImageTaskService } from './imageTaskService.js'
import type { ImageGenerationCore } from './imageGenerationService.js'

const flush = () => new Promise(resolve => setTimeout(resolve, 5))

function fakeGeneration(overrides: Partial<ImageGenerationCore> = {}): ImageGenerationCore {
  return {
    hasInviteConfig: () => true,
    authorize: (inviteCode: string) => {
      if (inviteCode !== 'friends-only') throw new Error('unauthorized')
    },
    resolveModel: (modelId?: string) => {
      const requested = modelId ?? 'openai/gpt-5.4-image-2'
      if (requested === 'openai/gpt-5.4-image-2') return { id: requested, kind: 'image', label: 'image' }
      if (requested === 'kwaivgi/kling-v3.0-std') return { id: requested, kind: 'video', label: 'video' }
      throw new Error('invalid_model')
    },
    listModels: () => [],
    generate: async () => ({ data: [{ b64_json: 'aGVsbG8=' }] }),
    generateImageData: async () => ({ data: [{ b64_json: 'aGVsbG8=' }] }),
    generateVideo: async () => ({ data: [{ b64_json: 'aGVsbG8=', mime: 'video/mp4' }] }),
    ...overrides
  } as ImageGenerationCore
}

function createService(overrides: { perMinute?: number; perDay?: number; maxTasks?: number; ttlMs?: number; generation?: Partial<ImageGenerationCore> } = {}) {
  return createImageTaskService({
    generation: overrides.generation ? fakeGeneration(overrides.generation) : fakeGeneration(),
    limiter: createImageRateLimiter({ perMinute: overrides.perMinute ?? 10, perDay: overrides.perDay ?? 50 }),
    maxPromptLength: 4000,
    maxTasks: overrides.maxTasks,
    ttlMs: overrides.ttlMs
  })
}

describe('image task service', () => {
  it('runs an image task to completion and exposes its result', async () => {
    const tasks = createService()
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.1', prompt: '一只猫' })
    expect(snapshot).toMatchObject({ model: 'openai/gpt-5.4-image-2', kind: 'image', status: 'running' })
    await flush()
    const done = tasks.get(snapshot.id, 'friends-only')
    expect(done).toMatchObject({ status: 'succeeded', data: [{ b64_json: 'aGVsbG8=' }] })
    expect(done?.durationMs).toEqual(expect.any(Number))
  })

  it('runs video tasks through the video path and keeps several tasks running concurrently', async () => {
    let runningCount = 0
    let maxObserved = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const tasks = createService({
      generation: {
        generateVideo: async () => {
          runningCount++
          maxObserved = Math.max(maxObserved, runningCount)
          await gate
          runningCount--
          return { data: [{ b64_json: 'aGVsbG8=', mime: 'video/mp4' }] }
        }
      }
    })
    const first = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.2', prompt: '小狗奔跑', model: 'kwaivgi/kling-v3.0-std', resolution: '720p' })
    const second = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.3', prompt: '小猫跳跃', model: 'kwaivgi/kling-v3.0-std', resolution: '1080p' })
    expect(first).toMatchObject({ kind: 'video', status: 'running' })
    expect(second).toMatchObject({ kind: 'video', status: 'running' })
    await flush()
    expect(maxObserved).toBe(2)
    release()
    await flush()
    expect(tasks.get(first.id, 'friends-only')).toMatchObject({ status: 'succeeded', data: [{ b64_json: 'aGVsbG8=' }] })
    expect(tasks.get(second.id, 'friends-only')?.status).toBe('succeeded')
  })

  it('consumes the shared rate limit on every submit regardless of outcome', async () => {
    const tasks = createService({ perMinute: 2, perDay: 5 })
    tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.4', prompt: '第一张' })
    // 错误邀请码同样消耗第 2 个额度
    expect(() => tasks.submit({ inviteCode: 'wrong-code', ip: '10.0.0.4', prompt: '第二张' })).toThrow('unauthorized')
    expect(() => tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.4', prompt: '第三张' })).toThrow('rate_limit')
  })

  it('rejects unauthorized polling and unknown models', async () => {
    const tasks = createService()
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.5', prompt: '测试' })
    expect(() => tasks.get(snapshot.id, 'wrong-code')).toThrow('unauthorized')
    expect(() => tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.6', prompt: '测试', model: 'not-enabled' })).toThrow('invalid_model')
    expect(tasks.get('missing-id', 'friends-only')).toBeUndefined()
  })

  it('records failures on the task instead of throwing to the submitter', async () => {
    const tasks = createService({
      generation: { generateImageData: async () => { throw new Error('upstream_unavailable') } }
    })
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.7', prompt: '会失败的任务' })
    await flush()
    expect(tasks.get(snapshot.id, 'friends-only')).toMatchObject({ status: 'failed', error: 'upstream_unavailable' })
  })

  it('rejects resolution on image models and unsupported resolutions, and forwards first-frame references', async () => {
    let videoInput: { resolution?: string; referenceImages?: string[] } | undefined
    const tasks = createService({
      generation: {
        generateVideo: async (input) => {
          videoInput = input
          return { data: [{ b64_json: 'aGVsbG8=', mime: 'video/mp4' }] }
        }
      }
    })
    expect(() => tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.8', prompt: '测试', resolution: '720p' })).toThrow('invalid_resolution')
    expect(() => tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.8', prompt: '测试', model: 'kwaivgi/kling-v3.0-std', resolution: '4k' })).toThrow('invalid_resolution')
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.8', prompt: '小狗跑', model: 'kwaivgi/kling-v3.0-std', resolution: '720p', referenceImages: ['data:image/png;base64,aGVsbG8='] })
    await flush()
    expect(snapshot.status).toBe('running')
    expect(videoInput).toMatchObject({ resolution: '720p', referenceImages: ['data:image/png;base64,aGVsbG8='] })
  })

  it('evicts the oldest finished task beyond the capacity cap', async () => {
    const tasks = createService({ maxTasks: 1 })
    const first = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.9', prompt: '第一张' })
    await flush()
    tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.10', prompt: '第二张' })
    expect(tasks.get(first.id, 'friends-only')).toBeUndefined()
  })

  it('expires task results after the ttl', async () => {
    const tasks = createService({ ttlMs: 30 })
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.11', prompt: '过期任务' })
    await flush()
    expect(tasks.get(snapshot.id, 'friends-only')).toBeDefined()
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(tasks.get(snapshot.id, 'friends-only')).toBeUndefined()
  })
})
