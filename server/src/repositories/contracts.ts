import type {
  Anniversary,
  AppNotification,
  ChatMessage,
  CodewordAnswer,
  DiaryEntry,
  Fortune,
  InviteCode,
  Invitation,
  MapLight,
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
  RoomInventoryItem,
  User,
  WardrobeState,
  WechatIdentity
} from '../domain/models.js'

export interface UserProfilePatch {
  avatarUrl?: string | null
  avatarConfig?: string | null
  displayName?: string | null
  birthday?: string | null
  mbti?: string | null
  gender?: User['gender']
}

export interface UserRepository {
  findById(id: string): Promise<User | undefined>
  findByEmail(email: string): Promise<User | undefined>
  findByUsername(username: string): Promise<User | undefined>
  findByPublicCode(code: string): Promise<User | undefined>
  /** 按八位数字 UID 精确查找（输入允许带前导零） */
  findByUid(uid: string): Promise<User | undefined>
  /** 最新注册的用户（创建时间倒序），供添加好友弹窗推荐候选 */
  listRecent(limit: number): Promise<User[]>
  create(input: Pick<User, 'email' | 'username' | 'displayName'>): Promise<User>
  updateUsername(id: string, username: string): Promise<User>
  updateProfile(id: string, patch: UserProfilePatch): Promise<User>
  deleteById(id: string): Promise<void>
}

export interface InviteRepository {
  findByCode(code: string): Promise<InviteCode | undefined>
  consume(code: string): Promise<void>
}

export interface WechatIdentityRepository {
  findByOpenId(openId: string): Promise<WechatIdentity | undefined>
  findByUserId(userId: string): Promise<WechatIdentity | undefined>
  create(input: Pick<WechatIdentity, 'userId' | 'openId' | 'unionId'>): Promise<WechatIdentity>
}

export interface InvitationRepository {
  create(input: Pick<Invitation, 'token' | 'inviterId' | 'expiresAt'>): Promise<Invitation>
  findByToken(token: string): Promise<Invitation | undefined>
  accept(token: string, accepterId: string): Promise<Invitation>
  acceptPair?(token: string, accepterId: string, options?: { createPet?: boolean }): Promise<{
    invitation: Invitation
    relationship: Relationship
    room: Room
    pet: Pet | null
  }>
  decline(token: string, userId: string): Promise<Invitation>
}

export interface RelationshipRepository {
  findActiveForUser(userId: string): Promise<Relationship | undefined>
  listAcceptedForUser(userId: string): Promise<Relationship[]>
  findBetweenUsers(firstUserId: string, secondUserId: string): Promise<Relationship | undefined>
  findById(id: string): Promise<Relationship | undefined>
  create(requesterId: string, addresseeId: string): Promise<Relationship>
  accept(id: string): Promise<Relationship>
  removeById(id: string): Promise<void>
  listPendingForUser(userId: string): Promise<Relationship[]>
}

export interface RoomRepository {
  createForRelationship(relationshipId: string): Promise<Room>
  createPetDm(userId: string): Promise<Room>
  findById(id: string): Promise<Room | undefined>
  findByRelationshipId(relationshipId: string): Promise<Room | undefined>
  listForUser(userId: string): Promise<Room[]>
  /** 全量房间（后台 sweep 用，房间数量级很小） */
  listAll(): Promise<Room[]>
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
  /** 房间内待执行的提醒（按时间正序），供取消指令使用 */
  listPendingByRoom(roomId: string): Promise<PetTask[]>
  /** 取消待执行的提醒；任务不存在或不在待执行态时不做任何修改 */
  cancelById(id: string): Promise<void>
}

export interface NestTaskProgressRepository {
  listByRoom(roomId: string): Promise<NestTaskProgress[]>
  findByKey(roomId: string, taskKey: string): Promise<NestTaskProgress | undefined>
  /** 累加进度（成就型）；不存在则建 0+delta 行 */
  addProgress(roomId: string, taskKey: string, delta: number): Promise<NestTaskProgress>
  /** 每日任务置进度并标记周期（当天签到等一次性计数，重复写不叠加） */
  setDailyProgress(roomId: string, taskKey: string, periodKey: string, progress: number): Promise<NestTaskProgress>
  markClaimed(roomId: string, taskKey: string, userId: string): Promise<NestTaskProgress | undefined>
}

export interface InventoryRepository {
  listByRoom(roomId: string): Promise<RoomInventoryItem[]>
  /** 条件扣减：库存足够时扣 1 并返回 true，不足返回 false（不抛错） */
  consume(roomId: string, itemId: string): Promise<boolean>
  add(roomId: string, itemId: string, count: number): Promise<void>
  addBatch(roomId: string, items: Array<{ itemId: string; count: number }>): Promise<void>
  /** 新手礼包：未发过则发放并返回 true，已发过返回 false */
  grantStarterPouchOnce(roomId: string, items: Array<{ itemId: string; count: number }>): Promise<boolean>
}

export interface MoodRepository {
  upsert(roomId: string, userId: string, day: string, level: number): Promise<MoodEntry>
  listForRange(roomId: string, fromDay: string, toDay: string): Promise<MoodEntry[]>
}

export interface AnniversaryRepository {
  create(input: Pick<Anniversary, 'roomId' | 'userId' | 'name' | 'icon' | 'note' | 'day' | 'repeatRule'>): Promise<Anniversary>
  update(id: string, patch: { name?: string; icon?: string; note?: string; repeatRule?: Anniversary['repeatRule'] }): Promise<Anniversary | undefined>
  deleteById(roomId: string, id: string): Promise<void>
  listByRoom(roomId: string): Promise<Anniversary[]>
}

export interface DiaryRepository {
  create(input: Pick<DiaryEntry, 'userId' | 'day' | 'title' | 'body' | 'location' | 'photos'>): Promise<DiaryEntry>
  update(id: string, patch: { title?: string; body?: string; location?: string; photos?: string[] }): Promise<DiaryEntry | undefined>
  setLiked(id: string, liked: boolean): Promise<DiaryEntry | undefined>
  deleteById(userId: string, id: string): Promise<void>
  findById(id: string): Promise<DiaryEntry | undefined>
  listForUser(userId: string, fromDay: string, toDay: string): Promise<DiaryEntry[]>
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
  /** 最近一次小窝动作时间（没有动作记录返回 undefined），供被冷落判定使用 */
  lastAt(petId: string): Promise<Date | undefined>
}

export interface PhotoWallRepository {
  listByRoom(roomId: string, limit?: number): Promise<PhotoWallPost[]>
  findById(roomId: string, photoId: string): Promise<PhotoWallPost | undefined>
  create(input: Pick<PhotoWallPost, 'roomId' | 'userId' | 'origin' | 'photo' | 'caption' | 'refKey' | 'takenDay'>): Promise<PhotoWallPost>
  updateCaption(roomId: string, photoId: string, caption: string): Promise<PhotoWallPost | undefined>
  deleteById(roomId: string, photoId: string): Promise<void>
  /** 超上限淘汰：只允许删手动照，返回是否真的删了 */
  deleteOldestManual(roomId: string): Promise<boolean>
  countByRoom(roomId: string): Promise<number>
}

export interface WardrobeRepository {
  getState(roomId: string): Promise<WardrobeState>
  /** 保存当前套装；未初始化则建行 */
  setEquipped(roomId: string, equipped: string): Promise<WardrobeState>
  /** GM 全解锁开关（测试用） */
  setGmUnlockAll(roomId: string, enabled: boolean): Promise<WardrobeState>
}

export interface OutfitMatchRepository {
  /** 当日某成员的选择；同一成员重复选择为覆盖（当天可改，双方齐前） */
  setPick(roomId: string, day: string, userId: string, itemId: string): Promise<OutfitMatchPick>
  listPicks(roomId: string, day: string): Promise<OutfitMatchPick[]>
  getStreak(roomId: string): Promise<OutfitMatchStreak | undefined>
  /** 条件结算门闩：lastMatchDay !== day 时写入并返回 true，否则 false（先到先结算） */
  markSettled(roomId: string, day: string, streak: number, bestStreak: number): Promise<boolean>
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
  wechatIdentities: WechatIdentityRepository
  invitations: InvitationRepository
  relationships: RelationshipRepository
  rooms: RoomRepository
  pets: PetRepository
  messages: MessageRepository
  memories: MemoryRepository
  tasks: TaskRepository
  nestTaskProgress: NestTaskProgressRepository
  inventory: InventoryRepository
  moods: MoodRepository
  anniversaries: AnniversaryRepository
  diaries: DiaryRepository
  posts: PostRepository
  notifications: NotificationRepository
  fortunes: FortuneRepository
  codewords: CodewordRepository
  petEvents: PetEventRepository
  pushSubscriptions: PushSubscriptionRepository
  map: MapRepository
  photoWall: PhotoWallRepository
  wardrobe: WardrobeRepository
  outfitMatch: OutfitMatchRepository
}
