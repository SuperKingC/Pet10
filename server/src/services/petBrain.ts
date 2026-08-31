import type { ChatMessage, Pet, PetAction, PetMemory, User } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import type { AiService } from './aiService.js'
import type { PetActionOutcome } from './petService.js'
import type { createReminderService } from './reminderService.js'
import type { createPetMoodService } from './petMoodService.js'
import { computeMoodState } from '../domain/petMoodRules.js'

interface PetBrainDependencies {
  repositories: RepositoryBundle
  ai: AiService
  emit: (roomId: string, event: string, payload: unknown) => void
  reminders?: Pick<ReturnType<typeof createReminderService>, 'handleMessage'>
  mood?: Pick<ReturnType<typeof createPetMoodService>, 'getMoodContext' | 'applyChatSentiment'>
  logError?: (message: string, error: unknown) => void
}

const COOLDOWN_MS = 5 * 60 * 1000
const MEMORY_COOLDOWN_MS = 10 * 60 * 1000
const MEMORY_LIMIT = 60
const MEMORY_MOMENT_CHANCE = 0.2
const PAIR_REPLY_DEBOUNCE_MS = 1500
const PAIR_CHATTER_MIN_MS = 10 * 60 * 1000
const PAIR_CHATTER_MAX_MS = 20 * 60 * 1000
const PAIR_ACTIVE_WINDOW_MS = 45 * 60 * 1000
const MOOD_CARE: Record<number, string> = {
  1: '汪呜…感觉到主人今天心情不太好，小多利把脑袋搁在你手心里，难过分我一半吧。',
  2: '汪？主人今天好像平平淡淡的样子，要不要摸摸我充电一下？',
  3: '汪！主人心情不错嘛，尾巴都跟着摇起来了～',
  4: '汪汪汪！主人今天心情特别好！小多利也要开心得打滚了！'
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** 私聊房没有宠物行，用默认状态继续对话（修复 pet_dm 不回复） */
function defaultPet(roomId: string): Pet {
  return {
    id: `dm-${roomId}`, relationshipId: '', roomId, name: '小多利',
    level: 1, experience: 0, experienceToNextLevel: 100,
    hunger: 80, mood: 80, energy: 80, health: 100, intimacy: 10, updatedAt: new Date()
  }
}

export function createPetBrain({ repositories, ai, emit, reminders, mood, logError = (m, e) => console.error(m, e) }: PetBrainDependencies) {
  const lastProactiveAt = new Map<string, number>()
  const lastMemoryExtractAt = new Map<string, number>()
  const memoryExtractionInFlight = new Set<string>()
  const pairReplyTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const pairChatterTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const pairReplyInFlight = new Set<string>()
  const pairReplyQueued = new Set<string>()
  const lastPairActivityAt = new Map<string, number>()

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

  /** 心情腔调：有宠物行走心情引擎；私聊房没有宠物行，用默认状态+闲置时长临时推导 */
  async function resolveMoodText(roomId: string, roomType: 'pair' | 'pet_dm'): Promise<string | undefined> {
    const context = await mood?.getMoodContext(roomId)
    if (context) return context.state.toneHint
    if (roomType === 'pet_dm') {
      const recent = await repositories.messages.listRecent(roomId, 5)
      const lastUserMessageAt = [...recent].reverse().find((message) => message.senderType === 'user')?.createdAt
      const idleHours = lastUserMessageAt ? (Date.now() - lastUserMessageAt.getTime()) / 3_600_000 : 0
      return computeMoodState({ mood: defaultPet(roomId).mood, idleHours }).toneHint
    }
    return undefined
  }

  async function speak(roomId: string, triggerMessages: ChatMessage[], roomType: 'pair' | 'pet_dm'): Promise<ChatMessage | undefined> {
    const pet = (await repositories.pets.findByRoomId(roomId)) ?? defaultPet(roomId)
    emit(roomId, 'pet.typing', { roomId, typing: true })
    try {
      let owners = await getOwners(roomId)
      if (owners.length === 0 && roomType === 'pet_dm') {
        // 私聊房从最近消息里找到聊天的主人，让 persona 知道在和谁说话
        const senderId = [...triggerMessages].reverse().find((message) => message.senderType === 'user')?.senderId
        if (senderId) {
          const user = await repositories.users.findById(senderId)
          if (user) owners = [user]
        }
      }
      const memories = await repositories.memories.listByRoom(roomId)
      const moodsText = await buildMoodsText(roomId, owners)
      const moodText = await resolveMoodText(roomId, roomType)
      const text = await ai.reply({ messages: triggerMessages, memories, pet, owners, moodsText, moodText, roomType })
      const message = await repositories.messages.create({ roomId, senderType: 'pet', kind: 'pet', text })
      emit(roomId, 'message.created', message)
      void maybeExtractMemory(roomId)
      return message
    } catch (error) {
      logError('petBrain reply failed', error)
      return undefined
    } finally {
      emit(roomId, 'pet.typing', { roomId, typing: false })
    }
  }

  function clearTimer(timers: Map<string, ReturnType<typeof setTimeout>>, roomId: string) {
    const timer = timers.get(roomId)
    if (timer) clearTimeout(timer)
    timers.delete(roomId)
  }

  function schedulePairReply(roomId: string) {
    clearTimer(pairReplyTimers, roomId)
    if (pairReplyInFlight.has(roomId)) {
      pairReplyQueued.add(roomId)
      return
    }
    pairReplyTimers.set(roomId, setTimeout(() => {
      pairReplyTimers.delete(roomId)
      void flushPairReply(roomId)
    }, PAIR_REPLY_DEBOUNCE_MS))
  }

  function schedulePairChatter(roomId: string) {
    clearTimer(pairChatterTimers, roomId)
    const delay = PAIR_CHATTER_MIN_MS + Math.floor(Math.random() * (PAIR_CHATTER_MAX_MS - PAIR_CHATTER_MIN_MS))
    pairChatterTimers.set(roomId, setTimeout(() => {
      pairChatterTimers.delete(roomId)
      void runPairChatter(roomId)
    }, delay))
  }

  async function finishPairSpeech(roomId: string) {
    pairReplyInFlight.delete(roomId)
    if (pairReplyQueued.delete(roomId)) {
      schedulePairReply(roomId)
      return
    }
    schedulePairChatter(roomId)
  }

  async function flushPairReply(roomId: string) {
    const room = await repositories.rooms.findById(roomId)
    if (!room || room.type !== 'pair' || !room.proactiveEnabled) {
      pairReplyQueued.delete(roomId)
      return
    }
    pairReplyInFlight.add(roomId)
    try {
      const messages = await repositories.messages.listRecent(roomId, 30)
      await speak(roomId, messages, 'pair')
    } finally {
      await finishPairSpeech(roomId)
    }
  }

  async function runPairChatter(roomId: string) {
    const room = await repositories.rooms.findById(roomId)
    const lastActivity = lastPairActivityAt.get(roomId)
    if (!room || room.type !== 'pair' || !room.proactiveEnabled || !lastActivity) return
    if (Date.now() - lastActivity > PAIR_ACTIVE_WINDOW_MS) return
    if (pairReplyTimers.has(roomId) || pairReplyInFlight.has(roomId) || pairReplyQueued.has(roomId)) return

    pairReplyInFlight.add(roomId)
    try {
      const messages = await repositories.messages.listRecent(roomId, 30)
      await speak(roomId, messages, 'pair')
    } finally {
      await finishPairSpeech(roomId)
    }
  }

  /** 说完话后按冷却+概率提取一条真实记忆；每房上限 60 条，淘汰最旧 */
  async function maybeExtractMemory(roomId: string) {
    if (memoryExtractionInFlight.has(roomId)) return
    memoryExtractionInFlight.add(roomId)
    try {
      const last = lastMemoryExtractAt.get(roomId) ?? 0
      if (Date.now() - last < MEMORY_COOLDOWN_MS) return
      const [recent, memories] = await Promise.all([
        repositories.messages.listRecent(roomId, 12),
        repositories.memories.listByRoom(roomId)
      ])
      const text = await ai.extractMemory(recent, memories.map((memory) => memory.text))
      if (!text) return
      if (memories.some((memory) => memory.text.trim() === text.trim())) return
      const memory = await repositories.memories.create({ roomId, text })
      lastMemoryExtractAt.set(roomId, Date.now())
      emit(roomId, 'memory.created', memory)
      void maybePostMomentFromMemory(roomId, memory)
      // listByRoom 按时间倒序，超出上限时删尾部（最旧）
      if (memories.length + 1 > MEMORY_LIMIT) {
        for (const oldest of memories.slice(MEMORY_LIMIT - 1)) {
          await repositories.memories.deleteById(roomId, oldest.id)
        }
      }
    } catch (error) {
      logError('petBrain memory extraction failed', error)
    } finally {
      memoryExtractionInFlight.delete(roomId)
    }
  }

  /** 刚记住的聊天要点：小概率（每房每天至多一条）发散成一条小多利圈动态，AI 不可用就跳过 */
  async function maybePostMomentFromMemory(roomId: string, memory: PetMemory) {
    if (!ai.composeMomentPost) return
    if (Math.random() >= MEMORY_MOMENT_CHANCE) return
    try {
      const recentPosts = await repositories.posts.listByRoom(roomId, 5)
      const today = new Date().toISOString().slice(0, 10)
      const postedToday = recentPosts.some((post) =>
        post.authorType === 'pet' && post.createdAt.toISOString().slice(0, 10) === today
      )
      if (postedToday) return
      const moodContext = await mood?.getMoodContext(roomId)
      const text = await ai.composeMomentPost({
        trigger: 'memory',
        memoryText: memory.text,
        moodLine: moodContext?.state.toneHint
      })
      if (!text) return
      const post = await repositories.posts.createAsPet(roomId, text)
      emit(roomId, 'post.new', post)
    } catch (error) {
      logError('petBrain memory moment failed', error)
    }
  }

  async function saveExplicitMemory(roomId: string, message: ChatMessage) {
    const match = message.text.trim().match(/^记住(?:：|:|\s*)?(.+)$/)
    if (!match) return false
    const text = match[1].trim()
    if (!text) return false
    const existing = await repositories.memories.listByRoom(roomId)
    let memory = existing.find((item) => item.text === text)
    if (!memory) {
      memory = await repositories.memories.create({
        roomId,
        text,
        sourceMessageId: message.id,
        category: 'other',
        importance: 3,
        source: 'explicit'
      })
      emit(roomId, 'memory.created', memory)
    }
    const reply = await repositories.messages.create({
      roomId,
      senderType: 'pet',
      kind: 'pet',
      text: `汪，我记住啦：${text}`
    })
    emit(roomId, 'message.created', reply)
    return true
  }

  return {
    /** 用户发消息后：小多利始终“看”到，按规则决定是否接话 */
    async onUserMessage(roomId: string, message: ChatMessage) {
      const room = await repositories.rooms.findById(roomId)
      if (!room) return
      if (message.senderId && await reminders?.handleMessage(roomId, message.senderId, message.text)) return
      if (await saveExplicitMemory(roomId, message)) return
      void mood?.applyChatSentiment(roomId, message.text)
      const roomType = room.type === 'pet_dm' ? 'pet_dm' as const : 'pair' as const

      if (roomType === 'pet_dm') {
        const messages = await repositories.messages.listRecent(roomId, 30)
        await speak(roomId, messages, roomType)
        return
      }

      lastPairActivityAt.set(roomId, Date.now())
      clearTimer(pairChatterTimers, roomId)
      if (!room.proactiveEnabled) {
        clearTimer(pairReplyTimers, roomId)
        pairReplyQueued.delete(roomId)
        return
      }
      schedulePairReply(roomId)
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

    /** 每日首开问候：当天房间里还没有宠物发言时，概率打招呼；私聊房也会主动碎碎念 */
    async dailyGreeting(roomId: string) {
      const room = await repositories.rooms.findById(roomId)
      if (!room || !room.proactiveEnabled) return
      const hour = new Date().getHours()
      if (hour < 7 || hour > 22) return
      const isPetDm = room.type === 'pet_dm'
      const day = new Date().toISOString().slice(0, 10)
      const messages = await repositories.messages.listRecent(roomId, 30)
      const petSpokeToday = messages.some((message) => message.senderType === 'pet' && message.createdAt instanceof Date && message.createdAt.toISOString().slice(0, 10) === day)
      if (!isPetDm && petSpokeToday) return
      const last = lastProactiveAt.get(roomId) ?? 0
      // 私聊房主动碎碎念冷却 10 分钟，pair 房保持 5 分钟
      if (Date.now() - last < (isPetDm ? 2 * COOLDOWN_MS : COOLDOWN_MS)) return
      if (Math.random() > (isPetDm ? (petSpokeToday ? 0.25 : 0.6) : 0.6)) return
      lastProactiveAt.set(roomId, Date.now())
      const greeting = isPetDm
        ? pick([
            '呜汪…你怎么才来呀，才不是在等你呢！',
            '主人主人！我今天发现了一个秘密，凑过来才告诉你～',
            '贴贴！今天也要按时吃饭哦，不然我会生气的！',
            '汪呜～无聊死了，快跟我说说你在干嘛！'
          ])
        : pick([
            '汪！主人来啦！小多利等你们好久啦，今天谁先陪我玩？',
            '汪呜～新的一天！小多利已经把尾巴准备好了，谁来摸摸？',
            '汪汪！今天也要一起照顾我哦，肚子已经开始咕咕叫了…'
          ])
      const message = await repositories.messages.create({ roomId, senderType: 'pet', kind: 'pet', text: greeting })
      emit(roomId, 'message.created', message)
    }
  }
}
