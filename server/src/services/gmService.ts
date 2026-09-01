import { randomBytes } from 'node:crypto'
import type { RepositoryBundle } from '../repositories/contracts.js'
import { ITEM_CATALOG } from '../domain/itemCatalog.js'
import type { createFriendshipService } from './friendshipService.js'

const MAX_COUNT = 10
const GM_USERNAME_PREFIX = 'gm_friend_'
/** GM 发放道具：每次每件道具加的数量（可重复点） */
const GM_ITEM_GRANT_COUNT = 9

function randomSuffix() {
  return randomBytes(6).toString('hex')
}

export function createGmService(
  repositories: RepositoryBundle,
  friendship: ReturnType<typeof createFriendshipService>
) {
  async function createFakeUser(index: number) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const suffix = randomSuffix()
      const username = `gm_friend_${suffix}`
      const displayName = `测试好友${index + 1}-${suffix.slice(0, 4)}`
      try {
        return await repositories.users.create({ email: `${username}@gm.local`, username, displayName })
      } catch {
        if (attempt === 1) throw new Error('gm_user_create_failed')
      }
    }
    throw new Error('gm_user_create_failed')
  }

  return {
    async addFriends(userId: string, count: number) {
      if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
        throw new Error('invalid_count')
      }
      const added: { userId: string; displayName: string }[] = []
      for (let index = 0; index < count; index += 1) {
        const friend = await createFakeUser(index)
        const relationship = await friendship.sendRequest(userId, friend.username)
        await friendship.acceptRequest(friend.id, relationship.id)
        added.push({ userId: friend.id, displayName: friend.displayName })
      }
      return { added }
    },

    // 只删除 GM 生成的假用户（用户名以 gm_friend_ 开头），不碰真实好友
    async removeFriends(userId: string) {
      const accepted = await repositories.relationships.listAcceptedForUser(userId)
      const removed: { userId: string; displayName: string }[] = []
      for (const relationship of accepted) {
        const otherId = relationship.requesterId === userId ? relationship.addresseeId : relationship.requesterId
        const other = await repositories.users.findById(otherId)
        if (!other?.username.startsWith(GM_USERNAME_PREFIX)) continue
        await repositories.relationships.removeById(relationship.id)
        await repositories.users.deleteById(other.id)
        removed.push({ userId: other.id, displayName: other.displayName })
      }
      return { removed }
    },

    // GM 便利操作作用于当前账号的全部房间（正常场景只有一个共养小窝）
    async addNestItems(userId: string) {
      const rooms = await repositories.rooms.listForUser(userId)
      const items = Object.values(ITEM_CATALOG).map((item) => ({ itemId: item.id, count: GM_ITEM_GRANT_COUNT }))
      for (const room of rooms) {
        await repositories.inventory.addBatch(room.id, items)
      }
      return { rooms: rooms.length, grantedPerItem: GM_ITEM_GRANT_COUNT }
    },

    async setWardrobeUnlockAll(userId: string, enabled: boolean) {
      const rooms = await repositories.rooms.listForUser(userId)
      for (const room of rooms) {
        await repositories.wardrobe.setGmUnlockAll(room.id, enabled)
      }
      return { rooms: rooms.length, gmUnlockAll: enabled }
    }
  }
}
