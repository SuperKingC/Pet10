import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { MiniappDiary } from '../../services/diaryApi'
import { clearCachedWeekDiaries, getCachedWeekDiaries, setCachedWeekDiaries } from './journalWeekCache'

const getStorageSync = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync,
    request: vi.fn(),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
  },
}))

function entry(id: string, day: string): MiniappDiary {
  return { id, day, title: '', body: '', location: '', photos: [], liked: false, createdAt: day, updatedAt: day }
}

describe('journalWeekCache', () => {
  beforeEach(() => {
    clearCachedWeekDiaries()
  })

  it('returns null when nothing was cached', () => {
    expect(getCachedWeekDiaries('2026-08-24', '2026-08-30')).toBeNull()
  })

  it('returns cached entries for the same week window', () => {
    const items = [entry('a', '2026-08-25')]
    setCachedWeekDiaries('2026-08-24', '2026-08-30', items)
    expect(getCachedWeekDiaries('2026-08-24', '2026-08-30')).toEqual(items)
  })

  it('does not serve entries across different week windows', () => {
    setCachedWeekDiaries('2026-08-24', '2026-08-30', [entry('a', '2026-08-25')])
    expect(getCachedWeekDiaries('2026-08-31', '2026-09-06')).toBeNull()
    expect(getCachedWeekDiaries('2026-08-24', '2026-08-29')).toBeNull()
  })

  it('overwrites with the latest week and clears fully', () => {
    setCachedWeekDiaries('2026-08-24', '2026-08-30', [entry('a', '2026-08-25')])
    setCachedWeekDiaries('2026-08-31', '2026-09-06', [entry('b', '2026-09-01')])
    expect(getCachedWeekDiaries('2026-08-24', '2026-08-30')).toBeNull()
    clearCachedWeekDiaries()
    expect(getCachedWeekDiaries('2026-08-31', '2026-09-06')).toBeNull()
  })
})
