import { describe, expect, it } from 'vitest'
import { createDailyFortune, FORTUNE_COLOR_PALETTE, isValidDailyFortuneContent, zodiacFromBirthday } from './dailyFortune.js'

describe('zodiacFromBirthday', () => {
  it.each([
    ['2000-01-19', '摩羯座'],
    ['2000-01-20', '水瓶座'],
    ['2000-02-18', '水瓶座'],
    ['2000-02-19', '双鱼座'],
    ['2000-03-20', '双鱼座'],
    ['2000-03-21', '白羊座'],
    ['2000-11-22', '天蝎座'],
    ['2000-11-23', '射手座'],
    ['2000-12-21', '射手座'],
    ['2000-12-22', '摩羯座']
  ])('maps %s to %s', (birthday, expected) => {
    expect(zodiacFromBirthday(birthday)).toBe(expected)
  })

  it('rejects missing or invalid birthdays', () => {
    expect(zodiacFromBirthday(null)).toBeNull()
    expect(zodiacFromBirthday('not-a-date')).toBeNull()
    expect(zodiacFromBirthday('2000-02-31')).toBeNull()
  })
})

describe('createDailyFortune', () => {
  const input = { userId: 'user-a', birthday: '2000-08-08', day: '2026-08-08' }

  it('returns stable, bounded editorial content for the same user and day', () => {
    const first = createDailyFortune(input)
    const second = createDailyFortune(input)

    expect(second).toEqual(first)
    expect(first.schemaVersion).toBe(2)
    expect(first.zodiac).toBe('狮子座')
    expect(first.theme.length).toBeGreaterThan(8)
    expect(first.luckyNumber).toBeGreaterThanOrEqual(1)
    expect(first.luckyNumber).toBeLessThanOrEqual(99)
    expect(FORTUNE_COLOR_PALETTE).toContainEqual(first.luckyColor)

    const ratings = [
      first.overall.rating,
      first.love.rating,
      first.study.rating,
      first.work.rating,
      first.wealth.rating,
      first.health.rating
    ]
    expect(ratings.every((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5)).toBe(true)
    expect(first.overall.summary.length).toBeGreaterThan(8)
    expect(first.luckyPhrase.length).toBeGreaterThan(8)

    const paragraphs = [
      first.overall.text,
      first.love.single,
      first.love.partnered,
      first.study.text,
      first.work.text,
      first.wealth.text,
      first.health.text
    ]
    expect(paragraphs.every((paragraph) => paragraph.length >= 70)).toBe(true)
    expect(paragraphs.join('').length).toBeGreaterThanOrEqual(650)
    expect(new Set(paragraphs).size).toBe(paragraphs.length)
    expect(first.love.single).not.toMatch(/^单身(?:的你)?/)
    expect(first.love.partnered).not.toMatch(/^有伴(?:的你)?/)
  })

  it('changes its selection when the date changes', () => {
    const today = createDailyFortune(input)
    const tomorrow = createDailyFortune({ ...input, day: '2026-08-09' })

    expect(tomorrow).not.toEqual(today)
  })

  it('requires a birthday', () => {
    expect(() => createDailyFortune({ ...input, birthday: null })).toThrow('birthday_required')
  })

  it('rejects v2 caches with an unknown zodiac or an empty summary', () => {
    const valid = createDailyFortune(input)

    expect(isValidDailyFortuneContent({ ...valid, zodiac: '任意内容' })).toBe(false)
    expect(isValidDailyFortuneContent({ ...valid, overall: { ...valid.overall, summary: '' } })).toBe(false)
  })
})
