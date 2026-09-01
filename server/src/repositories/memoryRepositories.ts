import { randomUUID, randomInt } from 'node:crypto'
import type {
  Anniversary,
  AppNotification,
  ChatMessage,
  CodewordAnswer,
  DiaryEntry,
  Fortune,
  InviteCode,
  Invitation,
  MoodEntry,
  NestTaskProgress,
  OutfitMatchPick,
  OutfitMatchStreak,
  Pet,
  PetEventStat,
  PetMemory,
  PetTask,
  PhotoWallPost,
  Post,
  Relationship,
  Room,
  User,
  WardrobeState,
  WechatIdentity
} from '../domain/models.js'
import type {
  OutfitMatchRepository,
  PhotoWallRepository,
  RepositoryBundle,
  InventoryRepository,
  NestTaskProgressRepository,
  WardrobeRepository
} from './contracts.js'

const PHOTO_WALL_LIST_LIMIT = 60

function nowFrom(options: { now?: () => Date }) {
  return options.now?.() ?? new Date()
}

export function createMemoryRepositories(options: { now?: () => Date } = {}): RepositoryBundle {
  const now = () => nowFrom(options)
  const users = new Map<string, User>()
  const inviteCodes = new Map<string, InviteCode>([
    ['PET10-DEMO', { code: 'PET10-DEMO', active: true, maxUses: 10, useCount: 0 }]
  ])
  const wechatIdentities = new Map<string, WechatIdentity>()
  const invitations = new Map<string, Invitation>()
  const relationships = new Map<string, Relationship>()
  const rooms = new Map<string, Room>()
  const roomMembers = new Map<string, Set<string>>()
  const pets = new Map<string, Pet>()
  const messages = new Map<string, ChatMessage[]>()
  const memories = new Map<string, PetMemory[]>()
  const tasks = new Map<string, PetTask>()
  const nestTaskProgress = new Map<string, NestTaskProgress>()
  const inventories = new Map<string, Map<string, number>>()
  const pouchesGranted = new Set<string>()
  const moods = new Map<string, MoodEntry>()
  const anniversaries = new Map<string, Anniversary>()
  const diaries = new Map<string, DiaryEntry>()
  const diarySerial = new Map<string, number>()
  let diarySequence = 0
  const posts = new Map<string, Post>()
  const postLikes = new Map<string, Set<string>>()
  const notifications = new Map<string, AppNotification>()
  const fortunes = new Map<string, Fortune>()
  const codewords = new Map<string, CodewordAnswer>()
  const petEvents = new Map<string, { petId: string; userId: string; action: string; at: Date }[]>()
  const pushSubscriptions = new Map<string, { userId: string; endpoint: string; p256dh: string; auth: string }>()
  const mapLights = new Map<string, { roomId: string; spotId: number; litBy: string; createdAt: Date }>()

  const PUBLIC_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  function makePublicCode() {
    let code = ''
    for (let index = 0; index < 8; index++) code += PUBLIC_CODE_ALPHABET[randomInt(PUBLIC_CODE_ALPHABET.length)]
    return code
  }

  let uidSequence = 0
  function nextUid() {
    uidSequence += 1
    return String(uidSequence).padStart(8, '0')
  }

  const userRepo = {
    async findById(id: string) { return users.get(id) },
    async findByEmail(email: string) { return [...users.values()].find((user) => user.email === email.toLowerCase()) },
    async findByUsername(username: string) { return [...users.values()].find((user) => user.username === username) },
    async findByPublicCode(code: string) { return [...users.values()].find((user) => user.publicCode === code.toUpperCase()) },
    async findByUid(uid: string) { return [...users.values()].find((user) => user.uid === uid.replace(/^0+/, '').padStart(8, '0')) },
    async listRecent(limit: number) {
      // uid 单调递增：创建时间同毫秒时按 uid 倒序兜底，保证「最新注册」顺序稳定
      return [...users.values()].sort((a, b) => (b.createdAt.getTime() - a.createdAt.getTime()) || (b.uid > a.uid ? 1 : -1)).slice(0, limit)
    },
    async create(input: Pick<User, 'email' | 'username' | 'displayName'>) {
      const user = { ...input, id: randomUUID(), email: input.email.toLowerCase(), uid: nextUid(), publicCode: makePublicCode(), gender: 'private' as const, createdAt: now() }
      users.set(user.id, user)
      return user
    },
    async updateUsername(id: string, username: string) {
      const user = users.get(id)
      if (!user) throw new Error('user_not_found')
      user.username = username
      return user
    },
    async updateProfile(id: string, patch: { avatarUrl?: string | null; avatarConfig?: string | null; displayName?: string | null; birthday?: string | null; mbti?: string | null; gender?: User['gender'] }) {
      const user = users.get(id)
      if (!user) throw new Error('user_not_found')
      if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl
      if (patch.avatarConfig !== undefined) user.avatarConfig = patch.avatarConfig
      if (patch.displayName !== undefined && patch.displayName) user.displayName = patch.displayName
      if (patch.birthday !== undefined) user.birthday = patch.birthday
      if (patch.mbti !== undefined) user.mbti = patch.mbti
      if (patch.gender !== undefined) user.gender = patch.gender
      return user
    },
    async deleteById(id: string) { users.delete(id) }
  }

  const inviteRepo = {
    async findByCode(code: string) { return inviteCodes.get(code.toUpperCase()) },
    async consume(code: string) {
      const invite = inviteCodes.get(code.toUpperCase())
      if (!invite) throw new Error('invalid_invite_code')
      invite.useCount += 1
    }
  }

  const wechatIdentityRepo = {
    async findByOpenId(openId: string) {
      return wechatIdentities.get(openId)
    },
    async findByUserId(userId: string) {
      return [...wechatIdentities.values()].find((identity) => identity.userId === userId)
    },
    async create(input: Pick<WechatIdentity, 'userId' | 'openId' | 'unionId'>) {
      if (wechatIdentities.has(input.openId)) throw new Error('wechat_identity_already_exists')
      const existingUserIdentity = [...wechatIdentities.values()].find((identity) => identity.userId === input.userId)
      if (existingUserIdentity) throw new Error('wechat_identity_already_exists')
      const timestamp = now()
      const identity: WechatIdentity = {
        id: randomUUID(),
        userId: input.userId,
        openId: input.openId,
        unionId: input.unionId ?? null,
        createdAt: timestamp,
        updatedAt: timestamp
      }
      wechatIdentities.set(identity.openId, identity)
      return identity
    }
  }

  const invitationRepo = {
    async create(input: Pick<Invitation, 'token' | 'inviterId' | 'expiresAt'>) {
      const invitation: Invitation = {
        id: randomUUID(),
        token: input.token,
        inviterId: input.inviterId,
        status: 'pending',
        expiresAt: input.expiresAt,
        acceptedBy: null,
        createdAt: now(),
        acceptedAt: null
      }
      invitations.set(invitation.token, invitation)
      return invitation
    },
    async findByToken(token: string) {
      return invitations.get(token)
    },
    async accept(token: string, accepterId: string) {
      const invitation = invitations.get(token)
      if (!invitation) throw new Error('invitation_not_found')
      invitation.status = 'accepted'
      invitation.acceptedBy = accepterId
      invitation.acceptedAt = now()
      return invitation
    },
    async acceptPair(token: string, accepterId: string, options?: { createPet?: boolean }) {
      const invitation = invitations.get(token)
      if (!invitation || invitation.status !== 'pending') throw new Error('invitation_unavailable')
      invitation.status = 'accepted'
      invitation.acceptedBy = accepterId
      invitation.acceptedAt = now()
      const relationship = await relationshipRepo.create(invitation.inviterId, accepterId)
      relationship.status = 'accepted'
      const room = await roomRepo.createForRelationship(relationship.id)
      const pet = options?.createPet === false
        ? null
        : await petRepo.createForRelationship(relationship.id, room.id)
      return { invitation, relationship, room, pet }
    },
    async decline(token: string, userId: string) {
      const invitation = invitations.get(token)
      if (!invitation || invitation.inviterId === userId) throw new Error('invitation_not_found')
      invitation.status = 'declined'
      return invitation
    }
  }

  const relationshipRepo = {
    async findActiveForUser(userId: string) {
      return [...relationships.values()].find((item) => item.status !== 'rejected' && (item.requesterId === userId || item.addresseeId === userId))
    },
    async listAcceptedForUser(userId: string) {
      return [...relationships.values()]
        .filter((item) => item.status === 'accepted' && (item.requesterId === userId || item.addresseeId === userId))
        .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
    },
    async findBetweenUsers(firstUserId: string, secondUserId: string) {
      return [...relationships.values()].find((item) =>
        [item.requesterId, item.addresseeId].includes(firstUserId) &&
        [item.requesterId, item.addresseeId].includes(secondUserId) &&
        item.status !== 'rejected'
      )
    },
    async findById(id: string) { return relationships.get(id) },
    async create(requesterId: string, addresseeId: string) {
      const item: Relationship = { id: randomUUID(), requesterId, addresseeId, status: 'pending', createdAt: now() }
      relationships.set(item.id, item)
      return item
    },
    async accept(id: string) {
      const item = relationships.get(id)
      if (!item) throw new Error('relationship_not_found')
      item.status = 'accepted'
      return item
    },
    async removeById(id: string) {
      relationships.delete(id)
    },
    async listPendingForUser(userId: string) {
      return [...relationships.values()].filter((item) =>
        item.status === 'pending' && (item.requesterId === userId || item.addresseeId === userId)
      )
    }
  }

  const roomRepo = {
    async createForRelationship(relationshipId: string) {
      const existing = [...rooms.values()].find((room) => room.relationshipId === relationshipId)
      if (existing) return existing
      const room: Room = { id: randomUUID(), relationshipId, type: 'pair', proactiveEnabled: true, createdAt: now() }
      rooms.set(room.id, room)
      const relationship = relationships.get(relationshipId)
      if (relationship) roomMembers.set(room.id, new Set([relationship.requesterId, relationship.addresseeId]))
      return room
    },
    async createPetDm(userId: string) {
      const existing = [...rooms.values()].find((room) => room.type === 'pet_dm' && roomMembers.get(room.id)?.has(userId))
      if (existing) return existing
      const room: Room = { id: randomUUID(), relationshipId: null, type: 'pet_dm', proactiveEnabled: true, createdAt: now() }
      rooms.set(room.id, room)
      roomMembers.set(room.id, new Set([userId]))
      return room
    },
    async findById(id: string) { return rooms.get(id) },
    async findByRelationshipId(relationshipId: string) { return [...rooms.values()].find((room) => room.relationshipId === relationshipId) },
    async listAll() { return [...rooms.values()] },
    async listForUser(userId: string) {
      return [...rooms.values()].filter((room) => roomMembers.get(room.id)?.has(userId))
    },
    async isMember(roomId: string, userId: string) { return roomMembers.get(roomId)?.has(userId) ?? false },
    async setProactive(roomId: string, enabled: boolean) {
      const room = rooms.get(roomId)
      if (!room) throw new Error('room_not_found')
      room.proactiveEnabled = enabled
      return room
    }
  }

  const petRepo = {
    async createForRelationship(relationshipId: string, roomId: string) {
      const pet: Pet = {
        id: randomUUID(), relationshipId, roomId, name: '小多利', level: 1,
        experience: 0, experienceToNextLevel: 100, hunger: 80, mood: 80,
        energy: 80, health: 100, intimacy: 10, updatedAt: now()
      }
      pets.set(roomId, pet)
      return pet
    },
    async findByRoomId(roomId: string) { return pets.get(roomId) },
    async update(pet: Pet) { pet.updatedAt = now(); pets.set(pet.roomId, pet); return pet }
  }

  const messageRepo = {
    async listRecent(roomId: string, limit: number) { return (messages.get(roomId) ?? []).slice(-limit) },
    async create(input: Omit<ChatMessage, 'id' | 'createdAt'>) {
      const item: ChatMessage = { ...input, id: randomUUID(), createdAt: now() }
      messages.set(item.roomId, [...(messages.get(item.roomId) ?? []), item])
      return item
    }
  }

  const memoryRepo = {
    async listByRoom(roomId: string) { return memories.get(roomId) ?? [] },
    async create(input: { roomId: string; text: string; sourceMessageId?: string; canMention?: boolean; category?: PetMemory['category']; importance?: PetMemory['importance']; source?: PetMemory['source'] }) {
      const timestamp = now()
      const item: PetMemory = {
        id: randomUUID(),
        roomId: input.roomId,
        text: input.text,
        sourceMessageId: input.sourceMessageId,
        canMention: input.canMention ?? true,
        category: input.category ?? 'other',
        importance: input.importance ?? 1,
        source: input.source ?? 'inferred',
        createdAt: timestamp,
        updatedAt: timestamp
      }
      memories.set(input.roomId, [item, ...(memories.get(input.roomId) ?? [])])
      return item
    },
    async deleteById(roomId: string, memoryId: string) {
      memories.set(roomId, (memories.get(roomId) ?? []).filter((memory) => memory.id !== memoryId))
    }
  }

  const taskRepo = {
    async create(input: Pick<PetTask, 'roomId' | 'userId' | 'content' | 'scheduleType' | 'nextRunAt'>) {
      const timestamp = now()
      const task: PetTask = {
        ...input,
        id: randomUUID(),
        status: 'pending',
        createdAt: timestamp,
        updatedAt: timestamp
      }
      tasks.set(task.id, task)
      return task
    },
    async claimDue(currentTime: Date, limit: number) {
      const due = [...tasks.values()]
        .filter((task) => task.status === 'pending' && task.nextRunAt <= currentTime)
        .sort((first, second) => first.nextRunAt.getTime() - second.nextRunAt.getTime())
        .slice(0, limit)
      for (const task of due) {
        task.status = 'processing'
        task.updatedAt = now()
      }
      return due
    },
    async complete(id: string) {
      const task = tasks.get(id)
      if (!task) return
      task.status = 'completed'
      task.updatedAt = now()
    },
    async reschedule(id: string, nextRunAt: Date) {
      const task = tasks.get(id)
      if (!task) return
      task.status = 'pending'
      task.nextRunAt = nextRunAt
      task.updatedAt = now()
    },
    async fail(id: string) {
      const task = tasks.get(id)
      if (!task) return
      task.status = 'failed'
      task.updatedAt = now()
    },
    async listPendingByRoom(roomId: string) {
      return [...tasks.values()]
        .filter((task) => task.roomId === roomId && task.status === 'pending')
        .sort((first, second) => first.nextRunAt.getTime() - second.nextRunAt.getTime())
    },
    async cancelById(id: string) {
      const task = tasks.get(id)
      if (!task || task.status !== 'pending') return
      task.status = 'cancelled'
      task.updatedAt = now()
    }
  }

  const nestTaskProgressRepo: NestTaskProgressRepository = {
    async listByRoom(roomId) {
      return [...nestTaskProgress.values()].filter((row) => row.roomId === roomId)
    },
    async findByKey(roomId, taskKey) {
      const row = [...nestTaskProgress.values()].find((item) => item.roomId === roomId && item.taskKey === taskKey)
      return row
    },
    async addProgress(roomId, taskKey, delta) {
      const existing = await this.findByKey(roomId, taskKey)
      if (existing) {
        existing.progress += delta
        existing.updatedAt = now()
        return existing
      }
      const row: NestTaskProgress = {
        id: randomUUID(), roomId, taskKey, periodKey: '', progress: delta, claimed: false, claimedBy: null, updatedAt: now()
      }
      nestTaskProgress.set(row.id, row)
      return row
    },
    async setDailyProgress(roomId, taskKey, periodKey, progress) {
      const existing = await this.findByKey(roomId, taskKey)
      // 周期已过期则重置计数（每天从 0 重新累计）
      if (existing && existing.periodKey !== periodKey) {
        existing.periodKey = periodKey
        existing.progress = 0
        existing.claimed = false
        existing.claimedBy = null
      }
      if (existing) {
        existing.progress = Math.max(existing.progress, progress)
        existing.updatedAt = now()
        return existing
      }
      const row: NestTaskProgress = {
        id: randomUUID(), roomId, taskKey, periodKey, progress, claimed: false, claimedBy: null, updatedAt: now()
      }
      nestTaskProgress.set(row.id, row)
      return row
    },
    async markClaimed(roomId, taskKey, userId) {
      const row = await this.findByKey(roomId, taskKey)
      if (!row) return undefined
      row.claimed = true
      row.claimedBy = userId
      row.updatedAt = now()
      return row
    }
  }

  function inventoryOf(roomId: string) {
    let items = inventories.get(roomId)
    if (!items) {
      items = new Map()
      inventories.set(roomId, items)
    }
    return items
  }

  const inventoryRepo: InventoryRepository = {
    async listByRoom(roomId) {
      return [...inventoryOf(roomId).entries()].map(([itemId, count]) => ({ roomId, itemId, count }))
    },
    async consume(roomId, itemId) {
      const items = inventoryOf(roomId)
      const current = items.get(itemId) ?? 0
      if (current <= 0) return false
      items.set(itemId, current - 1)
      return true
    },
    async add(roomId, itemId, count) {
      const items = inventoryOf(roomId)
      items.set(itemId, (items.get(itemId) ?? 0) + count)
    },
    async addBatch(roomId, entries) {
      for (const entry of entries) await inventoryRepo.add(roomId, entry.itemId, entry.count)
    },
    async grantStarterPouchOnce(roomId, entries) {
      if (pouchesGranted.has(roomId)) return false
      pouchesGranted.add(roomId)
      await inventoryRepo.addBatch(roomId, entries)
      return true
    }
  }

  const moodRepo = {
    async upsert(roomId: string, userId: string, day: string, level: number) {
      const key = `${roomId}:${userId}:${day}`
      const existing = moods.get(key)
      const entry: MoodEntry = existing
        ? { ...existing, level, updatedAt: now() }
        : { id: randomUUID(), roomId, userId, day, level, updatedAt: now() }
      moods.set(key, entry)
      return entry
    },
    async listForRange(roomId: string, fromDay: string, toDay: string) {
      return [...moods.values()].filter((mood) => mood.roomId === roomId && mood.day >= fromDay && mood.day <= toDay)
    }
  }

  const anniversaryRepo = {
    async create(input: Pick<Anniversary, 'roomId' | 'userId' | 'name' | 'icon' | 'note' | 'day' | 'repeatRule' | 'photo'>) {
      const item: Anniversary = { id: randomUUID(), ...input, createdAt: now(), updatedAt: now() }
      anniversaries.set(item.id, item)
      return item
    },
    async update(id: string, patch: { name?: string; icon?: string; note?: string; repeatRule?: Anniversary['repeatRule']; photo?: string | null }) {
      const item = anniversaries.get(id)
      if (!item) return undefined
      const updated: Anniversary = {
        ...item,
        name: patch.name ?? item.name,
        icon: patch.icon ?? item.icon,
        note: patch.note ?? item.note,
        repeatRule: patch.repeatRule ?? item.repeatRule,
        photo: patch.photo === undefined ? item.photo : patch.photo,
        updatedAt: now()
      }
      anniversaries.set(id, updated)
      return updated
    },
    async deleteById(roomId: string, id: string) {
      const item = anniversaries.get(id)
      if (item?.roomId === roomId) anniversaries.delete(id)
    },
    async listByRoom(roomId: string) {
      return [...anniversaries.values()]
        .filter((item) => item.roomId === roomId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }
  }

  const diaryRepo = {
    async create(input: Pick<DiaryEntry, 'userId' | 'day' | 'title' | 'body' | 'location' | 'photos'>) {
      const item: DiaryEntry = { ...input, id: randomUUID(), liked: false, createdAt: now(), updatedAt: now() }
      diarySerial.set(item.id, diarySequence++)
      diaries.set(item.id, item)
      return item
    },
    async update(id: string, patch: { title?: string; body?: string; location?: string; photos?: string[] }) {
      const item = diaries.get(id)
      if (!item) return undefined
      const updated: DiaryEntry = {
        ...item,
        title: patch.title ?? item.title,
        body: patch.body ?? item.body,
        location: patch.location ?? item.location,
        photos: patch.photos ?? item.photos,
        updatedAt: now()
      }
      diaries.set(id, updated)
      return updated
    },
    async setLiked(id: string, liked: boolean) {
      const item = diaries.get(id)
      if (!item) return undefined
      const updated: DiaryEntry = { ...item, liked, updatedAt: now() }
      diaries.set(id, updated)
      return updated
    },
    async deleteById(userId: string, id: string) {
      const item = diaries.get(id)
      if (item?.userId === userId) diaries.delete(id)
    },
    async findById(id: string) {
      return diaries.get(id)
    },
    async listForUser(userId: string, fromDay: string, toDay: string) {
      return [...diaries.values()]
        .filter((item) => item.userId === userId && item.day >= fromDay && item.day <= toDay)
        .sort((a, b) => (b.day === a.day
          ? (diarySerial.get(b.id) ?? 0) - (diarySerial.get(a.id) ?? 0)
          : b.day.localeCompare(a.day)))
    }
  }

  const postRepo = {
    async create(input: Omit<Post, 'id' | 'createdAt'>) {
      const post: Post = { ...input, id: randomUUID(), createdAt: now() }
      posts.set(post.id, post)
      return post
    },
    async createAsPet(roomId: string, text: string, imageUrl?: string) {
      const post: Post = { id: randomUUID(), roomId, authorType: 'pet', authorId: null, text, imageUrl: imageUrl ?? null, createdAt: now() }
      posts.set(post.id, post)
      return post
    },
    async listByRoom(roomId: string, limit: number) {
      return [...posts.values()].filter((post) => post.roomId === roomId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
    },
    async like(postId: string, userId: string) {
      const likes = postLikes.get(postId) ?? new Set<string>()
      likes.add(userId)
      postLikes.set(postId, likes)
    },
    async unlike(postId: string, userId: string) {
      postLikes.get(postId)?.delete(userId)
    },
    async likeStats(postId: string, userId: string) {
      const likes = postLikes.get(postId)
      return { count: likes?.size ?? 0, likedByMe: likes?.has(userId) ?? false }
    }
  }

  const notificationRepo = {
    async create(userId: string, type: string, payload: Record<string, unknown>) {
      const item: AppNotification = { id: randomUUID(), userId, type, payload, read: false, createdAt: now() }
      notifications.set(item.id, item)
      return item
    },
    async list(userId: string, limit: number) {
      return [...notifications.values()].filter((item) => item.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
    },
    async unreadCount(userId: string) {
      return [...notifications.values()].filter((item) => item.userId === userId && !item.read).length
    },
    async markAllRead(userId: string) {
      for (const item of notifications.values()) if (item.userId === userId) item.read = true
    }
  }

  const fortuneRepo = {
    async findByUserAndDay(userId: string, day: string) {
      return fortunes.get(`${userId}:${day}`)
    },
    async createForUser(userId: string, day: string, content: Fortune['content']) {
      const fortune: Fortune = { id: randomUUID(), userId, day, content, createdAt: now() }
      fortunes.set(`${userId}:${day}`, fortune)
      return fortune
    }
  }

  const codewordRepo = {
    async getAnswer(roomId: string, day: string, userId: string) {
      return codewords.get(`${roomId}:${day}:${userId}`)
    },
    async setAnswer(roomId: string, day: string, userId: string, answer: string) {
      const item: CodewordAnswer = { roomId, day, userId, answer, createdAt: now() }
      codewords.set(`${roomId}:${day}:${userId}`, item)
      return item
    },
    async listForDay(roomId: string, day: string) {
      return [...codewords.values()].filter((item) => item.roomId === roomId && item.day === day)
    }
  }

  const petEventRepo = {
    async record(petId: string, userId: string, action: string) {
      petEvents.set(petId, [...(petEvents.get(petId) ?? []), { petId, userId, action, at: now() }])
    },
    async statsByRoom(petId: string): Promise<PetEventStat[]> {
      const counts = new Map<string, PetEventStat>()
      for (const event of petEvents.get(petId) ?? []) {
        const key = `${event.userId}:${event.action}`
        const stat = counts.get(key) ?? { userId: event.userId, action: event.action, count: 0 }
        stat.count += 1
        counts.set(key, stat)
      }
      return [...counts.values()]
    },
    async lastAt(petId: string): Promise<Date | undefined> {
      let latest: Date | undefined
      for (const event of petEvents.get(petId) ?? []) {
        if (!latest || event.at.getTime() > latest.getTime()) latest = event.at
      }
      return latest
    }
  }

  const pushSubscriptionRepo = {
    async save(userId: string, endpoint: string, p256dh: string, auth: string) {
      pushSubscriptions.set(`${userId}:${endpoint}`, { userId, endpoint, p256dh, auth })
    },
    async listForUser(userId: string) {
      return [...pushSubscriptions.values()].filter((item) => item.userId === userId)
    },
    async deleteByEndpoint(userId: string, endpoint: string) {
      pushSubscriptions.delete(`${userId}:${endpoint}`)
    }
  }

  const mapRepo = {
    async listByRoom(roomId: string) {
      return [...mapLights.values()]
        .filter((item) => item.roomId === roomId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    },
    async light(roomId: string, spotId: number, userId: string) {
      const item = { roomId, spotId, litBy: userId, createdAt: now() }
      mapLights.set(`${roomId}:${spotId}`, item)
      return item
    }
  }

  const photoWallPosts = new Map<string, PhotoWallPost>()

  const photoWallRepo: PhotoWallRepository = {
    async listByRoom(roomId, limit = PHOTO_WALL_LIST_LIMIT) {
      return [...photoWallPosts.values()]
        .filter((item) => item.roomId === roomId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
    },
    async findById(roomId, photoId) {
      const item = photoWallPosts.get(photoId)
      return item && item.roomId === roomId ? item : undefined
    },
    async create(input) {
      const item: PhotoWallPost = { id: randomUUID(), ...input, createdAt: now() }
      photoWallPosts.set(item.id, item)
      return item
    },
    async updateCaption(roomId, photoId, caption) {
      const item = await this.findById(roomId, photoId)
      if (!item) return undefined
      item.caption = caption
      return item
    },
    async deleteById(roomId, photoId) {
      const item = photoWallPosts.get(photoId)
      if (item && item.roomId === roomId) photoWallPosts.delete(photoId)
    },
    async deleteOldestManual(roomId) {
      const oldest = [...photoWallPosts.values()]
        .filter((item) => item.roomId === roomId && item.origin === 'manual')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]
      if (!oldest) return false
      photoWallPosts.delete(oldest.id)
      return true
    },
    async countByRoom(roomId) {
      return [...photoWallPosts.values()].filter((item) => item.roomId === roomId).length
    }
  }

  const wardrobeStates = new Map<string, WardrobeState>()

  const wardrobeRepo: WardrobeRepository = {
    async getState(roomId) {
      return wardrobeStates.get(roomId) ?? { roomId, equipped: 'default', gmUnlockAll: false, updatedAt: now() }
    },
    async setEquipped(roomId, equipped) {
      const current = await wardrobeRepo.getState(roomId)
      const next: WardrobeState = { ...current, equipped, updatedAt: now() }
      wardrobeStates.set(roomId, next)
      return next
    },
    async setGmUnlockAll(roomId, enabled) {
      const current = await wardrobeRepo.getState(roomId)
      const next: WardrobeState = { ...current, gmUnlockAll: enabled, updatedAt: now() }
      wardrobeStates.set(roomId, next)
      return next
    }
  }

  const outfitMatchPicks = new Map<string, OutfitMatchPick>()
  const outfitMatchStreaks = new Map<string, OutfitMatchStreak>()

  const outfitMatchRepo: OutfitMatchRepository = {
    async setPick(roomId, day, userId, itemId) {
      const key = `${roomId}:${day}:${userId}`
      const existing = outfitMatchPicks.get(key)
      const pick: OutfitMatchPick = { roomId, day, userId, itemId, createdAt: existing?.createdAt ?? now() }
      outfitMatchPicks.set(key, pick)
      return pick
    },
    async listPicks(roomId, day) {
      return [...outfitMatchPicks.values()]
        .filter((item) => item.roomId === roomId && item.day === day)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    },
    async getStreak(roomId) {
      return outfitMatchStreaks.get(roomId) ?? { roomId, streak: 0, bestStreak: 0, lastMatchDay: null }
    },
    async markSettled(roomId, day, streak, bestStreak) {
      const existing = outfitMatchStreaks.get(roomId)
      if (existing && existing.lastMatchDay === day) return false
      const next: OutfitMatchStreak = { roomId, streak, bestStreak, lastMatchDay: day }
      outfitMatchStreaks.set(roomId, next)
      return true
    }
  }

  return {
    users: userRepo,
    invites: inviteRepo,
    wechatIdentities: wechatIdentityRepo,
    invitations: invitationRepo,
    relationships: relationshipRepo,
    rooms: roomRepo,
    pets: petRepo,
    messages: messageRepo,
    memories: memoryRepo,
    tasks: taskRepo,
    nestTaskProgress: nestTaskProgressRepo,
    inventory: inventoryRepo,
    moods: moodRepo,
    anniversaries: anniversaryRepo,
    diaries: diaryRepo,
    posts: postRepo,
    notifications: notificationRepo,
    fortunes: fortuneRepo,
    codewords: codewordRepo,
    petEvents: petEventRepo,
    pushSubscriptions: pushSubscriptionRepo,
    map: mapRepo,
    photoWall: photoWallRepo,
    wardrobe: wardrobeRepo,
    outfitMatch: outfitMatchRepo
  }
}
