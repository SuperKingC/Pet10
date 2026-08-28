import { describe, expect, it, vi } from 'vitest'
import {
  LaunchAssetError,
  prepareLaunchAssets,
  shouldDecodeLaunchImage,
  type LaunchAsset,
} from './launchAssetProgress'

const assets: LaunchAsset[] = [
  { id: 'pet', label: '小多利', src: 'pet.png' },
  { id: 'nest', label: '小窝', src: 'nest.webp' },
]

describe('launch asset loader', () => {
  it('reports progress from zero to complete after every asset is ready', async () => {
    const progress: number[] = []
    const load = vi.fn(async () => undefined)

    await prepareLaunchAssets(assets, (value) => progress.push(value), load)

    expect(load).toHaveBeenCalledTimes(2)
    expect(progress[0]).toBe(0)
    expect(progress.at(-1)).toBe(1)
    expect(progress).toHaveLength(3)
  })

  it('keeps the completed progress and reports a retryable asset error', async () => {
    const progress: number[] = []
    const load = vi.fn(async (src: string) => {
      if (src === 'nest.webp') throw new Error('offline')
    })

    await expect(prepareLaunchAssets(assets, (value) => progress.push(value), load))
      .rejects.toBeInstanceOf(LaunchAssetError)

    expect(progress.at(-1)).toBe(1)
  })

  it('completes immediately when no resources are required', async () => {
    const progress: number[] = []

    await prepareLaunchAssets([], (value) => progress.push(value), vi.fn())

    expect(progress).toEqual([1])
  })

  it('does not ask WeChat to decode packaged assets as file paths', () => {
    expect(shouldDecodeLaunchImage('assets/xiaoduoli.webp')).toBe(false)
    expect(shouldDecodeLaunchImage('https://cdn.example.com/xiaoduoli.webp')).toBe(true)
    expect(shouldDecodeLaunchImage('wxfile://tmp/avatar.png')).toBe(true)
  })
})
