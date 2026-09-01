import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

/** 喂食道具选择气泡的源码契约：点喂食弹牛奶/骨头二选一，选中后把 itemId 带到服务端 */
describe('miniapp feed item bubble', () => {
  const barSource = readFileSync(resolve(miniappRoot(), 'src/components/PetActionBar.tsx'), 'utf8')
  const barStyle = readFileSync(resolve(miniappRoot(), 'src/components/PetActionBar.scss'), 'utf8')
  const nestViewSource = readFileSync(resolve(miniappRoot(), 'src/features/main/MiniappNestView.tsx'), 'utf8')
  const indexSource = readFileSync(resolve(miniappRoot(), 'src/pages/index/index.tsx'), 'utf8')
  const petApiSource = readFileSync(resolve(miniappRoot(), 'src/services/petApi.ts'), 'utf8')
  const modelSource = readFileSync(resolve(miniappRoot(), 'src/domain/nestTaskModel.ts'), 'utf8')

  it('opens a picker with milk/bone choices instead of feeding directly', () => {
    // 喂食按钮点击走 openFeedPicker（弹气泡），不再直接 onAction('feed')
    expect(barSource).toContain('if (action === \'feed\') {')
    expect(barSource).toContain('openFeedPicker()')
    // 选项按 FEED_ITEM_IDS 遍历渲染，选中才把 itemId 传出去
    expect(barSource).toContain('FEED_ITEM_IDS.map((itemId)')
    expect(barSource).toContain('onAction(\'feed\', itemId)')
  })

  it('closes the bubble via a full-screen transparent backdrop and refreshes stock on open', () => {
    expect(barSource).toContain('pet-actions-backdrop')
    expect(barSource).toContain('onClick={() => setFeedPickerOpen(false)}')
    // 打开瞬间重拉库存：气泡计数反映最近一次消耗后的真实库存
    expect(barSource).toMatch(/const openFeedPicker = \(\) => \{[^}]*refreshInventory\(\)/)
  })

  it('locks the feed button only when both milk and bone run out', () => {
    expect(barSource).toContain('if (action === \'feed\') return !FEED_ITEM_IDS.some((id) => countOf(id) > 0)')
    expect(modelSource).toContain("FEED_ITEM_IDS: readonly ItemId[] = ['dog_food', 'bone']")
    expect(modelSource).toContain("return '牛奶和骨头都不够啦，去做任务获得一些吧'")
  })

  it('keeps the bubble anchored above the feed button with a reduced-motion fallback', () => {
    expect(barStyle).toMatch(/\.pet-feed-bubble \{[^}]*bottom: calc\(100% \+ 12px\)/)
    // 遮罩 6 < 气泡 7：气泡可点、遮罩兜底其余点按
    expect(barStyle).toContain('.pet-actions-backdrop { position: fixed; inset: 0; z-index: 6; }')
    expect(barStyle).toMatch(/\.pet-feed-bubble \{[^}]*z-index: 7/)
    expect(barStyle).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('threads the chosen itemId through nest view, index page and pet api', () => {
    expect(nestViewSource).toContain('onAction(action, itemId)')
    expect(indexSource).toContain('await petApi.applyAction(roomId, action, itemId)')
    // 请求体只在选中时带 itemId，不改变旧客户端不传字段的形状
    expect(petApiSource).toContain('body: itemId ? { action, itemId } : { action }')
  })
})
