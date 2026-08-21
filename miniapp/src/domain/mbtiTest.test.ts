import { describe, expect, it } from 'vitest'
import { MBTI_QUESTIONS, calculateMbti } from './mbtiTest'

describe('miniapp MBTI test', () => {
  it('keeps seven questions for every dimension', () => {
    expect(MBTI_QUESTIONS).toHaveLength(28)
    expect(MBTI_QUESTIONS.filter((question) => question.dimension === 'EI')).toHaveLength(7)
    expect(MBTI_QUESTIONS.filter((question) => question.dimension === 'SN')).toHaveLength(7)
    expect(MBTI_QUESTIONS.filter((question) => question.dimension === 'TF')).toHaveLength(7)
    expect(MBTI_QUESTIONS.filter((question) => question.dimension === 'JP')).toHaveLength(7)
  })

  it('calculates the first preference for all first answers', () => {
    expect(calculateMbti(Array(28).fill(true))).toBe('ENTJ')
  })

  it('calculates the second preference for all second answers', () => {
    expect(calculateMbti(Array(28).fill(false))).toBe('ISFP')
  })

  it('uses four first answers as the threshold in each dimension', () => {
    const answers = MBTI_QUESTIONS.map((_, index) => index % 7 < 4)
    expect(calculateMbti(answers)).toBe('ENTJ')
  })

  it('rejects incomplete answers', () => {
    expect(() => calculateMbti(Array(27).fill(true))).toThrow('invalid_mbti_answers')
  })
})
