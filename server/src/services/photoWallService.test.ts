import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createPhotoWallService } from './photoWallService.js'
import { shanghaiDayKey } from './codewordStreak.js'
import { dayBefore } from '../domain/codewordStreak.js'
import { PHOTO_WALL_LIMIT } from '../domain/photoWallRules.js'

const FIXED_NOW = new Date('2026-08-30T10:00:00Z')

async function createPairRoom() {
  const repositories = createMemoryRepositories()
  const user = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: '阿柴' })
  const friend = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: '豆豆' })
  const friendshipService = createFriendshipService(repositories)
  const relationship = await friendshipService.sendRequest(user.id, friend.username)
  await friendshipService.acceptRequest(friend.id, relationship.id)
  const room = await repositories.rooms.findByRelationshipId(relationship.id)
  if (!room) throw new Error('room missing')
  return { repositories, user, friend, room }
}

const tinyPhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

describe('photo wall service', () => {
  it('only room members can read or write', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createPhotoWallService(repositories)
    await expect(service.list('other-room', user.id)).rejects.toThrow('room_forbidden')
    await expect(service.create('other-room', user.id, { photo: tinyPhoto })).rejects.toThrow('room_forbidden')
  })

  it('creates manual photos with uploader name and trims caption', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createPhotoWallService(repositories)
    await service.create(room.id, user.id, { photo: tinyPhoto, caption: '  今天散步  ' })
    const photos = await service.list(room.id, user.id)
    expect(photos).toHaveLength(1)
    expect(photos[0].origin).toBe('manual')
    expect(photos[0].userName).toBe('阿柴')
    expect(photos[0].caption).toBe('今天散步')
  })

  it('updates caption and deletes; missing photo is 404', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createPhotoWallService(repositories)
    const created = await service.create(room.id, user.id, { photo: tinyPhoto })
    await service.updateCaption(room.id, user.id, created.id, '改个说明')
    let photos = await service.list(room.id, user.id)
    expect(photos[0].caption).toBe('改个说明')
    await service.remove(room.id, user.id, created.id)
    photos = await service.list(room.id, user.id)
    expect(photos).toHaveLength(0)
    await expect(service.updateCaption(room.id, user.id, 'missing', 'x')).rejects.toThrow('photo_not_found')
  })

  it('evicts the oldest manual photo beyond the 36 cap', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createPhotoWallService(repositories)
    for (let index = 0; index < PHOTO_WALL_LIMIT; index += 1) {
      await service.create(room.id, user.id, { photo: tinyPhoto, caption: `#${index}` })
    }
    expect(await repositories.photoWall.countByRoom(room.id)).toBe(PHOTO_WALL_LIMIT)
    await service.create(room.id, user.id, { photo: tinyPhoto, caption: ' newest ' })
    const photos = await service.list(room.id, user.id)
    expect(photos).toHaveLength(PHOTO_WALL_LIMIT)
    // 最旧的 #0 被挤掉，新照在
    expect(photos.some((photo) => photo.caption === '#0')).toBe(false)
    expect(photos.some((photo) => photo.caption === 'newest')).toBe(true)
  })

  it('auto level-up card is written once per level and match cards survive eviction', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createPhotoWallService(repositories)
    await service.onLevelUp(room.id, 3)
    let photos = await service.list(room.id, user.id)
    expect(photos.map((photo) => photo.origin)).toEqual(['levelup'])
    expect(photos[0].caption).toBe('小多利升到 Lv.3 啦')

    for (let index = 0; index < PHOTO_WALL_LIMIT - 1; index += 1) {
      await service.create(room.id, user.id, { photo: tinyPhoto, caption: `#${index}` })
    }
    // 墙满后新自动卡放弃，但已有默契卡不被挤掉
    await service.onLevelUp(room.id, 4)
    photos = await service.list(room.id, user.id)
    expect(photos).toHaveLength(PHOTO_WALL_LIMIT)
    expect(photos.some((photo) => photo.origin === 'levelup' && photo.caption.includes('Lv.3'))).toBe(true)
  })

  it('codeword streak card appears every 7 both-answered days', async () => {
    const { repositories, user, friend, room } = await createPairRoom()
    const service = createPhotoWallService(repositories, { now: () => FIXED_NOW })
    const today = shanghaiDayKey(FIXED_NOW)
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = dayBefore(today, offset)
      await repositories.codewords.setAnswer(room.id, day, user.id, '答')
      await repositories.codewords.setAnswer(room.id, day, friend.id, '答')
    }
    await service.onCodewordBothAnswered(room.id)
    const photos = await service.list(room.id, user.id)
    expect(photos.map((photo) => photo.origin)).toEqual(['codeword_streak'])
    expect(photos[0].caption).toContain('×7')

    // 未满 7 天时不发卡
    const { repositories: repos2, user: user2, friend: friend2, room: room2 } = await createPairRoom()
    const service2 = createPhotoWallService(repos2, { now: () => FIXED_NOW })
    for (let offset = 5; offset >= 0; offset -= 1) {
      const day = dayBefore(today, offset)
      await repos2.codewords.setAnswer(room2.id, day, user2.id, '答')
      await repos2.codewords.setAnswer(room2.id, day, friend2.id, '答')
    }
    await service2.onCodewordBothAnswered(room2.id)
    expect(await service2.list(room2.id, user2.id)).toHaveLength(0)
  })

  it('writes the match card with suit reference', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createPhotoWallService(repositories)
    await service.onMatchSettled(room.id, { suitKey: 'scarf', day: '2026-08-30' })
    const photos = await service.list(room.id, user.id)
    expect(photos[0].origin).toBe('match_outfit')
    expect(photos[0].refKey).toBe('scarf')
    expect(photos[0].takenDay).toBe('2026-08-30')
  })
})
