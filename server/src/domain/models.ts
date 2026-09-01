export type Id = string
export type RelationshipStatus = 'pending' | 'accepted' | 'rejected'
export type MessageSenderType = 'user' | 'pet'
export type MessageKind = 'text' | 'image' | 'pet'
export type PetAction = 'feed' | 'play' | 'clean' | 'sleep'
export type RoomType = 'pair' | 'pet_dm'
export type Gender = 'female' | 'male' | 'private'

export interface User {
  id: Id
  email: string
  username: string
  displayName: string
  /** 八位数字用户编号（00000001 起递增），用于加好友与“第 N 位用户”展示 */
  uid: string
  publicCode: string
  avatarUrl?: string | null
  avatarConfig?: string | null
  birthday?: string | null
  mbti?: string | null
  gender?: Gender
  createdAt: Date
}

export interface WechatIdentity {
  id: Id
  userId: Id
  openId: string
  unionId?: string | null
  createdAt: Date
  updatedAt: Date
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface Invitation {
  id: Id
  token: string
  inviterId: Id
  status: InvitationStatus
  expiresAt: Date
  acceptedBy?: Id | null
  createdAt: Date
  acceptedAt?: Date | null
}

export interface InviteCode {
  code: string
  active: boolean
  maxUses: number
  useCount: number
}


export interface Relationship {
  id: Id
  requesterId: Id
  addresseeId: Id
  status: RelationshipStatus
  createdAt: Date
}

export interface Room {
  id: Id
  relationshipId?: Id | null
  type: RoomType
  proactiveEnabled: boolean
  createdAt: Date
}

export interface Pet {
  id: Id
  relationshipId: Id
  roomId: Id
  name: '小多利'
  level: number
  experience: number
  experienceToNextLevel: number
  hunger: number
  mood: number
  energy: number
  health: number
  intimacy: number
  updatedAt: Date
}

export interface ChatMessage {
  id: Id
  roomId: Id
  senderType: MessageSenderType
  senderId?: Id
  kind: MessageKind
  text: string
  imageUrl?: string
  createdAt: Date
}

export interface PetMemory {
  id: Id
  roomId: Id
  text: string
  sourceMessageId?: Id
  canMention: boolean
  category: MemoryCategory
  importance: 1 | 2 | 3
  source: MemorySource
  createdAt: Date
  updatedAt: Date
}

export type MemoryCategory = 'identity' | 'preference' | 'habit' | 'plan' | 'relationship' | 'other'
export type MemorySource = 'explicit' | 'inferred'

export interface PetTask {
  id: Id
  roomId: Id
  userId: Id
  content: string
  scheduleType: 'once' | 'daily' | 'weekly'
  nextRunAt: Date
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed'
  createdAt: Date
  updatedAt: Date
}

export type NestTaskRepeat = 'daily' | 'weekly' | 'none'

export interface NestTaskRewardItem {
  itemId: string
  count: number
}

export interface NestTask {
  id: Id
  roomId: Id
  createdBy: Id
  title: string
  icon: string
  repeatRule: NestTaskRepeat
  rewardItems: NestTaskRewardItem[]
  rewardExp: number
  lastCompletedDay: string | null
  lastCompletedBy: Id | null
  archived: boolean
  createdAt: Date
  updatedAt: Date
}

/** 系统预设任务定义（模板，代码常量，用户不可创建） */
export type NestTaskMetric =
  | 'checkin'            // 连续/累计签到（每日：当天签到）
  | 'feed'               // 喂食次数
  | 'play'               // 玩耍次数
  | 'clean'              // 清洁（洗澡）次数
  | 'sleep'              // 睡觉次数
  | 'outfit_match'       // 默契换装次数（衣柜期接入，暂为占位）

export type NestTaskScope = 'daily' | 'achievement'

export interface NestTaskDef {
  key: string
  scope: NestTaskScope
  title: string
  icon: string
  metric: NestTaskMetric
  target: number
  rewardItems: NestTaskRewardItem[]
  /** 成就型任务的前置任务 key（链式解锁：签到 3 天 → 签到 7 天） */
  requires?: string
}

/** 房间内某预设任务的进度与领取状态 */
export interface NestTaskProgress {
  id: Id
  roomId: Id
  taskKey: string
  periodKey: string
  progress: number
  claimed: boolean
  claimedBy: Id | null
  updatedAt: Date
}

export interface RoomInventoryItem {
  roomId: Id
  itemId: string
  count: number
}

export interface MoodEntry {
  id: Id
  roomId: Id
  userId: Id
  day: string
  level: number
  updatedAt: Date
}

export interface Anniversary {
  id: Id
  roomId: Id
  userId: Id
  name: string
  icon: string
  note: string
  day: string
  repeatRule: 'yearly' | 'none'
  /** 可选照片背景（dataURL），为 null 时列表用 icon 展示 */
  photo: string | null
  createdAt: Date
  updatedAt: Date
}

export interface DiaryEntry {
  id: Id
  userId: Id
  day: string
  title: string
  body: string
  location: string
  photos: string[]
  liked: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Post {
  id: Id
  roomId: Id
  authorType: 'user' | 'pet'
  authorId?: Id | null
  text: string
  imageUrl?: string | null
  createdAt: Date
}

export interface AppNotification {
  id: Id
  userId: Id
  type: string
  payload: Record<string, unknown>
  read: boolean
  createdAt: Date
}

export interface FortuneContent {
  schemaVersion: 2
  zodiac: string
  theme: string
  overall: { rating: number; summary: string; text: string }
  love: { rating: number; single: string; partnered: string }
  study: { rating: number; text: string }
  work: { rating: number; text: string }
  wealth: { rating: number; text: string }
  health: { rating: number; text: string }
  luckyColor: { name: string; hex: string }
  luckyNumber: number
  luckyPhrase: string
}

export interface Fortune {
  id: Id
  userId: Id
  day: string
  content: FortuneContent
  createdAt: Date
}

export interface CodewordAnswer {
  roomId: Id
  day: string
  userId: Id
  answer: string
  createdAt: Date
}

export interface PetEventStat {
  userId: Id
  action: string
  count: number
}

export interface MapLight {
  spotId: number
  litBy: Id
  createdAt: Date
}

export interface PhotoWallPost {
  id: Id
  roomId: Id
  /** 自动生成卡可为 null */
  userId: Id | null
  origin: 'manual' | 'match_outfit' | 'levelup' | 'anniversary' | 'codeword_streak'
  /** 手动照为 dataURL；自动卡为空串（客户端按 origin 渲染模板卡） */
  photo: string
  caption: string
  /** 默契卡记录当日双方一致的套装 key */
  refKey: string | null
  takenDay: string | null
  createdAt: Date
}

export interface OutfitMatchPick {
  roomId: Id
  day: string
  userId: Id
  itemId: string
  createdAt: Date
}

export interface OutfitMatchStreak {
  roomId: Id
  streak: number
  bestStreak: number
  lastMatchDay: string | null
}

export interface WardrobeState {
  roomId: Id
  equipped: string
  /** GM 全解锁开关（测试用）：true 时衣柜忽略解锁条件 */
  gmUnlockAll: boolean
  updatedAt: Date
}
