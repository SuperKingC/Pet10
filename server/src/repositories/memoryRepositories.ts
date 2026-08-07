import { randomUUID } from 'node:crypto'
import type {
  ChatMessage,
  InviteCode,
  LoginCode,
  Pet,
  PetMemory,
  Relationship,
  Room,
  User
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
  const relationships = new Map<string, Relationship>()
  const rooms = new Map<string, Room>()
  const roomMembers = new Map<string, Set<string>>()
  const pets = new Map<string, Pet>()
  const messages = new Map<string, ChatMessage[]>()
  const memories = new Map<string, PetMemory[]>()

  const userRepo = {
    async findById(id: string) { return users.get(id) },
    async findByEmail(email: string) { return [...users.values()].find((user) => user.email === email.toLowerCase()) },
    async findByUsername(username: string) { return [...users.values()].find((user) => user.username === username) },
    async create(input: Pick<User, 'email' | 'username' | 'displayName'>) {
      const user = { ...input, id: randomUUID(), email: input.email.toLowerCase(), createdAt: now() }
      users.set(user.id, user)
      return user
    },
    async updateUsername(id: string, username: string) {
      const user = users.get(id)
      if (!user) throw new Error('user_not_found')
      user.username = username
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

  const relationshipRepo = {
    async findActiveForUser(userId: string) {
      return [...relationships.values()].find((item) => item.status !== 'rejected' && (item.requesterId === userId || item.addresseeId === userId))
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
      const room: Room = { id: randomUUID(), relationshipId, createdAt: now() }
      rooms.set(room.id, room)
      const relationship = relationships.get(relationshipId)
      if (relationship) roomMembers.set(room.id, new Set([relationship.requesterId, relationship.addresseeId]))
      return room
    },
    async findById(id: string) { return rooms.get(id) },
    async findByRelationshipId(relationshipId: string) { return [...rooms.values()].find((room) => room.relationshipId === relationshipId) },
    async isMember(roomId: string, userId: string) { return roomMembers.get(roomId)?.has(userId) ?? false }
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
    async deleteById(roomId: string, memoryId: string) {
      memories.set(roomId, (memories.get(roomId) ?? []).filter((memory) => memory.id !== memoryId))
    }
  }

  return {
    users: userRepo,
    invites: inviteRepo,
    loginCodes: loginCodeRepo,
    relationships: relationshipRepo,
    rooms: roomRepo,
    pets: petRepo,
    messages: messageRepo,
    memories: memoryRepo
  }
}
