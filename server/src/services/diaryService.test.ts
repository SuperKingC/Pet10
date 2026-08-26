import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createDiaryService } from './diaryService.js'

async function createService() {
  const repositories = createMemoryRepositories()
  const user = await repositories.users.create({ email: 'diary@example.com', username: 'diary', displayName: 'Diary' })
  const other = await repositories.users.create({ email: 'other@example.com', username: 'other', displayName: 'Other' })
  return { repositories, service: createDiaryService(repositories), user, other }
}

describe('diary service', () => {
  it('creates and lists personal diaries within a range', async () => {
    const { service, user } = await createService()

    const entry = await service.create(user.id, {
      day: '2026-08-23',
      title: '阳光正好的一天',
      body: '今天带小多利去公园玩。',
      location: '阳光公园',
      photos: ['data:image/jpeg;base64,QUJD']
    })
    expect(entry.userId).toBe(user.id)
    expect(entry.liked).toBe(false)

    const listed = await service.list(user.id, '2026-08-01', '2026-08-31')
    expect(listed).toHaveLength(1)
    expect(listed[0].title).toBe('阳光正好的一天')

    const outside = await service.list(user.id, '2026-09-01', '2026-09-30')
    expect(outside).toHaveLength(0)
  })

  it('lists same-day entries newest first and days descending', async () => {
    const { service, user } = await createService()
    const first = await service.create(user.id, { day: '2026-08-23', title: '早', body: '', location: '', photos: [] })
    const second = await service.create(user.id, { day: '2026-08-23', title: '晚', body: '', location: '', photos: [] })
    await service.create(user.id, { day: '2026-08-20', title: '旧', body: '', location: '', photos: [] })

    const listed = await service.list(user.id, '2026-08-01', '2026-08-31')
    expect(listed.map((item) => item.title)).toEqual(['晚', '早', '旧'])
    expect(first.id).not.toBe(second.id)
  })

  it('updates only own diary fields', async () => {
    const { service, user } = await createService()
    const entry = await service.create(user.id, { day: '2026-08-23', title: '原', body: '原正文', location: '', photos: [] })

    const updated = await service.update(user.id, entry.id, { title: '新' })
    expect(updated.title).toBe('新')
    expect(updated.body).toBe('原正文')
  })

  it('toggles liked on and off', async () => {
    const { service, user } = await createService()
    const entry = await service.create(user.id, { day: '2026-08-23', title: '', body: '', location: '', photos: [] })

    const liked = await service.toggleLike(user.id, entry.id)
    expect(liked.liked).toBe(true)
    const unliked = await service.toggleLike(user.id, entry.id)
    expect(unliked.liked).toBe(false)
  })

  it('removes a diary', async () => {
    const { service, user } = await createService()
    const entry = await service.create(user.id, { day: '2026-08-23', title: '', body: '', location: '', photos: [] })

    await service.remove(user.id, entry.id)
    expect(await service.list(user.id, '2026-08-01', '2026-08-31')).toHaveLength(0)
  })

  it('rejects accessing another user diary with diary_not_found', async () => {
    const { service, user, other } = await createService()
    const entry = await service.create(user.id, { day: '2026-08-23', title: '', body: '', location: '', photos: [] })

    await expect(service.update(other.id, entry.id, { title: '偷改' })).rejects.toThrow('diary_not_found')
    await expect(service.toggleLike(other.id, entry.id)).rejects.toThrow('diary_not_found')
    await expect(service.remove(other.id, entry.id)).rejects.toThrow('diary_not_found')
    expect(await service.list(user.id, '2026-08-01', '2026-08-31')).toHaveLength(1)
  })
})
