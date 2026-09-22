import { randomUUID } from 'node:crypto'
import { validateReferenceImages, IMAGE_ASPECT_RATIOS, IMAGE_IMAGE_SIZES, VIDEO_RESOLUTIONS, VIDEO_DURATIONS, type ImageGenerationCore } from './imageGenerationService.js'
import type { ImageRateLimiter, InviteFailureLimiter } from './imageRateLimiter.js'
import type { ImageModelKind } from './imageModels.js'
import { isImageModel } from './imageModels.js'

export interface ImageTaskSnapshot {
  id: string
  model: string
  kind: ImageModelKind
  status: 'running' | 'succeeded' | 'failed'
  createdAt: string
  durationMs?: number
  usage?: { cost?: number; tokens?: number }
  error?: string
  data?: Array<{ b64_json?: string; url?: string; mime?: string }>
}

interface InternalTask {
  snapshot: ImageTaskSnapshot
  expiry?: NodeJS.Timeout
}

/**
 * 异步生图/生视频任务：提交一次在后台并行运行，结果只存内存（有 TTL 与数量上限，重启即清）。
 * 额度模型：每分钟一次（共享）；图片按张、视频按个走各自日额度；邀请码错误走独立失败锁定（错满当天锁死）。
 */
export function createImageTaskService({ generation, minuteLimiter, imageDailyLimiter, videoDailyLimiter, failureLimiter, maxPromptLength, maxTasks = 30, ttlMs = 30 * 60 * 1000 }: { generation: ImageGenerationCore; minuteLimiter: ImageRateLimiter; imageDailyLimiter: ImageRateLimiter; videoDailyLimiter: ImageRateLimiter; failureLimiter: InviteFailureLimiter; maxPromptLength: number; maxTasks?: number; ttlMs?: number }) {
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
    /** 提交任务：锁定→鉴权→校验→扣额度→后台运行（提交即返回，不等待生成） */
    submit(input: { inviteCode: string; ip: string; prompt: string; model?: string; aspectRatio?: string; imageSize?: string; count?: number; resolution?: string; duration?: number; audio?: boolean; referenceImages?: string[] }): ImageTaskSnapshot {
      // 一天内邀请码错满次数：该 IP 当天整体锁定，连正确码也拒绝
      if (failureLimiter.isLocked(input.ip)) throw new Error('invite_locked')
      try {
        generation.authorize(input.inviteCode)
      } catch (error) {
        failureLimiter.recordFailure(input.ip)
        throw error
      }
      if (!input.prompt.trim() || input.prompt.length > maxPromptLength) throw new Error('invalid_prompt')
      const model = generation.resolveModel(input.model)
      const count = input.count ?? 1
      if (!Number.isInteger(count) || count < 1 || count > 4 || (model.kind === 'video' && count > 1)) throw new Error('invalid_count')
      if (input.aspectRatio !== undefined && (!isImageModel(model) || !IMAGE_ASPECT_RATIOS.has(input.aspectRatio))) throw new Error('invalid_aspect_ratio')
      if (input.imageSize !== undefined && (!isImageModel(model) || !IMAGE_IMAGE_SIZES.has(input.imageSize))) throw new Error('invalid_image_size')
      if (input.resolution !== undefined && (isImageModel(model) || !VIDEO_RESOLUTIONS.has(input.resolution))) throw new Error('invalid_resolution')
      if (input.duration !== undefined && (isImageModel(model) || !VIDEO_DURATIONS.has(input.duration))) throw new Error('invalid_duration')
      const referenceImages = input.referenceImages ?? []
      validateReferenceImages(referenceImages)
      // 校验全部通过才扣额度：分钟池共享一次；图片按张、视频按个走各自日额度
      if (!minuteLimiter.allow(input.ip)) throw new Error('rate_limit')
      const daily = isImageModel(model) ? imageDailyLimiter : videoDailyLimiter
      if (!daily.allowN(input.ip, isImageModel(model) ? count : 1)) throw new Error('rate_limit')
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
          const data: NonNullable<ImageTaskSnapshot['data']> = []
          let totalCost = 0
          let totalTokens = 0
          const collectUsage = (usage: { cost?: number; tokens?: number } | undefined) => {
            totalCost += usage?.cost ?? 0
            totalTokens += usage?.tokens ?? 0
          }
          if (model.kind === 'video') {
            const result = await generation.generateVideo({ prompt: input.prompt, model: model.id, resolution: input.resolution, duration: input.duration, audio: input.audio, referenceImages })
            data.push(...result.data.map(item => ({ ...item })))
            collectUsage(result.usage)
          } else {
            // 出图数量 >1 时并行跑多张；部分失败仍交付成功的那部分，全部失败才标记任务失败
            const settled = await Promise.allSettled(
              Array.from({ length: count }, () => generation.generateImageData({ prompt: input.prompt, model: model.id, aspectRatio: input.aspectRatio, imageSize: input.imageSize, referenceImages }))
            )
            for (const entry of settled) {
              if (entry.status === 'fulfilled') {
                data.push(...entry.value.data.map(item => ({ ...item })))
                collectUsage(entry.value.usage)
              }
            }
            if (data.length === 0) throw settled.find((entry): entry is PromiseRejectedResult => entry.status === 'rejected')?.reason ?? new Error('upstream_unavailable')
          }
          const usage: ImageTaskSnapshot['usage'] = totalCost > 0 || totalTokens > 0 ? { cost: totalCost > 0 ? totalCost : undefined, tokens: totalTokens > 0 ? totalTokens : undefined } : undefined
          task.snapshot = { ...task.snapshot, status: 'succeeded', durationMs: Date.now() - startedAt, ...(usage ? { usage } : {}), data }
        } catch (error) {
          task.snapshot = { ...task.snapshot, status: 'failed', durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'internal' }
        }
      })()
      return { ...task.snapshot }
    },

    /** 查询任务：鉴权但不消耗额度；锁定/未知 id 分别拒绝与返回 undefined */
    get(id: string, inviteCode: string, ip: string): ImageTaskSnapshot | undefined {
      if (failureLimiter.isLocked(ip)) throw new Error('invite_locked')
      generation.authorize(inviteCode)
      return tasks.get(id)?.snapshot
    }
  }
}

export type ImageTaskService = ReturnType<typeof createImageTaskService>
