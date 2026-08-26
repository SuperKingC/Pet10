import type { DiaryEntry } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'

export interface DiaryInput {
  day: string
  title: string
  body: string
  location: string
  photos: string[]
}

export interface DiaryPatch {
  title?: string
  body?: string
  location?: string
  photos?: string[]
}

export function createDiaryService(repositories: RepositoryBundle) {
  const assertOwn = async (id: string, userId: string): Promise<DiaryEntry> => {
    const entry = await repositories.diaries.findById(id)
    if (!entry || entry.userId !== userId) throw new Error('diary_not_found')
    return entry
  }

  return {
    list(userId: string, fromDay: string, toDay: string) {
      return repositories.diaries.listForUser(userId, fromDay, toDay)
    },
    create(userId: string, input: DiaryInput) {
      return repositories.diaries.create({ ...input, userId })
    },
    async update(userId: string, id: string, patch: DiaryPatch) {
      await assertOwn(id, userId)
      const updated = await repositories.diaries.update(id, patch)
      if (!updated) throw new Error('diary_not_found')
      return updated
    },
    async remove(userId: string, id: string) {
      await assertOwn(id, userId)
      await repositories.diaries.deleteById(userId, id)
      return { ok: true }
    },
    async toggleLike(userId: string, id: string) {
      const entry = await assertOwn(id, userId)
      const updated = await repositories.diaries.setLiked(id, !entry.liked)
      if (!updated) throw new Error('diary_not_found')
      return updated
    }
  }
}

export type DiaryService = ReturnType<typeof createDiaryService>
