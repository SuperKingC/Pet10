import type { PhotoWallPost } from '../domain/models.js'
import {
  normalizeCaption,
  pickEvictionId,
  type PhotoWallOrigin
} from '../domain/photoWallRules.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import { PHOTO_WALL_LIMIT } from '../domain/photoWallRules.js'

export interface PhotoWallView {
  id: string
  origin: PhotoWallOrigin
  photo: string
  caption: string
  refKey: string | null
  takenDay: string | null
  createdAt: Date
  /** 上传者昵称；自动卡为 null */
  userName: string | null
}

export function createPhotoWallService(repositories: RepositoryBundle) {
  async function assertMember(roomId: string, userId: string) {
    if (!(await repositories.rooms.isMember(roomId, userId))) throw new Error('room_forbidden')
  }

  /** 唯一的自动入墙通道：默契换装卡（双方同日提交同一套装时由衣柜结算触发） */
  async function insertAutoCard(roomId: string, input: {
    origin: PhotoWallOrigin
    caption: string
    refKey?: string | null
    takenDay?: string | null
  }): Promise<PhotoWallPost | null> {
    const existing = await repositories.photoWall.listByRoom(roomId, 10_000)
    // 自动卡在满仓时直接放弃（默契卡每天每套至多结算一次，正常到不了这一步）
    if (existing.length + 1 > PHOTO_WALL_LIMIT) return null
    return repositories.photoWall.create({
      roomId,
      userId: null,
      origin: input.origin,
      photo: '',
      caption: input.caption,
      refKey: input.refKey ?? null,
      takenDay: input.takenDay ?? null
    })
  }

  return {
    /** 成员可看整面墙；自动卡 photo 为空串，由客户端按 origin 渲染模板卡 */
    async list(roomId: string, userId: string): Promise<PhotoWallView[]> {
      await assertMember(roomId, userId)
      const posts = await repositories.photoWall.listByRoom(roomId)
      const userIds = [...new Set(posts.map((post) => post.userId).filter((id): id is string => Boolean(id)))]
      const names = new Map<string, string>()
      for (const id of userIds) {
        const user = await repositories.users.findById(id)
        if (user) names.set(id, user.displayName)
      }
      return posts.map((post) => ({
        id: post.id,
        origin: post.origin,
        photo: post.photo,
        caption: post.caption,
        refKey: post.refKey,
        takenDay: post.takenDay,
        createdAt: post.createdAt,
        userName: post.userId ? names.get(post.userId) ?? null : null
      }))
    },

    async create(roomId: string, userId: string, input: {
      photo: string
      caption?: string
      takenDay?: string | null
    }): Promise<PhotoWallPost> {
      await assertMember(roomId, userId)
      const existing = await repositories.photoWall.listByRoom(roomId, 10_000)
      const evictionId = pickEvictionId(
        existing.map((post) => ({ id: post.id, origin: post.origin, createdAt: post.createdAt })),
        'manual'
      )
      if (evictionId) await repositories.photoWall.deleteById(roomId, evictionId)
      return repositories.photoWall.create({
        roomId,
        userId,
        origin: 'manual',
        photo: input.photo,
        caption: normalizeCaption(input.caption ?? ''),
        refKey: null,
        takenDay: input.takenDay ?? null
      })
    },

    async updateCaption(roomId: string, userId: string, photoId: string, caption: string): Promise<PhotoWallPost> {
      await assertMember(roomId, userId)
      const updated = await repositories.photoWall.updateCaption(roomId, photoId, normalizeCaption(caption))
      if (!updated) throw new Error('photo_not_found')
      return updated
    },

    /** 双方都可删任意照片（墙是房间共同财产）；默契卡同样只能手动删 */
    async remove(roomId: string, userId: string, photoId: string): Promise<void> {
      await assertMember(roomId, userId)
      const post = await repositories.photoWall.findById(roomId, photoId)
      if (!post) throw new Error('photo_not_found')
      await repositories.photoWall.deleteById(roomId, photoId)
    },

    /** 默契换装达成由 wardrobeService 结算后调用，入墙一张默契卡（不被自动淘汰） */
    async onMatchSettled(roomId: string, input: {
      suitKey: string
      day: string
    }): Promise<void> {
      await insertAutoCard(roomId, {
        origin: 'match_outfit',
        caption: '心有灵犀，今天穿的一样！',
        refKey: input.suitKey,
        takenDay: input.day
      })
    }
  }
}
