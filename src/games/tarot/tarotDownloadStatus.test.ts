import { describe, expect, it } from 'vitest'
import { formatTarotDownloadTitle } from './tarotDownloadStatus'

describe('tarot download status', () => {
  it('shows the current rounded percentage in the download title', () => {
    expect(formatTarotDownloadTitle(0)).toBe('资源下载中...(0%)')
    expect(formatTarotDownloadTitle(0.426)).toBe('资源下载中...(43%)')
    expect(formatTarotDownloadTitle(1)).toBe('资源下载中...(100%)')
  })
})
