import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { TAROT_RESOURCE_URLS } from './tarotAssets'
import { useTarotLauncher } from './useTarotLauncher'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Harness({
  options,
  onReady
}: {
  options: Parameters<typeof useTarotLauncher>[0]
  onReady(value: ReturnType<typeof useTarotLauncher>): void
}) {
  const value = useTarotLauncher(options)
  onReady(value)
  return null
}

describe('tarot launcher', () => {
  it('opens tarot after all assets preload', async () => {
    const preload = vi.fn().mockImplementation(async (_urls, onProgress) => {
      onProgress(0.5)
      onProgress(1)
    })
    const onOpen = vi.fn()
    let current!: ReturnType<typeof useTarotLauncher>
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => root.render(<Harness options={{ preload, onOpen }} onReady={(value) => { current = value }} />))
    await act(async () => { await current.open() })

    expect(preload).toHaveBeenCalledWith(TAROT_RESOURCE_URLS, expect.any(Function))
    expect(onOpen).toHaveBeenCalledOnce()
    expect(current.load).toBeUndefined()
    act(() => root.unmount())
  })

  it('keeps an actionable error state when preload fails', async () => {
    const preload = vi.fn().mockRejectedValue(new Error('network'))
    let current!: ReturnType<typeof useTarotLauncher>
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => root.render(<Harness options={{ preload, onOpen: vi.fn() }} onReady={(value) => { current = value }} />))
    await act(async () => { await current.open() })

    expect(current.load).toEqual({ progress: 0, error: '资源下载失败，请检查网络后重试' })
    act(() => root.unmount())
  })

  it('stays closed when a cancelled preload reports progress or completes later', async () => {
    let reportProgress!: (progress: number) => void
    let finishPreload!: () => void
    const preload = vi.fn().mockImplementation(async (_urls, onProgress) => {
      reportProgress = onProgress
      await new Promise<void>((resolve) => { finishPreload = resolve })
    })
    const onOpen = vi.fn()
    let current!: ReturnType<typeof useTarotLauncher>
    let pending!: Promise<void>
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => root.render(<Harness options={{ preload, onOpen }} onReady={(value) => { current = value }} />))
    act(() => { pending = current.open() })
    expect(current.load).toEqual({ progress: 0 })

    act(() => current.closeLoad())
    act(() => reportProgress(0.5))
    expect(current.load).toBeUndefined()

    finishPreload()
    await act(async () => { await pending })
    expect(current.load).toBeUndefined()
    expect(onOpen).not.toHaveBeenCalled()
    act(() => root.unmount())
  })
})
