import type {
  AppNotification,
  ChatMessage,
  CodewordAnswer,
  Fortune,
  InviteCode,
  LoginCode,
  MapLight,
  MoodEntry,
  Pet,
  PetEventStat,
  PetMemory,
  PetTask,
  Post,
  Relationship,
  Room,
  User
} from '../domain/models.js'

export interface UserProfilePatch {
  avatarUrl?: string | null
  avatarConfig?: string | null
  displayName?: string | null
  birthday?: string | null
  mbti?: string | null
}

export interface UserRepository {
  findById(id: string): Promise<User | undefined>
  findByEmail(email: string): Promise<User | undefined>
  findByUsername(username: string): Promise<User | undefined>
  findByPublicCode(code: string): Promise<User | undefined>
  create(input: Pick<User, 'email' | 'username' | 'displayName'>): Promise<User>
  updateUsername(id: string, username: string): Promise<User>
  updateProfile(id: string, patch: UserProfilePatch): Promise<User>
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
  createPetDm(userId: string): Promise<Room>
  findById(id: string): Promise<Room | undefined>
  findByRelationshipId(relationshipId: string): Promise<Room | undefined>
  listForUser(userId: string): Promise<Room[]>
  isMember(roomId: string, userId: string): Promise<boolean>
  setProactive(roomId: string, enabled: boolean): Promise<Room>
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
  create(input: {
    roomId: string
    text: string
    sourceMessageId?: string
    canMention?: boolean
    category?: PetMemory['category']
    importance?: PetMemory['importance']
    source?: PetMemory['source']
  }): Promise<PetMemory>
  deleteById(roomId: string, memoryId: string): Promise<void>
}

export interface TaskRepository {
  create(input: Pick<PetTask, 'roomId' | 'userId' | 'content' | 'scheduleType' | 'nextRunAt'>): Promise<PetTask>
  claimDue(now: Date, limit: number): Promise<PetTask[]>
  complete(id: string): Promise<void>
  reschedule(id: string, nextRunAt: Date): Promise<void>
  fail(id: string): Promise<void>
}

export interface MoodRepository {
  upsert(roomId: string, userId: string, day: string, level: number): Promise<MoodEntry>
  listForRange(roomId: string, fromDay: string, toDay: string): Promise<MoodEntry[]>
}

export interface PostRepository {
  create(input: Omit<Post, 'id' | 'createdAt'>): Promise<Post>
  createAsPet(roomId: string, text: string, imageUrl?: string): Promise<Post>
  listByRoom(roomId: string, limit: number): Promise<Post[]>
  like(postId: string, userId: string): Promise<void>
  unlike(postId: string, userId: string): Promise<void>
  likeStats(postId: string, userId: string): Promise<{ count: number; likedByMe: boolean }>
}

export interface NotificationRepository {
  create(userId: string, type: string, payload: Record<string, unknown>): Promise<AppNotification>
  list(userId: string, limit: number): Promise<AppNotification[]>
  unreadCount(userId: string): Promise<number>
  markAllRead(userId: string): Promise<void>
}

export interface FortuneRepository {
  findByUserAndDay(userId: string, day: string): Promise<Fortune | undefined>
  createForUser(userId: string, day: string, content: Fortune['content']): Promise<Fortune>
}

export interface CodewordRepository {
  getAnswer(roomId: string, day: string, userId: string): Promise<CodewordAnswer | undefined>
  setAnswer(roomId: string, day: string, userId: string, answer: string): Promise<CodewordAnswer>
  listForDay(roomId: string, day: string): Promise<CodewordAnswer[]>
}

export interface PetEventRepository {
  record(petId: string, userId: string, action: string, payload?: Record<string, unknown>): Promise<void>
  statsByRoom(petId: string): Promise<PetEventStat[]>
}

export interface PushSubscriptionRecord {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushSubscriptionRepository {
  save(userId: string, endpoint: string, p256dh: string, auth: string): Promise<void>
  listForUser(userId: string): Promise<PushSubscriptionRecord[]>
  deleteByEndpoint(userId: string, endpoint: string): Promise<void>
}

export interface MapRepository {
  listByRoom(roomId: string): Promise<MapLight[]>
  light(roomId: string, spotId: number, userId: string): Promise<MapLight>
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
  tasks: TaskRepository
  moods: MoodRepository
  posts: PostRepository
  notifications: NotificationRepository
  fortunes: FortuneRepository
  codewords: CodewordRepository
  petEvents: PetEventRepository
  pushSubscriptions: PushSubscriptionRepository
  map: MapRepository
}
