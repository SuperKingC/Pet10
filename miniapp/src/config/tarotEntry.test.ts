import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

describe('miniapp tarot entry', () => {
  it('opens the tarot flow from the paw menu instead of showing a placeholder toast', () => {
    const root = miniappRoot()
    const menuSource = readFileSync(resolve(root, 'src/features/main/MiniappPawMenu.tsx'), 'utf8')
    const pageSource = readFileSync(resolve(root, 'src/pages/index/index.tsx'), 'utf8')

    expect(menuSource).toContain('onOpenTarot(): void')
    expect(menuSource).toContain('onClick={onOpenTarot}')
    expect(menuSource).not.toContain('塔罗占卜即将接入')
    expect(pageSource).toContain('<MiniappTarotFlow')
  })

  it('renders the real spread picker instead of a stage placeholder', () => {
    const flowSource = readFileSync(
      resolve(miniappRoot(), 'src/features/tarot/MiniappTarotFlow.tsx'),
      'utf8',
    )

    expect(flowSource).toContain('<MiniappTarotSpreadStage')
    expect(flowSource).not.toContain('下一阶段将接入与 PWA 一致的牌阵选择')
  })
})
