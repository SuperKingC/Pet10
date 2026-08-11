import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Conversation } from '../domain/types'
import { NestTab } from './NestTab'
import { PawMenu } from './PawMenu'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const pairRoom: Conversation = {
  roomId: 'room-1',
  type: 'pair',
  title: '共同小窝',
  avatarUrl: null,
  proactiveEnabled: true,
  updatedAt: '2026-08-11T00:00:00.000Z'
}

describe('PawMenu', () => {
  it('contains the migrated daily and game entrances', () => {
    const markup = renderToStaticMarkup(
      <PawMenu
        open
        pairRoom={pairRoom}
        onClose={vi.fn()}
        onOpenGame={vi.fn()}
      />
    )

    expect(markup).toContain('每日暗号')
    expect(markup).toContain('游戏')
    expect(markup).toContain('足迹地图')
    expect(markup).toContain('塔罗占卜')
  })

  it('opens the selected existing game and closes the drawer', async () => {
    const onClose = vi.fn()
    const onOpenGame = vi.fn()
    const container = document.createElement('div')
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <PawMenu
          open
          pairRoom={pairRoom}
          onClose={onClose}
          onOpenGame={onOpenGame}
        />
      )
    })

    const mapButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('足迹地图'))

    await act(async () => {
      mapButton?.click()
    })

    expect(onOpenGame).toHaveBeenCalledWith('map')
    expect(onClose).toHaveBeenCalledTimes(1)

    await act(async () => root.unmount())
  })

  it('removes daily and game entrances from the nest page', () => {
    const markup = renderToStaticMarkup(
      <NestTab
        pairRoom={pairRoom}
        pet={null}
        friendNames={{}}
        onAction={vi.fn()}
        onOpenMemories={vi.fn()}
      />
    )

    expect(markup).not.toContain('每日暗号')
    expect(markup).not.toContain('塔罗占卜')
    expect(markup).not.toContain('五子棋')
    expect(markup).not.toContain('足迹地图')
  })
})
