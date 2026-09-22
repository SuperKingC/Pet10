import { describe, expect, it } from 'vitest'
import { createImageRateLimiter, createInviteFailureLimiter } from './imageRateLimiter.js'
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
    generate: async () => ({ data: [{ b64_json: 'aGVsbG8=' }], usage: { cost: 0.31 } }),
    generateImageData: async () => ({ data: [{ b64_json: 'aGVsbG8=' }], usage: { cost: 0.31, tokens: 1200 } }),
    generateVideo: async () => ({ data: [{ b64_json: 'aGVsbG8=', mime: 'video/mp4' }], usage: { cost: 0.63, tokens: 2000 } }),
    ...overrides
  } as ImageGenerationCore
}

function createService(overrides: { minutePerMinute?: number; imagePerDay?: number; videoPerDay?: number; maxFailures?: number; maxTasks?: number; ttlMs?: number; generation?: Partial<ImageGenerationCore> } = {}) {
  return createImageTaskService({
    generation: overrides.generation ? fakeGeneration(overrides.generation) : fakeGeneration(),
    minuteLimiter: createImageRateLimiter({ perMinute: overrides.minutePerMinute ?? 10, perDay: 1_000_000 }),
    imageDailyLimiter: createImageRateLimiter({ perMinute: 1_000_000, perDay: overrides.imagePerDay ?? 100 }),
    videoDailyLimiter: createImageRateLimiter({ perMinute: 1_000_000, perDay: overrides.videoPerDay ?? 30 }),
    failureLimiter: createInviteFailureLimiter({ maxPerDay: overrides.maxFailures ?? 3 }),
    maxPromptLength: 4000,
    maxTasks: overrides.maxTasks,
    ttlMs: overrides.ttlMs
  })
}

describe('image task service', () => {
  it('runs an image task to completion with aggregated usage', async () => {
    const tasks = createService()
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.1', prompt: '一只猫' })
    expect(snapshot).toMatchObject({ model: 'openai/gpt-5.4-image-2', kind: 'image', status: 'running' })
    await flush()
    const done = tasks.get(snapshot.id, 'friends-only', '10.0.0.1')
    expect(done).toMatchObject({ status: 'succeeded', data: [{ b64_json: 'aGVsbG8=' }], usage: { cost: 0.31, tokens: 1200 } })
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
          return { data: [{ b64_json: 'aGVsbG8=', mime: 'video/mp4' }], usage: { cost: 0.63, tokens: 2000 } }
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
    expect(tasks.get(first.id, 'friends-only', '10.0.0.2')).toMatchObject({ status: 'succeeded', data: [{ b64_json: 'aGVsbG8=' }], usage: { cost: 0.63 } })
    expect(tasks.get(second.id, 'friends-only', '10.0.0.3')?.status).toBe('succeeded')
  })

  it('locks the ip for the day after the configured invite failures, correct code included', () => {
    const tasks = createService({ maxFailures: 3 })
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(() => tasks.submit({ inviteCode: 'wrong-code', ip: '10.0.0.4', prompt: '第' + attempt + '次' })).toThrow('unauthorized')
    }
    expect(() => tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.4', prompt: '正确码也进不来' })).toThrow('invite_locked')
    // 其他 IP 不受影响
    expect(tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.5', prompt: '别的机器' }).status).toBe('running')
  })

  it('does not consume generation quotas on wrong-code attempts', async () => {
    const tasks = createService({ minutePerMinute: 1, imagePerDay: 1 })
    expect(() => tasks.submit({ inviteCode: 'wrong-code', ip: '10.0.0.6', prompt: '测试' })).toThrow('unauthorized')
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.6', prompt: '测试' })
    expect(snapshot.status).toBe('running')
  })

  it('counts image quota per image and keeps video quota in its own pool', async () => {
    const tasks = createService({ imagePerDay: 3, videoPerDay: 3 })
    tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.7', prompt: '两张', count: 2 })
    expect(() => tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.7', prompt: '再要两张超了', count: 2 })).toThrow('rate_limit')
    // 图片池只剩 1 张：单张仍可提交
    expect(tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.7', prompt: '最后一张' }).status).toBe('running')
    // 视频池独立：不受图片池影响
    const video = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.7', prompt: '视频', model: 'kwaivgi/kling-v3.0-std', resolution: '720p' })
    expect(video.status).toBe('running')
    // 视频按个计：3 个池子，提交 3 个后第 4 个被拒
    const videoIp = '10.0.0.8'
    for (let index = 0; index < 3; index++) {
      tasks.submit({ inviteCode: 'friends-only', ip: videoIp, prompt: '视频' + index, model: 'kwaivgi/kling-v3.0-std', resolution: '720p' })
    }
    expect(() => tasks.submit({ inviteCode: 'friends-only', ip: videoIp, prompt: '第4个', model: 'kwaivgi/kling-v3.0-std', resolution: '720p' })).toThrow('rate_limit')
  })

  it('rejects unauthorized polling and unknown models', async () => {
    const tasks = createService()
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.9', prompt: '测试' })
    expect(() => tasks.get(snapshot.id, 'wrong-code', '10.0.0.9')).toThrow('unauthorized')
    expect(() => tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.10', prompt: '测试', model: 'not-enabled' })).toThrow('invalid_model')
    expect(tasks.get('missing-id', 'friends-only', '10.0.0.9')).toBeUndefined()
  })

  it('records failures on the task instead of throwing to the submitter', async () => {
    const tasks = createService({
      generation: { generateImageData: async () => { throw new Error('upstream_unavailable') } }
    })
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.0.11', prompt: '会失败的任务' })
    await flush()
    expect(tasks.get(snapshot.id, 'friends-only', '10.0.0.11')).toMatchObject({ status: 'failed', error: 'upstream_unavailable' })
  })

  it('fans out the requested image count in one submit and merges partial results', async () => {
    let imageCalls = 0
    const tasks = createService({
      generation: {
        generateImageData: async () => {
          imageCalls++
          if (imageCalls === 2) throw new Error('upstream_rejected')
          return { data: [{ b64_json: 'aGVsbG8=' + imageCalls }], usage: { cost: 0.1 } }
        }
      }
    })
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.1.2', prompt: '三张猫', count: 3, aspectRatio: '2:3', imageSize: '1K' })
    await flush()
    const done = tasks.get(snapshot.id, 'friends-only', '10.0.1.2')
    expect(done?.status).toBe('succeeded')
    expect(done?.data).toEqual([{ b64_json: 'aGVsbG8=1' }, { b64_json: 'aGVsbG8=3' }])
    expect(done?.usage).toEqual({ cost: 0.2, tokens: undefined })
    expect(imageCalls).toBe(3)
  })

  it('evicts the oldest finished task beyond the capacity cap', async () => {
    const tasks = createService({ maxTasks: 1 })
    const first = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.1.3', prompt: '第一张' })
    await flush()
    tasks.submit({ inviteCode: 'friends-only', ip: '10.0.1.4', prompt: '第二张' })
    expect(tasks.get(first.id, 'friends-only', '10.0.1.3')).toBeUndefined()
  })

  it('expires task results after the ttl', async () => {
    const tasks = createService({ ttlMs: 30 })
    const snapshot = tasks.submit({ inviteCode: 'friends-only', ip: '10.0.1.5', prompt: '过期任务' })
    await flush()
    expect(tasks.get(snapshot.id, 'friends-only', '10.0.1.5')).toBeDefined()
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(tasks.get(snapshot.id, 'friends-only', '10.0.1.5')).toBeUndefined()
  })
})
