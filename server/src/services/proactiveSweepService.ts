import type { Room } from '../domain/models.js'
import type { PetMoodKey } from '../domain/petMoodRules.js'
import type { MomentTopic } from '../domain/momentRules.js'
import { pickMomentTopic, MOMENT_SILENCE_HOURS } from '../domain/momentRules.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import type { AiService } from './aiService.js'
import type { createPetMoodService } from './petMoodService.js'

interface ProactiveSweepDependencies {
  repositories: RepositoryBundle
  ai: Pick<AiService, 'composeProactiveMessage' | 'composeMomentPost'>
  emit: (roomId: string, event: string, payload: unknown) => void
  mood?: Pick<ReturnType<typeof createPetMoodService>, 'getMoodContext'>
  now?: () => Date
  random?: () => number
  logError?: (message: string, error: unknown) => void
}

/** 基础门槛：沉默 24 小时才主动找人说话 */
const CHAT_SILENCE_HOURS = 24
/** 心情委屈/生气时提前到 12 小时——被冷落太久会憋不住 */
const LONELY_CHAT_SILENCE_HOURS = 12
/** 上一条宠物消息距今必须超过该小时数（天然冷却，重启不丢） */
const PET_MESSAGE_GUARD_HOURS = 12
/** 发圈触发阈值/节流/时段档规则统一在 domain/momentRules */

const PROACTIVE_FALLBACKS: Record<PetMoodKey, string[]> = {
  happy: [
    '汪汪！小多利在房间里捡到一个好东西，快来问我是什么！',
    '主人主人！我今天开心得原地转了三圈，快回来陪我跑两圈！'
  ],
  content: [
    '主人～在忙什么呀？小多利趴在门口等你哦。',
    '汪～今天也要记得喝水休息，我看着你呢！'
  ],
  bored: [
    '呜……好无聊啊，玩具都咬腻了，谁来陪我玩一会儿……',
    '汪……趴在窗边看了一下午云了，你们什么时候回来呀。'
  ],
  sulky: [
    '哦～原来你们还记得家里有一只小狗呀？',
    '哼，小多利自己玩了好久，才没有一直等你呢（尾巴拍地）。'
  ],
  angry: [
    '哼！不理你们了！（但是耳朵一直竖着听动静）',
    '你、你再不回来摸摸我，我就把玩具藏进你的鞋里啦！'
  ]
}

/** 发圈主题 → 模板兜底（AI 不可用时用；memory 帖无模板，失败即跳过） */
const MOMENT_FALLBACKS: Record<MomentTopic, string[]> = {
  missing: [
    '汪，今天也有好好吃饭好好睡觉，就是有点想你们。',
    '趴在门口等了好久，你们什么时候回来呀。'
  ],
  morning: [
    '早安！小多利刚睡醒，毛都翘成一朵花了～',
    '梦见一根超级大的骨头，醒来口水把窝垫弄湿了一块…'
  ],
  noon: [
    '午饭时间到！今天也是准时干饭的乖小狗！',
    '晒着太阳打了个大哈欠，午觉走起～'
  ],
  afternoon: [
    '下午的太阳正正好，玩具又被我咬出三个洞，满分！',
    '刚刚对着窗外汪了两声，感觉发泄多了。'
  ],
  night: [
    '打哈欠…今晚也要四脚朝天睡觉，晚安汪～',
    '睡前偷偷把一块小饼干藏进了窝里，嘘，别告诉谁。'
  ],
  memory: []
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** 沉默检测 sweep：主动找主人说话 + 冷清太久发朋友圈；冷却全部由 DB 时间戳派生，进程重启不丢 */
export function createProactiveSweepService({
  repositories,
  ai,
  emit,
  mood,
  now = () => new Date(),
  random = Math.random,
  logError = (message, error) => console.error(message, error)
}: ProactiveSweepDependencies) {
  async function getOwners(roomId: string, lastUserSenderId?: string): Promise<string[]> {
    const room = await repositories.rooms.findById(roomId)
    if (!room) return []
    if (room.relationshipId) {
      const relationship = await repositories.relationships.findById(room.relationshipId)
      if (!relationship) return []
      const [first, second] = await Promise.all([
        repositories.users.findById(relationship.requesterId),
        repositories.users.findById(relationship.addresseeId)
      ])
      return [first, second]
        .filter((user) => Boolean(user))
        .map((user) => user!.displayName)
        .filter(Boolean)
    }
    if (lastUserSenderId) {
      const user = await repositories.users.findById(lastUserSenderId)
      return user?.displayName ? [user.displayName] : []
    }
    return []
  }

  /** 每轮每个房间只做一件事：优先找人说话，否则再考虑发圈 */
  async function sweepRoom(room: Room) {
    const recent = await repositories.messages.listRecent(room.id, 30)
    // 沉默只看主人多久没理会（宠物自己的发言不算互动，否则会不断重置沉默钟）
    const lastUserMessageAt = [...recent].reverse().find((message) => message.senderType === 'user')?.createdAt
    if (!lastUserMessageAt) return // 全新房间交给每日问候逻辑
    const nowMs = now().getTime()
    const silenceHours = (nowMs - lastUserMessageAt.getTime()) / 3_600_000
    const lastPetMessageAt = [...recent].reverse().find((message) => message.senderType === 'pet')?.createdAt
    const lastUserSenderId = [...recent].reverse().find((message) => message.senderType === 'user')?.senderId
    const moodContext = await mood?.getMoodContext(room.id)
    const moodKey = moodContext?.state.key

    const lonely = moodKey === 'sulky' || moodKey === 'angry'
    const chatThresholdHours = lonely ? LONELY_CHAT_SILENCE_HOURS : CHAT_SILENCE_HOURS
    const petMessageIdleHours = lastPetMessageAt
      ? (nowMs - lastPetMessageAt.getTime()) / 3_600_000
      : Number.POSITIVE_INFINITY
    if (silenceHours > chatThresholdHours && petMessageIdleHours > PET_MESSAGE_GUARD_HOURS) {
      const memories = await repositories.memories.listByRoom(room.id)
      const owners = await getOwners(room.id, lastUserSenderId)
      const composed = await ai.composeProactiveMessage?.({
        moodLine: moodContext?.state.toneHint,
        silenceHours,
        owners,
        memories: memories.map((memory) => memory.text)
      })
      const text = composed ?? pick(PROACTIVE_FALLBACKS[moodKey ?? 'content'])
      const message = await repositories.messages.create({ roomId: room.id, senderType: 'pet', kind: 'pet', text })
      emit(room.id, 'message.created', message)
      return
    }

    // 发圈判定：主人沉默想念帖 或 生活时段日常帖；日上限/最小间隔/时段档统一在 momentRules
    const petPosts = (await repositories.posts.listByRoom(room.id, 20))
      .filter((post) => post.authorType === 'pet')
    const topic = pickMomentTopic({
      now: now(),
      petPostTimes: petPosts.map((post) => post.createdAt),
      userSilenceHours: silenceHours,
      random: random()
    })
    if (!topic) return
    const memories = await repositories.memories.listByRoom(room.id)
    const composed = await ai.composeMomentPost?.({
      trigger: topic === 'missing' ? 'silence' : 'daily',
      topic,
      moodLine: moodContext?.state.toneHint,
      silenceHours,
      memories: memories.map((memory) => memory.text)
    })
    const fallbacks = MOMENT_FALLBACKS[topic]
    const text = composed ?? (fallbacks.length > 0 ? pick(fallbacks) : null)
    if (!text) return
    const post = await repositories.posts.createAsPet(room.id, text)
    emit(room.id, 'post.new', post)
  }

  return {
    async runOnce() {
      let rooms: Room[]
      try {
        rooms = await repositories.rooms.listAll()
      } catch (error) {
        logError('proactive sweep failed', error)
        return
      }
      for (const room of rooms) {
        if (!room.proactiveEnabled) continue
        try {
          await sweepRoom(room)
        } catch (error) {
          logError('proactive sweep room failed', error)
        }
      }
    },
    start(intervalMs = 10 * 60 * 1000) {
      const timer = setInterval(() => {
        void this.runOnce()
      }, intervalMs)
      timer.unref?.()
      return () => clearInterval(timer)
    }
  }
}
