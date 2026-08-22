import { randomBytes } from 'node:crypto'
import type { RepositoryBundle } from '../repositories/contracts.js'
import type { createFriendshipService } from './friendshipService.js'

const MAX_COUNT = 10

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
    }
  }
}
