import type { Room } from '../domain/models.js'
import type { PetMoodKey } from '../domain/petMoodRules.js'
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
/** 沉默满 24 小时发一条朋友圈（主人一天没来，它就自己去小多利圈碎碎念） */
const MOMENT_SILENCE_HOURS = 24
/** 上一条宠物帖子距今必须超过该小时数 */
const PET_POST_GUARD_HOURS = 24

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

const MOMENT_FALLBACKS = [
  '汪，今天也有好好吃饭好好睡觉，就是有点想你们。',
  '小多利把玩具咬出了三个洞，等你们回来验收！',
  '阳光正好，小多利睡了个四脚朝天的午觉，满分！'
]

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

    if (silenceHours <= MOMENT_SILENCE_HOURS) return
    const recentPosts = await repositories.posts.listByRoom(room.id, 5)
    const lastPetPostAt = recentPosts.find((post) => post.authorType === 'pet')?.createdAt
    const petPostIdleHours = lastPetPostAt
      ? (nowMs - lastPetPostAt.getTime()) / 3_600_000
      : Number.POSITIVE_INFINITY
    if (petPostIdleHours <= PET_POST_GUARD_HOURS) return
    const memories = await repositories.memories.listByRoom(room.id)
    const composed = await ai.composeMomentPost?.({
      trigger: 'silence',
      moodLine: moodContext?.state.toneHint,
      silenceHours,
      memories: memories.map((memory) => memory.text)
    })
    const text = composed ?? pick(MOMENT_FALLBACKS)
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
