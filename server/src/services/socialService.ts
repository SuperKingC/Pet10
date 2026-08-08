import type { ChatMessage, FortuneContent, Pet, PetAction, User } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import type { AiService } from './aiService.js'

export interface Conversation {
  roomId: string
  type: 'pair' | 'pet_dm'
  title: string
  avatarUrl: string | null
  proactiveEnabled: boolean
  friend?: User
  latestMessage?: ChatMessage
  updatedAt: string
}

interface SocialServiceDependencies {
  repositories: RepositoryBundle
  ai: AiService
  emit: (roomId: string, event: string, payload: unknown) => void
  emitUser?: (userId: string, event: string, payload: unknown) => void
  onMoodSet?: (roomId: string, userId: string, level: number) => void
  /** 新通知产生后的钩子（Web Push 唤醒） */
  onNotify?: (userId: string) => void
}

const PET_AVATAR = '/pet/xiaoduoli-small.jpg'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function hashCode(text: string): number {
  let hash = 5381
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0
  }
  return hash
}

const ZODIACS: Array<{ name: string; from: [number, number]; to: [number, number] }> = [
  { name: '摩羯座', from: [12, 22], to: [1, 19] },
  { name: '水瓶座', from: [1, 20], to: [2, 18] },
  { name: '双鱼座', from: [2, 19], to: [3, 20] },
  { name: '白羊座', from: [3, 21], to: [4, 19] },
  { name: '金牛座', from: [4, 20], to: [5, 20] },
  { name: '双子座', from: [5, 21], to: [6, 21] },
  { name: '巨蟹座', from: [6, 22], to: [7, 22] },
  { name: '狮子座', from: [7, 23], to: [8, 22] },
  { name: '处女座', from: [8, 23], to: [9, 22] },
  { name: '天秤座', from: [9, 23], to: [10, 23] },
  { name: '天蝎座', from: [10, 24], to: [11, 22] },
  { name: '射手座', from: [11, 23], to: [12, 21] }
]

export function zodiacFromBirthday(birthday: string | null | undefined): string | null {
  if (!birthday) return null
  const date = new Date(birthday)
  if (Number.isNaN(date.getTime())) return null
  const month = date.getMonth() + 1
  const day = date.getDate()
  for (const zodiac of ZODIACS) {
    const [fm, fd] = zodiac.from
    const [tm, td] = zodiac.to
    const inRange = fm === tm
      ? month === fm && day >= fd && day <= td
      : (month === fm && day >= fd) || (month === tm && day <= td)
    if (inRange) return zodiac.name
  }
  return null
}

// 每日暗号题库：按 roomId+日期 哈希轮换，纯文字零资源
const CODEWORD_QUESTIONS = [
  '如果现在能瞬间移动到任何地方，你想去哪？',
  '今天最想吃到的一样东西是什么？',
  '用一种天气形容你现在的心情？',
  '如果小多利会说人类的语言，你最想问它什么？',
  '最近让你忍不住笑出来的一件事？',
  '如果明天不用早起，你第一件想做的事？',
  '选一个词形容我们俩的默契？',
  '小时候最宝贝的一件东西是什么？',
  '如果可以给小多利设计一个新造型，你会怎么设计？',
  '现在手机里最舍不得删的一张照片是什么内容？',
  '如果今晚一起看一部电影，你选哪部？',
  '用一个食物形容我们的友谊？',
  '你最近单曲循环的一首歌？',
  '如果有一天的超能力，你想要什么能力？',
  '说一个只有我们俩才懂的梗？',
  '你理想中的周末是什么样的？',
  '如果小多利要去旅行，你想让它帮你带回什么？',
  '最近一次觉得很治愈的瞬间？',
  '如果家里可以添一件东西，你会买什么？',
  '用一个动物形容对方在你心里的形象？',
  '如果可以回到过去的某一天，你想回到哪一天？',
  '今天有没有一个小确幸想分享？',
  '如果我们的故事要拍成电影，片名叫什么？',
  '你心中完美的下午茶组合是什么？',
  '如果可以给十年后的我们寄一句话，你会写什么？',
  '最近学会的一个新技能或冷知识？',
  '如果小多利过生日，你想给它准备什么礼物？',
  '用一个颜色形容今天？'
]

function pickCodewordQuestion(roomId: string, day: string) {
  return CODEWORD_QUESTIONS[hashCode(`${roomId}:${day}`) % CODEWORD_QUESTIONS.length]
}

// 运势兜底模板（AI 不可用时确定性生成，零 AI 腔）
const MINE_TEMPLATES = [
  '今天的直觉很准，想做的事就放手去试。',
  '适合把拖了很久的小事收尾，成就感会悄悄涌上来。',
  '今天贵人在身边，一句随口的聊天可能带来好消息。',
  '节奏慢一点也没关系，今天是蓄力的一天。',
  '表达运上扬，想说的话今天说最合适。'
]
const FRIEND_TEMPLATES = [
  'TA 今天需要被肯定，夸 TA 一句会有奇效。',
  'TA 的财运小有起色，适合一起规划小目标。',
  'TA 今天有点感性，多给一点耐心。',
  'TA 的行动力在线，拉着 TA 一起做点什么吧。',
  'TA 今天桃花色是暖色系，心情会被阳光点亮。'
]
const PAIR_TEMPLATES = [
  '你们俩今天的默契值拉满，一个眼神就能对上暗号。',
  '今天适合一起做一件重复的小事，幸福感会翻倍。',
  '小多利嗅到了好运的味道，今天你们做什么都顺一点点。',
  '今天你们之间的玩笑话会格外好笑，记得留个纪念。',
  '星象说：今天谁先说晚安，谁就输了。'
]
const LUCKY_COLORS = ['奶油黄', '雾霾蓝', '蜜桃粉', '薄荷绿', '焦糖棕', '薰衣草紫', '云朵白', '落日橙']

// 点亮足迹地图时小多利的庆祝碎碎念
const MAP_CELEBRATIONS = [
  '汪！地图上又多了一个亮晶晶的爪印，是我们一起走过的地方！',
  '呜哇，这个点亮了！下次我们真的去那里玩好不好？',
  '盖了个爪印！小多利的足迹地图又变大了一点点。',
  '亮啦亮啦！我要把这里记在我的小本本上。',
  '汪呜～这里也属于我们了，尾巴已经摇起来了！'
]

function fallbackFortune(names: [string, string], pet: Pet, day: string): FortuneContent {
  const seed = hashCode(`${names[0]}|${names[1]}|${pet.id}|${day}`)
  const actions: PetAction[] = ['feed', 'play', 'clean', 'sleep']
  return {
    mine: MINE_TEMPLATES[seed % MINE_TEMPLATES.length],
    friend: FRIEND_TEMPLATES[(seed >> 3) % FRIEND_TEMPLATES.length],
    pair: PAIR_TEMPLATES[(seed >> 5) % PAIR_TEMPLATES.length],
    luckyAction: actions[(seed >> 7) % actions.length],
    luckyColor: LUCKY_COLORS[(seed >> 9) % LUCKY_COLORS.length],
    luckyNumber: (seed % 99) + 1
  }
}

export function createSocialService({ repositories, ai, emit, emitUser = () => undefined, onMoodSet = () => undefined, onNotify = () => undefined }: SocialServiceDependencies) {
  async function assertMember(roomId: string, userId: string) {
    if (!(await repositories.rooms.isMember(roomId, userId))) throw new Error('room_forbidden')
  }

  async function getOwners(roomId: string): Promise<User[]> {
    const room = await repositories.rooms.findById(roomId)
    if (!room?.relationshipId) return []
    const relationship = await repositories.relationships.findById(room.relationshipId)
    if (!relationship) return []
    const [first, second] = await Promise.all([
      repositories.users.findById(relationship.requesterId),
      repositories.users.findById(relationship.addresseeId)
    ])
    return [first, second].filter((user): user is User => Boolean(user))
  }

  async function notify(userId: string, type: string, payload: Record<string, unknown>) {
    const notification = await repositories.notifications.create(userId, type, payload)
    emitUser(userId, 'notification.new', notification)
    onNotify(userId)
    return notification
  }

  return {
    /** 会话列表：小多利私聊置顶，pair 房间按最新消息排序 */
    async listConversations(userId: string): Promise<Conversation[]> {
      const petDm = await repositories.rooms.createPetDm(userId)
      const rooms = await repositories.rooms.listForUser(userId)
      const conversations: Conversation[] = []
      for (const room of rooms) {
        const latest = (await repositories.messages.listRecent(room.id, 1))[0]
        if (room.type === 'pet_dm') {
          conversations.push({
            roomId: room.id,
            type: 'pet_dm',
            title: '小多利',
            avatarUrl: PET_AVATAR,
            proactiveEnabled: room.proactiveEnabled,
            latestMessage: latest,
            updatedAt: latest?.createdAt.toISOString() ?? room.createdAt.toISOString()
          })
          continue
        }
        const owners = await getOwners(room.id)
        const friend = owners.find((owner) => owner.id !== userId)
        const me = owners.find((owner) => owner.id === userId)
        conversations.push({
          roomId: room.id,
          type: 'pair',
          title: me && friend ? `${me.displayName} × ${friend.displayName}` : friend?.displayName ?? '好友',
          avatarUrl: friend?.avatarUrl ?? null,
          proactiveEnabled: room.proactiveEnabled,
          friend,
          latestMessage: latest,
          updatedAt: latest?.createdAt.toISOString() ?? room.createdAt.toISOString()
        })
      }
      void petDm
      return conversations.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'pet_dm' ? -1 : 1
        return b.updatedAt.localeCompare(a.updatedAt)
      })
    },

    async setProactive(roomId: string, userId: string, enabled: boolean) {
      await assertMember(roomId, userId)
      return repositories.rooms.setProactive(roomId, enabled)
    },

    // ---------- 心情 ----------
    async setMood(roomId: string, userId: string, level: number) {
      await assertMember(roomId, userId)
      if (![1, 2, 3, 4].includes(level)) throw new Error('invalid_mood_level')
      const entry = await repositories.moods.upsert(roomId, userId, todayKey(), level)
      emit(roomId, 'mood.updated', entry)
      onMoodSet(roomId, userId, level)
      return entry
    },

    async listMoods(roomId: string, userId: string, fromDay: string, toDay: string) {
      await assertMember(roomId, userId)
      return repositories.moods.listForRange(roomId, fromDay, toDay)
    },

    // ---------- 动态（小多利圈） ----------
    async listPosts(roomId: string, userId: string, limit = 50) {
      await assertMember(roomId, userId)
      const posts = await repositories.posts.listByRoom(roomId, limit)
      return Promise.all(posts.map(async (post) => ({
        ...post,
        likes: await repositories.posts.likeStats(post.id, userId)
      })))
    },

    async createPost(roomId: string, userId: string, input: { text: string; imageUrl?: string }) {
      await assertMember(roomId, userId)
      if (!input.text.trim() && !input.imageUrl) throw new Error('invalid_post')
      const post = await repositories.posts.create({
        roomId,
        authorType: 'user',
        authorId: userId,
        text: input.text.trim().slice(0, 500),
        imageUrl: input.imageUrl
      })
      emit(roomId, 'post.new', post)
      return post
    },

    async toggleLike(postId: string, userId: string, liked: boolean) {
      if (liked) await repositories.posts.like(postId, userId)
      else await repositories.posts.unlike(postId, userId)
      return repositories.posts.likeStats(postId, userId)
    },

    // ---------- 通知 ----------
    async listNotifications(userId: string, limit = 50) {
      const items = await repositories.notifications.list(userId, limit)
      const unread = await repositories.notifications.unreadCount(userId)
      return { items, unread }
    },

    async markAllNotificationsRead(userId: string) {
      await repositories.notifications.markAllRead(userId)
      return { unread: 0 }
    },

    notify,

    // ---------- 今日运势 ----------
    async getTodayFortune(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      const day = todayKey()
      const existing = await repositories.fortunes.findByRoomAndDay(roomId, day)
      if (existing) return existing
      const owners = await getOwners(roomId)
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')
      const names: [string, string] = [owners[0]?.displayName ?? '主人A', owners[1]?.displayName ?? '主人B']
      const zodiacs: [string | null, string | null] = [
        zodiacFromBirthday(owners[0]?.birthday),
        zodiacFromBirthday(owners[1]?.birthday)
      ]
      const moods = await repositories.moods.listForRange(roomId, day, day)
      const labels = ['低落', '一般', '好', '特别好']
      const moodsText = moods.map((entry) => {
        const owner = owners.find((candidate) => candidate.id === entry.userId)
        return `${owner?.displayName ?? '主人'}心情${labels[entry.level - 1] ?? ''}`
      }).join('；') || undefined
      const content = (await ai.fortune({ ownerNames: names, zodiacs, moodsText, pet })) ?? fallbackFortune(names, pet, day)
      return repositories.fortunes.create(roomId, day, content)
    },

    // ---------- 每日暗号 ----------
    async getCodeword(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      const day = todayKey()
      const question = pickCodewordQuestion(roomId, day)
      const answers = await repositories.codewords.listForDay(roomId, day)
      const mine = answers.find((answer) => answer.userId === userId)
      const partner = answers.find((answer) => answer.userId !== userId)
      return {
        day,
        question,
        myAnswer: mine?.answer ?? null,
        // 双方都答完才互见对方答案
        partnerAnswer: mine && partner ? partner.answer : null,
        answeredCount: answers.length
      }
    },

    async answerCodeword(roomId: string, userId: string, answer: string) {
      await assertMember(roomId, userId)
      const trimmed = answer.trim()
      if (!trimmed) throw new Error('invalid_answer')
      const day = todayKey()
      await repositories.codewords.setAnswer(roomId, day, userId, trimmed.slice(0, 200))
      const result = await this.getCodeword(roomId, userId)
      emit(roomId, 'codeword.updated', { roomId, day, answeredCount: result.answeredCount })
      return result
    },

    // ---------- 足迹地图 ----------
    async listMapLights(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      return repositories.map.listByRoom(roomId)
    },

    /** 点亮一个地图点位（一人点亮即全房生效） */
    async lightMapSpot(roomId: string, userId: string, spotId: number) {
      await assertMember(roomId, userId)
      if (!Number.isInteger(spotId) || spotId < 1 || spotId > 16) throw new Error('invalid_spot')
      const light = await repositories.map.light(roomId, spotId, userId)
      emit(roomId, 'map.lit', { roomId, spotId, litBy: userId, createdAt: light.createdAt.toISOString() })
      const owners = await getOwners(roomId)
      for (const owner of owners) {
        if (owner.id === userId) continue
        void notify(owner.id, 'map_lit', { roomId, spotId, litBy: userId })
      }
      if (Math.random() < 0.6) {
        const cheer = MAP_CELEBRATIONS[Math.floor(Math.random() * MAP_CELEBRATIONS.length)]
        const message = await repositories.messages.create({ roomId, senderType: 'pet', kind: 'pet', text: cheer })
        emit(roomId, 'message.created', message)
      }
      return light
    }
  }
}

export type SocialService = ReturnType<typeof createSocialService>
