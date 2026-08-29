import type { Anniversary, ChatMessage, User } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import type { AiService } from './aiService.js'
import { sortConversationsByLatest } from './conversationOrder.js'
import { createDailyFortune, isValidDailyFortuneContent, zodiacFromBirthday } from './dailyFortune.js'

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

const PET_AVATAR = '/pet/xiaoduoli.png'

function todayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function hashCode(text: string): number {
  let hash = 5381
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0
  }
  return hash
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

// 点亮足迹地图时小多利的庆祝碎碎念
const MAP_CELEBRATIONS = [
  '汪！地图上又多了一个亮晶晶的爪印，是我们一起走过的地方！',
  '呜哇，这个点亮了！下次我们真的去那里玩好不好？',
  '盖了个爪印！小多利的足迹地图又变大了一点点。',
  '亮啦亮啦！我要把这里记在我的小本本上。',
  '汪呜～这里也属于我们了，尾巴已经摇起来了！'
]

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
    /** 会话列表：所有会话按最新消息时间排序 */
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
      return sortConversationsByLatest(conversations)
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

    // ---------- 纪念日 ----------
    async listAnniversaries(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      return repositories.anniversaries.listByRoom(roomId)
    },

    async createAnniversary(
      roomId: string,
      userId: string,
      input: Pick<Anniversary, 'name' | 'icon' | 'note' | 'day' | 'repeatRule' | 'photo'>
    ) {
      await assertMember(roomId, userId)
      return repositories.anniversaries.create({ ...input, roomId, userId })
    },

    async updateAnniversary(
      roomId: string,
      userId: string,
      id: string,
      patch: { name?: string; icon?: string; note?: string; repeatRule?: Anniversary['repeatRule']; photo?: string | null }
    ) {
      await assertMember(roomId, userId)
      const updated = await repositories.anniversaries.update(id, patch)
      if (!updated) throw new Error('anniversary_not_found')
      return updated
    },

    async deleteAnniversary(roomId: string, userId: string, id: string) {
      await assertMember(roomId, userId)
      await repositories.anniversaries.deleteById(roomId, id)
      return { ok: true }
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
    async getTodayFortune(userId: string) {
      const day = todayKey()
      const existing = await repositories.fortunes.findByUserAndDay(userId, day)
      const user = await repositories.users.findById(userId)
      if (!user) throw new Error('user_not_found')
      const zodiac = zodiacFromBirthday(user.birthday)
      if (!zodiac) throw new Error('birthday_required')
      if (existing && isValidDailyFortuneContent(existing.content) && existing.content.zodiac === zodiac) return existing
      const content = createDailyFortune({ userId, birthday: user.birthday, day })
      return repositories.fortunes.createForUser(userId, day, content)
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
