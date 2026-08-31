import type { Pet } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import {
  adjustMoodForChat,
  computeMoodState,
  decayMood,
  type PetMoodState
} from '../domain/petMoodRules.js'

interface PetMoodServiceDependencies {
  repositories: RepositoryBundle
  now?: () => Date
  logError?: (message: string, error: unknown) => void
}

export interface PetMoodContext {
  pet: Pet
  state: PetMoodState
  /** 距离上一次被主人理会的小时数 */
  idleHours: number
}

const CHAT_SENTIMENT_COOLDOWN_MS = 60 * 60 * 1000

export function createPetMoodService({
  repositories,
  now = () => new Date(),
  logError = (message, error) => console.error(message, error)
}: PetMoodServiceDependencies) {
  const lastChatAdjustAt = new Map<string, number>()

  /** 最近一次被主人理会的时间：最近一条用户消息与最近一次小窝动作取较大者（不含宠物自己的发言） */
  async function getUserAttentionAt(roomId: string, pet: Pet): Promise<Date | undefined> {
    const recent = await repositories.messages.listRecent(roomId, 5)
    const lastUserMessageAt = [...recent].reverse().find((message) => message.senderType === 'user')?.createdAt
    const lastEventAt = await repositories.petEvents.lastAt(pet.id)
    return [lastUserMessageAt, lastEventAt]
      .filter((value): value is Date => value instanceof Date)
      .reduce<Date | undefined>((latest, value) => (!latest || value.getTime() > latest.getTime() ? value : latest), undefined)
  }

  return {
    /** 组装喂给 persona 的心情上下文；没有宠物行的私聊房返回 undefined */
    async getMoodContext(roomId: string): Promise<PetMoodContext | undefined> {
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) return undefined
      const attentionAt = await getUserAttentionAt(roomId, pet)
      const idleHours = attentionAt ? Math.max(0, (now().getTime() - attentionAt.getTime()) / 3_600_000) : 0
      return { pet, state: computeMoodState({ mood: pet.mood, idleHours }), idleHours }
    },

    /** 聊天关键词情绪：夸奖 +2 / 嫌弃 -3；每房每小时至多生效一次，防刷分 */
    async applyChatSentiment(roomId: string, text: string) {
      try {
        const last = lastChatAdjustAt.get(roomId) ?? 0
        if (now().getTime() - last < CHAT_SENTIMENT_COOLDOWN_MS) return
        const pet = await repositories.pets.findByRoomId(roomId)
        if (!pet) return
        const next = adjustMoodForChat(pet.mood, text)
        if (next === pet.mood) return
        lastChatAdjustAt.set(roomId, now().getTime())
        await repositories.pets.update({ ...pet, mood: next })
      } catch (error) {
        logError('pet mood chat sentiment failed', error)
      }
    },

    /** 单房衰减：闲置超过阈值扣一点心情；宠物行更新时间参与判定，任何写入都会推迟下一次衰减 */
    async decayIfIdle(roomId: string) {
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) return
      const [attentionAt, lastEventAt] = await Promise.all([
        (async () => {
          const recent = await repositories.messages.listRecent(roomId, 5)
          return [...recent].reverse().find((message) => message.senderType === 'user')?.createdAt
        })(),
        repositories.petEvents.lastAt(pet.id)
      ])
      const checkpointCandidates = [pet.updatedAt, attentionAt, lastEventAt]
        .filter((value): value is Date => value instanceof Date)
      const checkpoint = checkpointCandidates
        .reduce<Date | undefined>((latest, value) => (!latest || value.getTime() > latest.getTime() ? value : latest), undefined)
      if (!checkpoint) return
      const next = decayMood(pet.mood, now().getTime() - checkpoint.getTime())
      if (next === pet.mood) return
      await repositories.pets.update({ ...pet, mood: next })
    }
  }
}

export type PetMoodService = ReturnType<typeof createPetMoodService>
