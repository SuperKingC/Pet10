# 小程序第二批体验改进实施计划（小窝背景、运势浮层、脚印弹窗、游戏单机模式）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 spec 第 2、4、5、6 项：修复小窝背景真机不显示并放大快捷按钮、今日运势改全屏浮层、脚印弹窗加高、游戏入口无好友可用 + 五子棋单机 AI 模式。

**Architecture:** 全部改动限定在 `miniapp`（Taro React）。五子棋单机逻辑放 `src/domain/gobangSolo.ts`（纯函数、无网络、可单测）；运势浮层为新增全屏浮层组件；其余为样式与组件小改。不改后端、不改 Web 端、不改登录页与「我的」页。

**Tech Stack:** Taro 4 + React 18 + SCSS + Vitest；提交信息用中文。

**Spec:** `docs/superpowers/specs/2026-08-22-miniapp-six-improvements-design.md`

---

### Task 1: 小窝背景 webp 转 jpg 并替换引用

**Files:**
- Create: `miniapp/src/assets/room-background.jpg`
- Modify: `miniapp/src/components/PetStatusCard.tsx`（第 6 行 require）
- Modify: `miniapp/src/features/main/MiniappNestView.tsx`（第 15 行 require）
- Delete: `miniapp/src/assets/room-background.webp`（替换完成后删除）

- [ ] **Step 1: 将 webp 转换为 jpg（≤180KB）**

在 `d:\Pet10` 下执行（PowerShell，注意用分号不是 &&）：

```powershell
npx --yes sharp-cli -i miniapp/src/assets/room-background.webp -o miniapp/src/assets/room-background.jpg --quality 82
Get-Item miniapp/src/assets/room-background.jpg | Select-Object Length
```

Expected: 生成 `room-background.jpg` 且大小 ≤ 180KB（184320 字节）。若超过，将 `--quality` 降到 75 重试。
若 `sharp-cli` 因网络或环境失败，回退方案：保留 webp 文件，跳到 Step 2 的"路径修复备选"说明，并在完成报告中注明。

- [ ] **Step 2: 替换两处 require 引用**

`miniapp/src/components/PetStatusCard.tsx`：

```ts
const roomBackground = require('../assets/room-background.jpg')
```

`miniapp/src/features/main/MiniappNestView.tsx`：

```ts
const roomBackground = require('../../assets/room-background.jpg')
```

- [ ] **Step 3: 删除旧 webp**

删除 `miniapp/src/assets/room-background.webp`。

- [ ] **Step 4: 构建验证产物**

```powershell
npm --prefix miniapp run build:weapp
```

Expected: 构建成功，`miniapp/dist` 下存在 `room-background.jpg`，主包体积 < 2MB。
若真机仍不显示（用户验证反馈），备选：将两处引用改为包内绝对路径写法 `src={require('../assets/room-background.jpg')}` 已不生效时，改为在 JSX 中直接写 `src="/assets/room-background.jpg"` 并确保 dist 根目录有 `assets/room-background.jpg`。

- [ ] **Step 5: 提交**

```powershell
git add miniapp/src/assets/room-background.jpg miniapp/src/components/PetStatusCard.tsx miniapp/src/features/main/MiniappNestView.tsx miniapp/src/assets/room-background.webp
git commit -m "fix: 小窝背景 webp 转 jpg 修复真机不显示"
```

---

### Task 2: 小窝右侧快捷按钮放大

**Files:**
- Modify: `miniapp/src/features/main/MiniappNestView.scss`

- [ ] **Step 1: 修改样式**

将 `.miniapp-nest__shortcuts` 的 `gap: 12px` 改为 `gap: 16px`；`.miniapp-nest__shortcut` 与 `.miniapp-nest__shortcut image`：

```scss
.miniapp-nest__shortcut {
  display: flex;
  width: 128px;
  flex-direction: column;
  align-items: center;
}

.miniapp-nest__shortcut image {
  width: 128px;
  height: 133px;
}
```

（图片原始比例约 100:104，高度按比例同步放大。）

- [ ] **Step 2: 提交**

```powershell
git add miniapp/src/features/main/MiniappNestView.scss
git commit -m "style: 小窝右侧快捷按钮放大至 128px"
```

---

### Task 3: 今日运势全屏浮层组件

**Files:**
- Create: `miniapp/src/features/main/MiniappFortuneView.tsx`
- Create: `miniapp/src/features/main/MiniappFortuneView.scss`
- Modify: `miniapp/src/features/main/MiniappCalendarView.tsx`
- Modify: `miniapp/src/features/main/MiniappCalendarView.scss`

- [ ] **Step 1: 创建 MiniappFortuneView.tsx**

```tsx
import { Button, Text, View } from '@tarojs/components'
import type { MiniappFortune } from '../../services/socialApi'
import './MiniappFortuneView.scss'

const fortuneSections = [
  ['love', '感情'],
  ['study', '学习'],
  ['work', '工作'],
  ['wealth', '财富'],
  ['health', '健康'],
] as const

interface MiniappFortuneViewProps {
  fortune: MiniappFortune
  onClose(): void
}

export function MiniappFortuneView({ fortune, onClose }: MiniappFortuneViewProps) {
  return (
    <View className="miniapp-fortune-view">
      <View className="miniapp-fortune-view__header">
        <Button className="miniapp-fortune-view__back" onClick={onClose}>‹</Button>
        <Text className="miniapp-fortune-view__title">今日运势 · {fortune.content.zodiac}</Text>
        <View className="miniapp-fortune-view__header-spacer" />
      </View>
      <View className="miniapp-fortune-view__body">
        <View className="miniapp-fortune-view__overall">
          <Text className="miniapp-fortune-view__label">综合运势</Text>
          <Text className="miniapp-fortune-view__summary">{fortune.content.overall.summary}</Text>
          <Text className="miniapp-fortune-view__stars">{'★'.repeat(fortune.content.overall.rating)}</Text>
          {fortune.content.overall.text && <Text className="miniapp-fortune-view__text">{fortune.content.overall.text}</Text>}
          <Text className="miniapp-fortune-view__meta">幸运色：{fortune.content.luckyColor.name} · 幸运数字：{fortune.content.luckyNumber}</Text>
        </View>
        {fortuneSections.map(([key, label]) => {
          const section = fortune.content[key]
          if (!section) return null
          return (
            <View key={key} className="miniapp-fortune-view__section">
              <View className="miniapp-fortune-view__section-head">
                <Text>{label}</Text>
                <Text>{'★'.repeat(section.rating)}</Text>
              </View>
              <Text className="miniapp-fortune-view__section-body">{'text' in section ? section.text : section.partnered}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
```

- [ ] **Step 2: 创建 MiniappFortuneView.scss**

```scss
.miniapp-fortune-view {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  background: #fff8ee;
}

.miniapp-fortune-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(12px + env(safe-area-inset-top)) 14px 10px;
  background: #fffaf6;
  border-bottom: 1px solid rgba(96, 67, 50, .08);
}

.miniapp-fortune-view__back {
  width: 36px;
  height: 36px;
  padding: 0;
  color: #80685d;
  background: #f3eae4;
  border: 0;
  border-radius: 13px;
  font-size: 20px;
}

.miniapp-fortune-view__back::after { border: 0; }

.miniapp-fortune-view__title {
  color: #382b23;
  font-size: var(--font-size-section-title);
  font-weight: var(--font-weight-bold);
}

.miniapp-fortune-view__header-spacer { width: 36px; }

.miniapp-fortune-view__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 16px 14px calc(24px + env(safe-area-inset-bottom));
}

.miniapp-fortune-view__overall {
  padding: 16px;
  background: #fff;
  border: 1px solid #ead5c2;
  border-radius: 20px;
  box-shadow: 0 7px 20px rgba(70, 48, 37, .05);
}

.miniapp-fortune-view__label { display: block; color: #b18c79; font-size: var(--font-size-aux); }
.miniapp-fortune-view__summary { display: block; margin-top: 6px; color: #5e3b1d; font-size: var(--font-size-card-title); font-weight: var(--font-weight-bold); }
.miniapp-fortune-view__stars { display: block; margin-top: 4px; color: #e89264; font-size: var(--font-size-body); }
.miniapp-fortune-view__text { display: block; margin-top: 8px; color: #8e776a; font-size: var(--font-size-aux); line-height: 1.55; }
.miniapp-fortune-view__meta { display: block; margin-top: 8px; color: #a89489; font-size: var(--font-size-aux); }

.miniapp-fortune-view__section { padding: 12px; background: #fff; border: 1px solid #f0e8e2; border-radius: 16px; }
.miniapp-fortune-view__section-head { display: flex; justify-content: space-between; margin-bottom: 6px; color: #8a4f37; font-size: var(--font-size-aux); font-weight: var(--font-weight-bold); }
.miniapp-fortune-view__section-body { display: block; color: #8e776a; font-size: var(--font-size-aux); line-height: 1.55; }
```

- [ ] **Step 3: 改造 MiniappCalendarView.tsx**

3a. 顶部新增导入（`fortuneSections` 常量从本文件删除，已移入浮层组件）：

```tsx
import Taro from '@tarojs/taro'
import { MiniappFortuneView } from './MiniappFortuneView'
```

3b. 删除本文件中的 `fortuneSections` 常量定义；将 `const [fortuneOpen, setFortuneOpen] = useState(false)` 改名为 `const [fortuneOverlayOpen, setFortuneOverlayOpen] = useState(false)`。

3c. 将运势卡片 JSX（原 `.miniapp-calendar__fortune` 整块）替换为：

```tsx
<View className="miniapp-calendar__fortune">
  <View className="miniapp-calendar__fortune-header">
    <View>
      <Text className="miniapp-calendar__fortune-label">今日运势</Text>
      <Text className="miniapp-calendar__fortune-title">
        {fortune ? `${fortune.content.overall.summary} ${'★'.repeat(fortune.content.overall.rating)}` : (fortuneMessage || '今日运势加载中')}
      </Text>
    </View>
    <Button onClick={() => {
      if (fortune) setFortuneOverlayOpen(true)
      else Taro.showToast({ title: fortuneMessage || '今日运势暂时无法加载', icon: 'none' })
    }}>查看详情 ›</Button>
  </View>
  {fortune && <Text className="miniapp-calendar__fortune-meta">幸运色：{fortune.content.luckyColor.name} · 幸运数字：{fortune.content.luckyNumber}</Text>}
</View>
{fortuneOverlayOpen && fortune && (
  <MiniappFortuneView fortune={fortune} onClose={() => setFortuneOverlayOpen(false)} />
)}
```

（原 `fortuneOpen && fortune` 的内联 `.miniapp-calendar__fortune-details` 块整体删除。）

3d. `MiniappCalendarView.scss` 中删除不再使用的 `.miniapp-calendar__fortune-details` 与 `.miniapp-calendar__fortune-detail` 两条规则；`.miniapp-calendar__month-bar button, .miniapp-calendar__fortune-header button` 选择器保留不动。

- [ ] **Step 4: 测试验证**

```powershell
npm --prefix miniapp test
```

Expected: 全部通过（本任务不改领域逻辑，确认无回归）。

- [ ] **Step 5: 提交**

```powershell
git add miniapp/src/features/main/MiniappFortuneView.tsx miniapp/src/features/main/MiniappFortuneView.scss miniapp/src/features/main/MiniappCalendarView.tsx miniapp/src/features/main/MiniappCalendarView.scss
git commit -m "feat: 今日运势改为全屏浮层展示"
```

---

### Task 4: 脚印弹窗加高（仅高度，内部元素不变）

**Files:**
- Modify: `miniapp/src/features/main/MiniappPawMenu.scss`

- [ ] **Step 1: 修改 sheet 高度**

`.miniapp-paw-menu__sheet` 增加三条属性（其余不动）：

```scss
.miniapp-paw-menu__sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  max-height: 84vh;
  overflow-y: auto;
  padding: 10px 18px calc(24px + env(safe-area-inset-bottom));
  background: #fffaf6;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -12px 30px rgba(70, 48, 37, .16);
}

.miniapp-paw-menu__body {
  min-height: 62vh;
}
```

同时修改 `MiniappPawMenu.tsx`：将 `<View className="miniapp-paw-menu__handle" />` 之后的 header、codeword、grid 三块用一个包裹层撑高——把 sheet 内除 handle 外的内容包进 `<View className="miniapp-paw-menu__body">…</View>`。这样弹窗整体变高，但内部字号与按钮尺寸完全不变。

- [ ] **Step 2: 提交**

```powershell
git add miniapp/src/features/main/MiniappPawMenu.scss miniapp/src/features/main/MiniappPawMenu.tsx
git commit -m "style: 脚印弹窗整体加高"
```

---

### Task 5: 五子棋单机领域逻辑（TDD）

**Files:**
- Test: `miniapp/src/domain/gobangSolo.test.ts`
- Create: `miniapp/src/domain/gobangSolo.ts`

- [ ] **Step 1: 写失败测试**

创建 `miniapp/src/domain/gobangSolo.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { applySoloMove, checkFive, chooseAiMove, createEmptyBoard, createSoloGame, SOLO_BOARD_SIZE } from './gobangSolo'

function lineBoard(color: 1 | 2, count: number, y: number, startX: number) {
  const board = createEmptyBoard()
  for (let i = 0; i < count; i += 1) board[y * SOLO_BOARD_SIZE + startX + i] = color
  return board
}

describe('checkFive', () => {
  it('detects five in a row horizontally, vertically and diagonally', () => {
    expect(checkFive(lineBoard(1, 5, 7, 3), 7, 7, 1)).toBe(true)
    const vertical = createEmptyBoard()
    for (let y = 2; y < 7; y += 1) vertical[y * SOLO_BOARD_SIZE + 4] = 2
    expect(checkFive(vertical, 6, 4, 2)).toBe(true)
    const diagonal = createEmptyBoard()
    for (let i = 0; i < 5; i += 1) diagonal[(3 + i) * SOLO_BOARD_SIZE + 3 + i] = 1
    expect(checkFive(diagonal, 7, 7, 1)).toBe(true)
  })

  it('does not report four stones as a win', () => {
    expect(checkFive(lineBoard(1, 4, 7, 3), 6, 7, 1)).toBe(false)
  })
})

describe('chooseAiMove', () => {
  it('plays the center on an empty board', () => {
    expect(chooseAiMove(createEmptyBoard(), 2)).toEqual({ x: 7, y: 7 })
  })

  it('blocks an opponent open four even if it could make its own three', () => {
    const board = lineBoard(1, 4, 7, 5)
    board[3 * SOLO_BOARD_SIZE + 7] = 2
    board[4 * SOLO_BOARD_SIZE + 7] = 2
    const move = chooseAiMove(board, 2)
    expect([{ x: 4, y: 7 }, { x: 9, y: 7 }]).toContainEqual(move)
  })

  it('prefers completing its own five over blocking opponent four', () => {
    const board = lineBoard(1, 4, 7, 5)
    for (let i = 0; i < 4; i += 1) board[10 * SOLO_BOARD_SIZE + 3 + i] = 2
    const move = chooseAiMove(board, 2)
    expect([{ x: 2, y: 10 }, { x: 7, y: 10 }]).toContainEqual(move)
  })
})

describe('applySoloMove', () => {
  it('alternates player and AI stones and detects player win', () => {
    let game = createSoloGame()
    expect(game.turn).toBe('player')
    game = applySoloMove(game, 7, 7)
    expect(game.board[7 * SOLO_BOARD_SIZE + 7]).toBe(1)
    expect(game.turn).toBe('ai')
    expect(game.status).toBe('playing')
    game = applySoloMove(game, 7, 8)
    expect(game.board[8 * SOLO_BOARD_SIZE + 7]).toBe(2)
    expect(game.turn).toBe('player')

    let win = createSoloGame()
    win = applySoloMove(win, 0, 0)
    win = applySoloMove(win, 0, 1)
    win = applySoloMove(win, 1, 0)
    win = applySoloMove(win, 1, 1)
    win = applySoloMove(win, 2, 0)
    win = applySoloMove(win, 2, 1)
    win = applySoloMove(win, 3, 0)
    win = applySoloMove(win, 3, 1)
    win = applySoloMove(win, 4, 0)
    expect(win.status).toBe('finished')
    expect(win.winner).toBe('player')
  })
})
```

说明：AI 回应固定选评分最高的点，测试通过构造"AI 只有一个明显最优解"的棋形保证确定性；`toContainEqual` 覆盖对称端点二选一。

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm --prefix miniapp test -- gobangSolo
```

Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 gobangSolo.ts**

创建 `miniapp/src/domain/gobangSolo.ts`：

```ts
export const SOLO_BOARD_SIZE = 15

export type SoloColor = 1 | 2
export type SoloBoard = number[]

export interface SoloMove { x: number; y: number }

export interface SoloGame {
  board: SoloBoard
  turn: 'player' | 'ai'
  status: 'playing' | 'finished'
  winner: 'player' | 'ai' | 'draw' | null
  moves: Array<SoloMove & { color: SoloColor }>
}

export function createEmptyBoard(): SoloBoard {
  return Array.from({ length: SOLO_BOARD_SIZE * SOLO_BOARD_SIZE }, () => 0)
}

const inBounds = (x: number, y: number) => x >= 0 && x < SOLO_BOARD_SIZE && y >= 0 && y < SOLO_BOARD_SIZE

export function checkFive(board: SoloBoard, x: number, y: number, color: SoloColor): boolean {
  const directions: Array<[number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (const [dx, dy] of directions) {
    let count = 1
    for (const sign of [1, -1]) {
      let step = 1
      while (true) {
        const nx = x + dx * step * sign
        const ny = y + dy * step * sign
        if (!inBounds(nx, ny) || board[ny * SOLO_BOARD_SIZE + nx] !== color) break
        count += 1
        step += 1
      }
    }
    if (count >= 5) return true
  }
  return false
}

export function createSoloGame(): SoloGame {
  return { board: createEmptyBoard(), turn: 'player', status: 'playing', winner: null, moves: [] }
}

export function applySoloMove(game: SoloGame, x: number, y: number): SoloGame {
  if (game.status !== 'playing' || game.turn !== 'player') return game
  const index = y * SOLO_BOARD_SIZE + x
  if (!inBounds(x, y) || game.board[index] !== 0) return game
  const board = [...game.board]
  board[index] = 1
  const moves = [...game.moves, { x, y, color: 1 as SoloColor }]
  if (checkFive(board, x, y, 1)) {
    return { board, turn: 'player', status: 'finished', winner: 'player', moves }
  }
  if (moves.length === SOLO_BOARD_SIZE * SOLO_BOARD_SIZE) {
    return { board, turn: 'player', status: 'finished', winner: 'draw', moves }
  }
  const aiMove = chooseAiMove(board, 2)
  board[aiMove.y * SOLO_BOARD_SIZE + aiMove.x] = 2
  moves.push({ ...aiMove, color: 2 })
  if (checkFive(board, aiMove.x, aiMove.y, 2)) {
    return { board, turn: 'player', status: 'finished', winner: 'ai', moves }
  }
  return { board, turn: 'player', status: 'playing', winner: null, moves }
}

function maxLine(board: SoloBoard, x: number, y: number, color: SoloColor): number {
  let best = 0
  const directions: Array<[number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (const [dx, dy] of directions) {
    let count = 1
    for (const sign of [1, -1]) {
      let step = 1
      while (true) {
        const nx = x + dx * step * sign
        const ny = y + dy * step * sign
        if (!inBounds(nx, ny) || board[ny * SOLO_BOARD_SIZE + nx] !== color) break
        count += 1
        step += 1
      }
    }
    best = Math.max(best, count)
  }
  return best
}

function scorePoint(board: SoloBoard, x: number, y: number, color: SoloColor): number {
  const line = maxLine(board, x, y, color)
  if (line >= 5) return 100000
  if (line === 4) return 10000
  if (line === 3) return 1000
  if (line === 2) return 100
  return 0
}

export function chooseAiMove(board: SoloBoard, aiColor: SoloColor = 2): SoloMove {
  const opponent: SoloColor = aiColor === 1 ? 2 : 1
  const hasStone = board.some((cell) => cell !== 0)
  if (!hasStone) return { x: 7, y: 7 }
  const center = Math.floor(SOLO_BOARD_SIZE / 2)
  let best: SoloMove | null = null
  let bestScore = -1
  for (let y = 0; y < SOLO_BOARD_SIZE; y += 1) {
    for (let x = 0; x < SOLO_BOARD_SIZE; x += 1) {
      if (board[y * SOLO_BOARD_SIZE + x] !== 0) continue
      const offense = scorePoint(board, x, y, aiColor)
      const defense = scorePoint(board, x, y, opponent) * 0.9
      const proximity = 7 - Math.hypot(x - center, y - center) / 8
      const score = offense + defense + proximity
      if (score > bestScore) {
        bestScore = score
        best = { x, y }
      }
    }
  }
  return best ?? { x: center, y: center }
}
```

- [ ] **Step 4: 运行测试确认通过**

```powershell
npm --prefix miniapp test -- gobangSolo
```

Expected: 4 个用例全部 PASS。

- [ ] **Step 5: 提交**

```powershell
git add miniapp/src/domain/gobangSolo.ts miniapp/src/domain/gobangSolo.test.ts
git commit -m "feat: 新增五子棋单机领域逻辑与测试"
```

---

### Task 6: 游戏入口放开 + 五子棋面板模式选择

**Files:**
- Modify: `miniapp/src/features/main/MiniappPawMenu.tsx`（第 81-85 行游戏按钮）
- Modify: `miniapp/src/features/main/MiniappGobangPanel.tsx`
- Modify: `miniapp/src/features/main/MiniappGobangPanel.scss`

- [ ] **Step 1: PawMenu 游戏按钮解除禁用**

`MiniappPawMenu.tsx` 中游戏按钮改为：

```tsx
<Button onClick={onOpenGames}>
  <Image className="miniapp-paw-menu__entry-icon" src={gameIcon} mode="aspectFit" fadeIn={false} />
  <Text className="miniapp-paw-menu__entry-title">游戏</Text>
  <Text className="miniapp-paw-menu__entry-caption">五子棋和更多玩法</Text>
</Button>
```

（移除 `disabled={!roomId}` 与 `roomId ? … : …` 三元文案。）

- [ ] **Step 2: 改造 MiniappGobangPanel 为模式选择结构**

在 `MiniappGobangPanel.tsx` 顶部新增导入：

```tsx
import { applySoloMove, createSoloGame, SOLO_BOARD_SIZE, type SoloGame } from '../../domain/gobangSolo'
```

组件内新增状态：

```tsx
const [mode, setMode] = useState<'select' | 'solo' | 'friend'>('select')
const [soloGame, setSoloGame] = useState<SoloGame | null>(null)
```

将现有的两个 `useEffect`（refresh 与轮询）改为仅在好友模式下执行：

```tsx
useEffect(() => {
  if (mode !== 'friend') return
  void refresh()
  const timer = setInterval(() => void refresh(), 2000)
  return () => clearInterval(timer)
}, [roomId, mode])
```

JSX 结构改为：

```tsx
return (
  <View className="miniapp-gobang">
    <View className="miniapp-gobang__header">
      <Button onClick={mode === 'select' ? onClose : () => setMode('select')}>‹</Button>
      <View>
        <Text>五子棋</Text>
        <Text>{mode === 'solo' ? '单人练习 · 和小多利机器人下' : mode === 'friend' ? `和 ${friendName} 实时对弈` : '选一种玩法'}</Text>
      </View>
    </View>

    {mode === 'select' && (
      <View className="miniapp-gobang__modes">
        <Button className="miniapp-gobang__mode" onClick={() => { setSoloGame(createSoloGame()); setMode('solo') }}>
          <Text className="miniapp-gobang__mode-title">单人练习</Text>
          <Text className="miniapp-gobang__mode-caption">和小多利机器人下一盘</Text>
        </Button>
        <Button
          className="miniapp-gobang__mode"
          disabled={!roomId || !friendId}
          onClick={() => setMode('friend')}
        >
          <Text className="miniapp-gobang__mode-title">好友对战</Text>
          <Text className="miniapp-gobang__mode-caption">{roomId && friendId ? '邀请好友实时对弈' : '绑定好友后可邀请对战'}</Text>
        </Button>
      </View>
    )}

    {mode === 'solo' && soloGame && (
      <>
        <Text className="miniapp-gobang__status">
          {soloGame.status === 'finished'
            ? soloGame.winner === 'player' ? '你赢啦！' : soloGame.winner === 'ai' ? '小多利机器人获胜' : '平局'
            : '轮到你落子（黑棋）'}
        </Text>
        <View className="miniapp-gobang__board">
          {boardCells.map(({ x, y }) => {
            const stone = soloGame.board[y * SOLO_BOARD_SIZE + x]
            return <View key={`${x}-${y}`} className="miniapp-gobang__cell" onClick={() => setSoloGame(applySoloMove(soloGame, x, y))}>
              {stone !== 0 && <View className={`miniapp-gobang__stone miniapp-gobang__stone--${stone === 1 ? 'black' : 'white'}`} />}
            </View>
          })}
        </View>
        {soloGame.status === 'finished' && <Button className="miniapp-gobang__resign" onClick={() => setSoloGame(createSoloGame())}>再来一局</Button>}
      </>
    )}

    {mode === 'friend' && (
      <>
        {/* 原 invitations / !game 空态 / 联网棋盘三块 JSX 原样保留在这里 */}
      </>
    )}
  </View>
)
```

实现要点：把原来 header 以下的所有 JSX（`invitations.map`、`!game ? idle : 棋盘`、notice）整体挪进 `mode === 'friend'` 分支，**一字不改**；仅去掉原来的外层 header 返回键直连 `onClose` 的写法（已由上面的条件返回替代）。

- [ ] **Step 3: 模式选择样式**

`MiniappGobangPanel.scss` 追加：

```scss
.miniapp-gobang__modes { display: flex; flex-direction: column; gap: 14px; margin: 24px 0; }
.miniapp-gobang__mode { display: block; padding: 20px 18px; background: #fff; border: 1px solid #ead5c2; border-radius: 18px; text-align: left; }
.miniapp-gobang__mode::after { border: 0; }
.miniapp-gobang__mode[disabled] { opacity: .55; }
.miniapp-gobang__mode-title { display: block; color: #5e3b1d; font-size: var(--font-size-card-title); font-weight: var(--font-weight-bold); }
.miniapp-gobang__mode-caption { display: block; margin-top: 6px; color: #a89489; font-size: var(--font-size-aux); }
```

- [ ] **Step 4: 测试验证**

```powershell
npm --prefix miniapp test
```

Expected: 全部通过。

- [ ] **Step 5: 提交**

```powershell
git add miniapp/src/features/main/MiniappPawMenu.tsx miniapp/src/features/main/MiniappGobangPanel.tsx miniapp/src/features/main/MiniappGobangPanel.scss
git commit -m "feat: 游戏入口无好友可用并新增五子棋单人模式"
```

---

### Task 7: 构建与全量验证

**Files:** 无新增改动

- [ ] **Step 1: 构建 weapp 产物**

```powershell
npm --prefix miniapp run build:weapp
```

Expected: 构建成功；`miniapp/dist` 中有 `room-background.jpg`（无残留 `.webp`）；主包 < 2MB。

- [ ] **Step 2: 全量测试**

```powershell
npm --prefix miniapp test
```

Expected: 全部通过。

- [ ] **Step 3: 开发者工具/真机人工验证清单（由用户确认）**

- 小窝页背景图正常显示（开发者工具 + 真机）
- 右侧三个快捷按钮明显变大且不被遮挡
- 小记页点「查看详情 ›」打开运势全屏浮层，返回键可退出；未设置生日时点击弹 Toast
- 脚印弹窗整体变高，内部文字按钮大小不变
- 无好友时游戏按钮可点，弹窗内有五子棋入口；单人模式可正常对弈、可再来一局
- 有好友时好友对战流程与之前一致

- [ ] **Step 4: 完成报告**

按 AGENTS.md 要求报告：执行的命令与结果、未验证区域（真机背景显示需用户反馈）、开发者工具预览入口。
