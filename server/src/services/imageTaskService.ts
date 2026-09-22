import { randomUUID } from 'node:crypto'
import type { ImageGenerationCore } from './imageGenerationService.js'
import type { ImageRateLimiter } from './imageRateLimiter.js'
import type { ImageModelKind } from './imageModels.js'
import { isImageModel } from './imageModels.js'

export interface ImageTaskSnapshot {
  id: string
  model: string
  kind: ImageModelKind
  status: 'running' | 'succeeded' | 'failed'
  createdAt: string
  durationMs?: number
  error?: string
  data?: Array<{ b64_json?: string; url?: string; mime?: string }>
}

interface InternalTask {
  snapshot: ImageTaskSnapshot
  expiry?: NodeJS.Timeout
}

const VIDEO_SECONDS = new Set([4, 8, 12])

/**
 * 异步生图/生视频任务：提交一次消耗一个限流额度，任务在后台并行运行，
 * 结果只存内存（有 TTL 与数量上限，重启即清）。
 */
export function createImageTaskService({ generation, limiter, maxPromptLength, maxTasks = 30, ttlMs = 30 * 60 * 1000 }: { generation: ImageGenerationCore; limiter: ImageRateLimiter; maxPromptLength: number; maxTasks?: number; ttlMs?: number }) {
  const tasks = new Map<string, InternalTask>()

  function evictIfFull() {
    while (tasks.size >= maxTasks) {
      let victim = [...tasks.entries()].find(([, task]) => task.snapshot.status !== 'running')?.[0]
      if (victim === undefined) victim = [...tasks.keys()][0]
      const evicted = tasks.get(victim)
      if (evicted?.expiry) clearTimeout(evicted.expiry)
      tasks.delete(victim)
    }
  }

  function scheduleExpiry(id: string) {
    const expiry = setTimeout(() => tasks.delete(id), ttlMs)
    expiry.unref?.()
    const task = tasks.get(id)
    if (task) task.expiry = expiry
  }

  return {
    /** 提交任务：鉴权→限流→校验→后台运行（提交即返回，不等待生成） */
    submit(input: { inviteCode: string; ip: string; prompt: string; model?: string; size?: string; seconds?: number; referenceImages?: string[] }): ImageTaskSnapshot {
      if (!generation.hasInviteConfig()) throw new Error('unauthorized')
      // 邀请码错误也必须消耗限流额度，否则失败尝试不占预算，邀请码可被在线爆破
      if (!limiter.allow(input.ip)) throw new Error('rate_limit')
      generation.authorize(input.inviteCode)
      if (!input.prompt.trim() || input.prompt.length > maxPromptLength) throw new Error('invalid_prompt')
      const model = generation.resolveModel(input.model)
      if (input.seconds !== undefined && (!Number.isInteger(input.seconds) || isImageModel(model) || !VIDEO_SECONDS.has(input.seconds))) throw new Error('invalid_seconds')
      evictIfFull()
      const id = randomUUID()
      const task: InternalTask = {
        snapshot: { id, model: model.id, kind: model.kind, status: 'running', createdAt: new Date().toISOString() }
      }
      tasks.set(id, task)
      scheduleExpiry(id)
      const startedAt = Date.now()
      void (async () => {
        try {
          const result = model.kind === 'video'
            ? await generation.generateVideo({ prompt: input.prompt, model: model.id, size: input.size, seconds: input.seconds })
            : await generation.generateImageData({ prompt: input.prompt, model: model.id, size: input.size, referenceImages: input.referenceImages })
          task.snapshot = { ...task.snapshot, status: 'succeeded', durationMs: Date.now() - startedAt, data: result.data }
        } catch (error) {
          task.snapshot = { ...task.snapshot, status: 'failed', durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'internal' }
        }
      })()
      return { ...task.snapshot }
    },

    /** 查询任务：鉴权但不消耗限流额度；未知 id 返回 undefined */
    get(id: string, inviteCode: string): ImageTaskSnapshot | undefined {
      generation.authorize(inviteCode)
      return tasks.get(id)?.snapshot
    }
  }
}

export type ImageTaskService = ReturnType<typeof createImageTaskService>
