import { describe, expect, it } from 'vitest'
import { readStoredImageInvite, storeImageInvite } from './imageGenerationSession'

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('image generation session storage', () => {
  it('reads a missing invite as an empty string', () => {
    expect(readStoredImageInvite(createStorage())).toBe('')
  })

  it('stores the trimmed invite for the next generation attempt', () => {
    const storage = createStorage()

    storeImageInvite('  invite-1  ', storage)

    expect(readStoredImageInvite(storage)).toBe('invite-1')
  })
})
