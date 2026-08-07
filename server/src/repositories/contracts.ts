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

export interface UserRepository {
  findById(id: string): Promise<User | undefined>
  findByEmail(email: string): Promise<User | undefined>
  findByUsername(username: string): Promise<User | undefined>
  create(input: Pick<User, 'email' | 'username' | 'displayName'>): Promise<User>
  updateUsername(id: string, username: string): Promise<User>
}

export interface InviteRepository {
  findByCode(code: string): Promise<InviteCode | undefined>
  consume(code: string): Promise<void>
}

export interface LoginCodeRepository {
  save(code: LoginCode): Promise<void>
  findByEmail(email: string): Promise<LoginCode | undefined>
  deleteByEmail(email: string): Promise<void>
}

export interface RelationshipRepository {
  findActiveForUser(userId: string): Promise<Relationship | undefined>
  findBetweenUsers(firstUserId: string, secondUserId: string): Promise<Relationship | undefined>
  findById(id: string): Promise<Relationship | undefined>
  create(requesterId: string, addresseeId: string): Promise<Relationship>
  accept(id: string): Promise<Relationship>
  listPendingForUser(userId: string): Promise<Relationship[]>
}

export interface RoomRepository {
  createForRelationship(relationshipId: string): Promise<Room>
  findById(id: string): Promise<Room | undefined>
  findByRelationshipId(relationshipId: string): Promise<Room | undefined>
  isMember(roomId: string, userId: string): Promise<boolean>
}

export interface PetRepository {
  createForRelationship(relationshipId: string, roomId: string): Promise<Pet>
  findByRoomId(roomId: string): Promise<Pet | undefined>
  update(pet: Pet): Promise<Pet>
}

export interface MessageRepository {
  listRecent(roomId: string, limit: number): Promise<ChatMessage[]>
  create(input: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>
}

export interface MemoryRepository {
  listByRoom(roomId: string): Promise<PetMemory[]>
  deleteById(roomId: string, memoryId: string): Promise<void>
}

export interface RepositoryBundle {
  users: UserRepository
  invites: InviteRepository
  loginCodes: LoginCodeRepository
  relationships: RelationshipRepository
  rooms: RoomRepository
  pets: PetRepository
  messages: MessageRepository
  memories: MemoryRepository
}
