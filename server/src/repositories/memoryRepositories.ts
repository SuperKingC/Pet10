import { randomUUID, randomInt } from 'node:crypto'
import type {
  AppNotification,
  ChatMessage,
  CodewordAnswer,
  Fortune,
  InviteCode,
  Invitation,
  LoginCode,
  MoodEntry,
  Pet,
  PetEventStat,
  PetMemory,
  PetTask,
  Post,
  Relationship,
  Room,
  User,
  WechatIdentity
} from '../domain/models.js'
import type { RepositoryBundle } from './contracts.js'

function now() {
  return new Date()
}

export function createMemoryRepositories(): RepositoryBundle {
  const users = new Map<string, User>()
  const inviteCodes = new Map<string, InviteCode>([
    ['PET10-DEMO', { code: 'PET10-DEMO', active: true, maxUses: 10, useCount: 0 }]
  ])
  const loginCodes = new Map<string, LoginCode>()
  const wechatIdentities = new Map<string, WechatIdentity>()
  const invitations = new Map<string, Invitation>()
  const relationships = new Map<string, Relationship>()
  const rooms = new Map<string, Room>()
  const roomMembers = new Map<string, Set<string>>()
  const pets = new Map<string, Pet>()
  const messages = new Map<string, ChatMessage[]>()
  const memories = new Map<string, PetMemory[]>()
  const tasks = new Map<string, PetTask>()
  const moods = new Map<string, MoodEntry>()
  const posts = new Map<string, Post>()
  const postLikes = new Map<string, Set<string>>()
  const notifications = new Map<string, AppNotification>()
  const fortunes = new Map<string, Fortune>()
  const codewords = new Map<string, CodewordAnswer>()
  const petEvents = new Map<string, { petId: string; userId: string; action: string }[]>()
  const pushSubscriptions = new Map<string, { userId: string; endpoint: string; p256dh: string; auth: string }>()
  const mapLights = new Map<string, { roomId: string; spotId: number; litBy: string; createdAt: Date }>()

  const PUBLIC_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  function makePublicCode() {
    let code = ''
    for (let index = 0; index < 8; index++) code += PUBLIC_CODE_ALPHABET[randomInt(PUBLIC_CODE_ALPHABET.length)]
    return code
  }

  const userRepo = {
    async findById(id: string) { return users.get(id) },
    async findByEmail(email: string) { return [...users.values()].find((user) => user.email === email.toLowerCase()) },
    async findByUsername(username: string) { return [...users.values()].find((user) => user.username === username) },
    async findByPublicCode(code: string) { return [...users.values()].find((user) => user.publicCode === code.toUpperCase()) },
    async create(input: Pick<User, 'email' | 'username' | 'displayName'>) {
      const user = { ...input, id: randomUUID(), email: input.email.toLowerCase(), publicCode: makePublicCode(), createdAt: now() }
      users.set(user.id, user)
      return user
    },
    async updateUsername(id: string, username: string) {
      const user = users.get(id)
      if (!user) throw new Error('user_not_found')
      user.username = username
      return user
    },
    async updateProfile(id: string, patch: { avatarUrl?: string | null; avatarConfig?: string | null; displayName?: string | null; birthday?: string | null; mbti?: string | null }) {
      const user = users.get(id)
      if (!user) throw new Error('user_not_found')
      if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl
      if (patch.avatarConfig !== undefined) user.avatarConfig = patch.avatarConfig
      if (patch.displayName !== undefined && patch.displayName) user.displayName = patch.displayName
      if (patch.birthday !== undefined) user.birthday = patch.birthday
      if (patch.mbti !== undefined) user.mbti = patch.mbti
      return user
    }
  }

  const inviteRepo = {
    async findByCode(code: string) { return inviteCodes.get(code.toUpperCase()) },
    async consume(code: string) {
      const invite = inviteCodes.get(code.toUpperCase())
      if (!invite) throw new Error('invalid_invite_code')
      invite.useCount += 1
    }
  }

  const loginCodeRepo = {
    async save(code: LoginCode) { loginCodes.set(code.email, code) },
    async findByEmail(email: string) { return loginCodes.get(email.toLowerCase()) },
    async deleteByEmail(email: string) { loginCodes.delete(email.toLowerCase()) }
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
      petEvents.set(petId, [...(petEvents.get(petId) ?? []), { petId, userId, action }])
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

  return {
    users: userRepo,
    invites: inviteRepo,
    loginCodes: loginCodeRepo,
    wechatIdentities: wechatIdentityRepo,
    invitations: invitationRepo,
    relationships: relationshipRepo,
    rooms: roomRepo,
    pets: petRepo,
    messages: messageRepo,
    memories: memoryRepo,
    tasks: taskRepo,
    moods: moodRepo,
    posts: postRepo,
    notifications: notificationRepo,
    fortunes: fortuneRepo,
    codewords: codewordRepo,
    petEvents: petEventRepo,
    pushSubscriptions: pushSubscriptionRepo,
    map: mapRepo
  }
}
