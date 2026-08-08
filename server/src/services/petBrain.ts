import type { ChatMessage, PetAction, User } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import type { AiService } from './aiService.js'
import type { PetActionOutcome } from './petService.js'

interface PetBrainDependencies {
  repositories: RepositoryBundle
  ai: AiService
  emit: (roomId: string, event: string, payload: unknown) => void
  logError?: (message: string, error: unknown) => void
}

const COOLDOWN_MS = 5 * 60 * 1000
const PET_KEYWORDS = ['小多利', '狗狗', '小狗', '喂', '玩', '睡', '可爱', '骨头', '散步', '摸摸']
const MOOD_CARE: Record<number, string> = {
  1: '汪呜…感觉到主人今天心情不太好，小多利把脑袋搁在你手心里，难过分我一半吧。',
  2: '汪？主人今天好像平平淡淡的样子，要不要摸摸我充电一下？',
  3: '汪！主人心情不错嘛，尾巴都跟着摇起来了～',
  4: '汪汪汪！主人今天心情特别好！小多利也要开心得打滚了！'
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function createPetBrain({ repositories, ai, emit, logError = (m, e) => console.error(m, e) }: PetBrainDependencies) {
  const lastProactiveAt = new Map<string, number>()

  async function getOwners(roomId: string): Promise<User[]> {
    const room = await repositories.rooms.findById(roomId)
    if (!room) return []
    if (room.relationshipId) {
      const relationship = await repositories.relationships.findById(room.relationshipId)
      if (!relationship) return []
      const [first, second] = await Promise.all([
        repositories.users.findById(relationship.requesterId),
        repositories.users.findById(relationship.addresseeId)
      ])
      return [first, second].filter((user): user is User => Boolean(user))
    }
    return []
  }

  async function buildMoodsText(roomId: string, owners: User[]): Promise<string | undefined> {
    if (owners.length === 0) return undefined
    const day = new Date().toISOString().slice(0, 10)
    const entries = await repositories.moods.listForRange(roomId, day, day)
    if (entries.length === 0) return undefined
    const labels = ['低落', '一般', '好', '特别好']
    return entries.map((entry) => {
      const owner = owners.find((candidate) => candidate.id === entry.userId)
      return `${owner?.displayName ?? '主人'}心情${labels[entry.level - 1] ?? ''}`
    }).join('；')
  }

  async function speak(roomId: string, triggerMessages: ChatMessage[], roomType: 'pair' | 'pet_dm'): Promise<ChatMessage | undefined> {
    const pet = await repositories.pets.findByRoomId(roomId)
    if (!pet) return undefined
    emit(roomId, 'pet.typing', { roomId, typing: true })
    try {
      const owners = await getOwners(roomId)
      const memories = await repositories.memories.listByRoom(roomId)
      const moodsText = await buildMoodsText(roomId, owners)
      const text = await ai.reply({ messages: triggerMessages, memories, pet, owners, moodsText, roomType })
      const message = await repositories.messages.create({ roomId, senderType: 'pet', kind: 'pet', text })
      emit(roomId, 'message.created', message)
      return message
    } catch (error) {
      logError('petBrain reply failed', error)
      return undefined
    } finally {
      emit(roomId, 'pet.typing', { roomId, typing: false })
    }
  }

  return {
    /** 用户发消息后：小多利始终“看”到，按规则决定是否接话 */
    async onUserMessage(roomId: string, message: ChatMessage) {
      const room = await repositories.rooms.findById(roomId)
      if (!room) return
      const roomType = room.type === 'pet_dm' ? 'pet_dm' as const : 'pair' as const
      const messages = await repositories.messages.listRecent(roomId, 30)

      if (roomType === 'pet_dm') {
        await speak(roomId, messages, roomType)
        return
      }
      const mentioned = message.text.includes('@小多利')
      if (mentioned) {
        await speak(roomId, messages, roomType)
        return
      }
      if (!room.proactiveEnabled) return

      const isQuestion = /[?？]/.test(message.text)
      const hasKeyword = PET_KEYWORDS.some((keyword) => message.text.includes(keyword))
      const last = lastProactiveAt.get(roomId) ?? 0
      const cooledDown = Date.now() - last > COOLDOWN_MS
      const probability = isQuestion || hasKeyword ? 0.75 : 0.25
      if (cooledDown && Math.random() < probability) {
        lastProactiveAt.set(roomId, Date.now())
        await speak(roomId, messages, roomType)
      }
    },

    /** 养成动作后：道谢/升级庆祝，并自动发动态 */
    async onPetEvent(roomId: string, userId: string, action: PetAction, outcome: PetActionOutcome) {
      const room = await repositories.rooms.findById(roomId)
      if (!room || room.type !== 'pair') return
      const actor = await repositories.users.findById(userId)
      const actorName = actor?.displayName ?? '主人'

      if (outcome.leveledUp) {
        const post = await repositories.posts.createAsPet(
          roomId,
          `汪！！小多利升到 ${outcome.pet.level} 级啦！谢谢${actorName}的照顾，尾巴摇成小风扇～`
        )
        emit(roomId, 'post.new', post)
        if (room.proactiveEnabled) {
          const messages = await repositories.messages.listRecent(roomId, 10)
          await speak(roomId, [...messages, {
            id: 'evt', roomId, senderType: 'user', senderId: userId, kind: 'text',
            text: `（系统：${actorName}刚刚和小多利互动，小多利升级了）`, createdAt: new Date()
          }], 'pair')
        }
        return
      }
      if (action === 'feed' && room.proactiveEnabled && Math.random() < 0.5) {
        const thanks = pick([
          `汪！${actorName}喂的饭最香了，肚子圆滚滚～`,
          `呜哇谢谢${actorName}！骨头味道我给满分！`,
          `吃饱饱！${actorName}最好了，蹭蹭～`
        ])
        const messages = await repositories.messages.listRecent(roomId, 10)
        const pet = outcome.pet
        const memories = await repositories.memories.listByRoom(roomId)
        const owners = await getOwners(roomId)
        emit(roomId, 'pet.typing', { roomId, typing: true })
        try {
          void pet
          void memories
          void owners
          const message = await repositories.messages.create({ roomId, senderType: 'pet', kind: 'pet', text: thanks })
          emit(roomId, 'message.created', message)
        } finally {
          emit(roomId, 'pet.typing', { roomId, typing: false })
        }
      }
    },

    /** 好友设置心情后关心一句 */
    async onMoodSet(roomId: string, userId: string, level: number) {
      const room = await repositories.rooms.findById(roomId)
      if (!room || room.type !== 'pair' || !room.proactiveEnabled) return
      const last = lastProactiveAt.get(roomId) ?? 0
      if (Date.now() - last < COOLDOWN_MS) return
      lastProactiveAt.set(roomId, Date.now())
      const message = await repositories.messages.create({
        roomId, senderType: 'pet', kind: 'pet', text: MOOD_CARE[level] ?? MOOD_CARE[3]
      })
      emit(roomId, 'message.created', message)
    },

    /** 显式呼叫小多利（@提及兜底 / 私聊强制回复） */
    async forceReply(roomId: string): Promise<ChatMessage> {
      const room = await repositories.rooms.findById(roomId)
      if (!room) throw new Error('room_not_found')
      const roomType = room.type === 'pet_dm' ? 'pet_dm' as const : 'pair' as const
      const messages = await repositories.messages.listRecent(roomId, 30)
      const message = await speak(roomId, messages, roomType)
      if (!message) throw new Error('pet_not_found')
      return message
    },

    /** 每日首开问候：当天房间里还没有宠物发言时，概率打招呼 */
    async dailyGreeting(roomId: string) {
      const room = await repositories.rooms.findById(roomId)
      if (!room || room.type !== 'pair' || !room.proactiveEnabled) return
      const hour = new Date().getHours()
      if (hour < 7 || hour > 22) return
      const day = new Date().toISOString().slice(0, 10)
      const messages = await repositories.messages.listRecent(roomId, 30)
      const petSpokeToday = messages.some((message) => message.senderType === 'pet' && message.createdAt instanceof Date && message.createdAt.toISOString().slice(0, 10) === day)
      if (petSpokeToday) return
      const last = lastProactiveAt.get(roomId) ?? 0
      if (Date.now() - last < COOLDOWN_MS) return
      if (Math.random() > 0.6) return
      lastProactiveAt.set(roomId, Date.now())
      const greeting = pick([
        '汪！主人来啦！小多利等你们好久啦，今天谁先陪我玩？',
        '汪呜～新的一天！小多利已经把尾巴准备好了，谁来摸摸？',
        '汪汪！今天也要一起照顾我哦，肚子已经开始咕咕叫了…'
      ])
      const message = await repositories.messages.create({ roomId, senderType: 'pet', kind: 'pet', text: greeting })
      emit(roomId, 'message.created', message)
    }
  }
}
