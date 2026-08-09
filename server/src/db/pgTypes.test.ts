import { describe, expect, it, vi } from 'vitest'
import { configurePostgresTypes } from './pgTypes.js'

describe('PostgreSQL type parsers', () => {
  it('keeps date-only values as YYYY-MM-DD strings', () => {
    const setTypeParser = vi.fn()

    configurePostgresTypes({ setTypeParser })

    expect(setTypeParser).toHaveBeenCalledWith(1082, expect.any(Function))
    const parser = setTypeParser.mock.calls[0][1] as (value: string) => string
    expect(parser('2000-08-08')).toBe('2000-08-08')
  })
})
