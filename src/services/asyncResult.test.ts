import { describe, expect, it } from 'vitest'
import { toUserError } from './asyncResult'

describe('toUserError', () => {
  it('returns meaningful error messages and uses the fallback otherwise', () => {
    expect(toUserError(new Error('network'), 'fallback')).toBe('network')
    expect(toUserError('request failed', 'fallback')).toBe('request failed')
    expect(toUserError({ message: 'denied' }, 'fallback')).toBe('denied')
    expect(toUserError({}, 'fallback')).toBe('fallback')
  })
})
