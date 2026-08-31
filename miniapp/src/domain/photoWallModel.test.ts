import { describe, expect, it } from 'vitest'
import {
  isAutoCard,
  normalizePhotoCaption,
  originBadge,
  photoDayText,
  splitPhotoColumns,
  type PhotoWallItem
} from './photoWallModel'

function item(overrides: Partial<PhotoWallItem> = {}): PhotoWallItem {
  return {
    id: 'p1',
    origin: 'manual',
    photo: 'data:image/jpeg;base64,xx',
    caption: '',
    refKey: null,
    takenDay: null,
    createdAt: '2026-08-30T10:00:00.000Z',
    userName: '阿柴',
    ...overrides
  }
}

describe('photo wall model', () => {
  it('badges automatic origins only', () => {
    expect(originBadge('manual')).toBe('')
    expect(originBadge('levelup')).toBe('🏆 升级')
    expect(originBadge('codeword_streak')).toBe('🔑 暗号')
    expect(originBadge('match_outfit')).toBe('👕 默契')
    expect(originBadge('anniversary')).toBe('📅 纪念日')
  })

  it('treats empty-photo posts as auto cards', () => {
    expect(isAutoCard(item({ photo: '' }))).toBe(true)
    expect(isAutoCard(item())).toBe(false)
  })

  it('normalizes caption to the 40-char room limit', () => {
    expect(normalizePhotoCaption(' 心有灵犀 ')).toBe('心有灵犀')
    expect(normalizePhotoCaption('好'.repeat(60))).toHaveLength(40)
  })

  it('formats day text for date-only and ISO values, blank on garbage', () => {
    expect(photoDayText('2026-08-30')).toBe('8月30日')
    expect(photoDayText('2026-01-09T00:00:00.000Z')).toBe('1月9日')
    expect(photoDayText(null)).toBe('')
    expect(photoDayText('not-a-day')).toBe('')
  })

  it('splits photos into two masonry columns by parity', () => {
    const items = [item({ id: '1' }), item({ id: '2' }), item({ id: '3' })]
    const columns = splitPhotoColumns(items)
    expect(columns).toHaveLength(2)
    expect(columns[0].map((entry) => entry.id)).toEqual(['1', '3'])
    expect(columns[1].map((entry) => entry.id)).toEqual(['2'])
  })
})
