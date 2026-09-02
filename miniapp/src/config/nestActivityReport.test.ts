import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

/**
 * 行为上报契约：五子棋完局（小多利/好友）/塔罗解读/新建日记/新建纪念日/保存资料
 * 统一调 nestTaskApi.reportActivity(roomId, metric) → POST /rooms/:roomId/activities，
 * 服务端计入当日每日任务进度（骨头奖励来自下棋/塔罗）。
 */
describe('nest activity reporting contract', () => {
  const apiSource = readFileSync(resolve(miniappRoot(), 'src/services/nestTaskApi.ts'), 'utf8')
  const gobangSource = readFileSync(resolve(miniappRoot(), 'src/features/main/MiniappGobangPanel.tsx'), 'utf8')
  const tarotSource = readFileSync(resolve(miniappRoot(), 'src/features/tarot/MiniappTarotFlow.tsx'), 'utf8')
  const journalFormSource = readFileSync(resolve(miniappRoot(), 'src/features/main/JournalEditorForm.tsx'), 'utf8')
  const anniversarySource = readFileSync(resolve(miniappRoot(), 'src/features/main/JournalAnniversaryPanel.tsx'), 'utf8')
  const meViewSource = readFileSync(resolve(miniappRoot(), 'src/features/main/MiniappMeView.tsx'), 'utf8')
  const modelSource = readFileSync(resolve(miniappRoot(), 'src/domain/nestTaskModel.ts'), 'utf8')

  it('exposes reportActivity posting to the activities endpoint', () => {
    expect(apiSource).toContain("reportActivity(roomId: string, metric: NestActivityMetric)")
    expect(apiSource).toContain('/activities')
    expect(apiSource).toContain("body: { metric }")
  })

  it('reports solo finish to gobang_pet and friend finish to gobang_friend once per game', () => {
    // 单人练习：完局（输赢平）上报
    expect(gobangSource).toContain("nestTaskApi.reportActivity(roomId, 'gobang_pet')")
    expect(gobangSource).toContain("settled.status === 'finished'")
    // 好友对局：完局状态只上报一次
    expect(gobangSource).toContain("nestTaskApi.reportActivity(roomId, 'gobang_friend')")
    expect(gobangSource).toContain('reportedGameIds.current.has(state.id)')
  })

  it('reports tarot when the reading completes', () => {
    expect(tarotSource).toContain("nestTaskApi.reportActivity(roomId, 'tarot')")
    // 上报挂在解读完成处（saveTarotReading 同一函数内）
    const finishBlock = tarotSource.match(/const finishReading = [\s\S]*?dispatch\(\{ type: 'finish-reading'/)
    expect(finishBlock).toBeTruthy()
    expect(finishBlock![0]).toContain("reportActivity(roomId, 'tarot')")
  })

  it('reports diary on create only (edits do not count)', () => {
    expect(journalFormSource).toContain("nestTaskApi.reportActivity(roomId, 'diary')")
    // 上报在 else（新建）分支里，update 分支不报
    expect(journalFormSource).toMatch(/else \{\s*await diaryApi\.create\([\s\S]*?reportActivity\(roomId, 'diary'\)/)
  })

  it('reports anniversary on create only (edits do not count)', () => {
    expect(anniversarySource).toContain("nestTaskApi.reportActivity(roomId, 'anniversary')")
    expect(anniversarySource).toMatch(/const created = await socialApi\.createAnniversary\([\s\S]*?reportActivity\(roomId, 'anniversary'\)/)
  })

  it('reports profile after both name and avatar saves succeed', () => {
    expect(meViewSource).toContain('reportProfileTask()')
    // 两个保存点（昵称/头像）都在 updateProfile 成功之后上报
    expect(meViewSource).toMatch(/await socialApi\.updateProfile\(\{ displayName: trimmed \}\)\s*reportProfileTask\(\)/)
    expect(meViewSource).toMatch(/await socialApi\.updateProfile\(\{ avatarConfig: JSON\.stringify\(avatarConfig\) \}\)\s*reportProfileTask\(\)/)
  })

  it('keeps the inventory chip order bone → milk → ball → soap in the shared model', () => {
    expect(modelSource).toContain("export const INVENTORY_ITEM_ORDER: readonly ItemId[] = ['bone', 'dog_food', 'ball', 'soap']")
    // 动作栏与任务面板都从同一个顺序常量取
    expect(readFileSync(resolve(miniappRoot(), 'src/components/PetActionBar.tsx'), 'utf8')).toContain('orderedItems(inventory)')
    expect(readFileSync(resolve(miniappRoot(), 'src/features/main/MiniappNestTaskPanel.tsx'), 'utf8')).toContain('INVENTORY_ITEM_ORDER.map')
  })
})
