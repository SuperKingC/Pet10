# 小记页重设计（大日历 + 双人心情图标） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 小程序「小记」页重设计为轻盈格纸风大日历，每天上下两枚手绘小多利心情头像（上=我、下=好友），点日期弹窗记录/查看心情。

**Architecture:** 纯前端改动（仅 `miniapp/`）。`calendarModel.ts` 增加周一起始与心情映射纯函数（可测试）；`MiniappCalendarView` 重写为格纸日历 + `MiniappModal` 心情弹窗；图标为 4 张 160×160 手绘水彩小多利表情 PNG。数据复用 `socialApi.listMoods/setMood`。

**Tech Stack:** Taro 4 + React 18 + SCSS + Vitest；PowerShell System.Drawing 压缩图片；微信开发者工具 CLI 清缓存重编译。

**Spec:** `docs/superpowers/specs/2026-08-23-journal-calendar-redesign-design.md`
**视觉基准:** `.superpowers/brainstorm/journal-20260823/content/journal-final-preview.html`

---

### Task 1: 心情图标资源入库

**Files:**
- Create: `miniapp/src/assets/moods/mood-1.png` … `mood-4.png`

源图（已确认的 v2 手绘水彩版）：
- `C:\Users\23681\.qoder\vibe_images\duoli-mood-1-low-v2_1787439457.png` → mood-1.png（低落）
- `C:\Users\23681\.qoder\vibe_images\duoli-mood-2-ok-v2_1787439456.png` → mood-2.png（一般）
- `C:\Users\23681\.qoder\vibe_images\duoli-mood-3-good-v2_1787439458.png` → mood-3.png（不错）
- `C:\Users\23681\.qoder\vibe_images\duoli-mood-4-great-v2_1787439457.png` → mood-4.png（特别好）

- [ ] **Step 1: 用 System.Drawing 缩放为 160×160 并写入 assets**

PowerShell（在 `d:\Pet10` 下执行）：

```powershell
Add-Type -AssemblyName System.Drawing
function Resize-Icon($Src, $Dst) {
  $img = [System.Drawing.Image]::FromFile($Src)
  $out = New-Object System.Drawing.Bitmap(160, 160)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($img, 0, 0, 160, 160)
  $out.Save($Dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $out.Dispose(); $img.Dispose()
}
New-Item -ItemType Directory -Force -Path "miniapp\src\assets\moods" | Out-Null
Resize-Icon "C:\Users\23681\.qoder\vibe_images\duoli-mood-1-low-v2_1787439457.png" "d:\Pet10\miniapp\src\assets\moods\mood-1.png"
Resize-Icon "C:\Users\23681\.qoder\vibe_images\duoli-mood-2-ok-v2_1787439456.png" "d:\Pet10\miniapp\src\assets\moods\mood-2.png"
Resize-Icon "C:\Users\23681\.qoder\vibe_images\duoli-mood-3-good-v2_1787439458.png" "d:\Pet10\miniapp\src\assets\moods\mood-3.png"
Resize-Icon "C:\Users\23681\.qoder\vibe_images\duoli-mood-4-great-v2_1787439457.png" "d:\Pet10\miniapp\src\assets\moods\mood-4.png"
```

- [ ] **Step 2: 校验尺寸与体积（单张 < 180KB）**

```powershell
Get-ChildItem miniapp\src\assets\moods\*.png | Select-Object Name, Length
```

Expected: 4 个文件，Length 均 < 184800 字节。

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/assets/moods
git commit -m "feat(miniapp): 新增小多利手绘心情图标资源"
```

---

### Task 2: calendarModel 纯函数扩展（TDD）

**Files:**
- Modify: `miniapp/src/features/main/calendarModel.ts`
- Test: `miniapp/src/features/main/calendarModel.test.ts`

- [ ] **Step 1: 写失败测试**

在 `calendarModel.test.ts` 追加：

```ts
import { buildMoodByDay, getMondayLead } from './calendarModel'

// 放入现有 describe 或新建：
describe('miniapp calendar monday lead', () => {
  it('calculates monday-first leading blanks', () => {
    // 2026-08-01 周六 → 前置 5 格
    expect(getMondayLead(new Date(2026, 7, 1))).toBe(5)
    // 2026-02-01 周日 → 前置 6 格
    expect(getMondayLead(new Date(2026, 1, 1))).toBe(6)
    // 2026-06-01 周一 → 前置 0 格
    expect(getMondayLead(new Date(2026, 5, 1))).toBe(0)
  })
})

describe('miniapp calendar mood mapping', () => {
  it('splits moods into mine and friend per day', () => {
    const moods = [
      { userId: 'me', day: '2026-08-17', level: 4 },
      { userId: 'friend', day: '2026-08-17', level: 3 },
      { userId: 'me', day: '2026-08-18', level: 2 },
    ]
    const map = buildMoodByDay(moods, 'me')
    expect(map.get('2026-08-17')?.mine?.level).toBe(4)
    expect(map.get('2026-08-17')?.friend?.level).toBe(3)
    expect(map.get('2026-08-18')?.mine?.level).toBe(2)
    expect(map.get('2026-08-18')?.friend).toBeUndefined()
  })

  it('keeps the latest entry per person per day', () => {
    const moods = [
      { userId: 'me', day: '2026-08-17T08:00:00Z', level: 2 },
      { userId: 'me', day: '2026-08-17T20:00:00Z', level: 4 },
    ]
    const map = buildMoodByDay(moods, 'me')
    expect(map.get('2026-08-17')?.mine?.level).toBe(4)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd miniapp; npx vitest --run src/features/main/calendarModel.test.ts`
Expected: FAIL（`getMondayLead` / `buildMoodByDay` 未定义）。

- [ ] **Step 3: 实现**

在 `calendarModel.ts` 追加：

```ts
export interface CalendarMoodEntry {
  userId: string
  day: string
  level: number
}

export interface DayMoods {
  mine?: CalendarMoodEntry
  friend?: CalendarMoodEntry
}

export function getMondayLead(date: Date): number {
  return (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7
}

export function buildMoodByDay(moods: CalendarMoodEntry[], myUserId: string): Map<string, DayMoods> {
  const map = new Map<string, DayMoods>()
  for (const mood of moods) {
    const day = mood.day.slice(0, 10)
    const entry = map.get(day) ?? {}
    if (mood.userId === myUserId) entry.mine = mood
    else entry.friend = mood
    map.set(day, entry)
  }
  return map
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd miniapp; npx vitest --run src/features/main/calendarModel.test.ts`
Expected: PASS（含原有用例）。

- [ ] **Step 5: Commit**

```bash
git add miniapp/src/features/main/calendarModel.ts miniapp/src/features/main/calendarModel.test.ts
git commit -m "feat(miniapp): 日历模型支持周一起始与双人心情映射"
```

---

### Task 3: 重写 MiniappCalendarView（视图 + 弹窗 + 样式）

**Files:**
- Modify: `miniapp/src/features/main/MiniappCalendarView.tsx`（整体重写）
- Modify: `miniapp/src/features/main/MiniappCalendarView.scss`（整体重写）

- [ ] **Step 1: 重写 `MiniappCalendarView.tsx`**

完整新内容：

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappModal } from '../../components/MiniappModal'
import { socialApi, type MiniappFortune, type MiniappMood } from '../../services/socialApi'
import { buildMoodByDay, getCalendarMonth, getMondayLead, localDayKey, shiftMonth, type DayMoods } from './calendarModel'
import { getFortuneAvailability } from './miniappViewModel'
import { MiniappFortuneView } from './MiniappFortuneView'
import './MiniappCalendarView.scss'

interface MiniappCalendarViewProps {
  roomId: string
  myUserId: string
  friendId: string
  friendName: string
}

const moodIcons = [
  require('../../assets/moods/mood-1.png'),
  require('../../assets/moods/mood-2.png'),
  require('../../assets/moods/mood-3.png'),
  require('../../assets/moods/mood-4.png'),
]
const moodLabels = ['低落', '一般', '不错', '特别好']
const weekdays = ['一', '二', '三', '四', '五', '六', '日']

type MoodModalState = { mode: 'pick' } | { mode: 'view'; day: string } | null

function MoodDayRows({ dayMoods, friendName }: { dayMoods?: DayMoods; friendName: string }) {
  if (!dayMoods?.mine && !dayMoods?.friend) {
    return <Text className="mood-modal__empty">这天还没有心情记录</Text>
  }
  return (
    <View className="mood-modal__rows">
      <View className="mood-modal__row">
        <Text className="mood-modal__who">我</Text>
        {dayMoods?.mine
          ? <><Image className="mood-modal__row-icon" src={moodIcons[dayMoods.mine.level - 1]} mode="aspectFill" /><Text className="mood-modal__row-label">{moodLabels[dayMoods.mine.level - 1]}</Text></>
          : <Text className="mood-modal__row-label mood-modal__row-label--none">未记录</Text>}
      </View>
      <View className="mood-modal__row">
        <Text className="mood-modal__who">{friendName || '好友'}</Text>
        {dayMoods?.friend
          ? <><Image className="mood-modal__row-icon" src={moodIcons[dayMoods.friend.level - 1]} mode="aspectFill" /><Text className="mood-modal__row-label">{moodLabels[dayMoods.friend.level - 1]}</Text></>
          : <Text className="mood-modal__row-label mood-modal__row-label--none">未记录</Text>}
      </View>
    </View>
  )
}

export function MiniappCalendarView({ roomId, myUserId, friendId, friendName }: MiniappCalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date())
  const [moods, setMoods] = useState<MiniappMood[]>([])
  const [fortune, setFortune] = useState<MiniappFortune | null>(null)
  const [fortuneOverlayOpen, setFortuneOverlayOpen] = useState(false)
  const [fortuneMessage, setFortuneMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<MoodModalState>(null)
  const month = useMemo(() => getCalendarMonth(cursor), [cursor])
  const lead = useMemo(() => getMondayLead(cursor), [cursor])
  const today = new Date()
  const currentDay = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const from = localDayKey(month.year, month.month, 1)
  const to = localDayKey(month.year, month.month, month.days)
  const moodByDay = useMemo(() => buildMoodByDay(moods, myUserId), [moods, myUserId])

  useEffect(() => {
    let cancelled = false
    void socialApi.getProfile()
      .then((profile) => {
        const availability = getFortuneAvailability(profile.birthday)
        if (!availability.ready) {
          if (!cancelled) {
            setFortune(null)
            setFortuneMessage(availability.message)
          }
          return
        }
        return socialApi.getFortune()
          .then((result) => {
            if (!cancelled) {
              setFortune(result)
              setFortuneMessage('')
            }
          })
          .catch(() => {
            if (!cancelled) {
              setFortune(null)
              setFortuneMessage('今日运势暂时无法加载')
            }
          })
      })
      .catch(() => {
        if (!cancelled) {
          setFortune(null)
          setFortuneMessage('今日运势暂时无法加载')
        }
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!roomId) {
      setMoods([])
      return
    }
    void socialApi.listMoods(roomId, from, to).then((items) => {
      setMoods(items)
    }).catch(() => setMoods([]))
  }, [from, roomId, to])

  const saveMood = async (level: number) => {
    if (!roomId || saving) return
    setSaving(true)
    try {
      const entry = await socialApi.setMood(roomId, level)
      setMoods((current) => [...current.filter((item) => item.id !== entry.id), entry])
      setModal(null)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '记录失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const openDay = (key: string) => {
    if (key === currentDay) setModal({ mode: 'pick' })
    else if (key < currentDay) setModal({ mode: 'view', day: key })
  }

  const cells: Array<number | null> = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: month.days }, (_, index) => index + 1),
  ]

  return (
    <View className="miniapp-calendar">
      <View className="miniapp-page-header miniapp-calendar__header">
        <Text className="miniapp-page-title miniapp-calendar__title">小记</Text>
        <Text className="miniapp-page-caption miniapp-calendar__caption">记录你们一起度过的每一天</Text>
      </View>

      <View className="miniapp-calendar__month-bar">
        <Button onClick={() => setCursor((value) => shiftMonth(value, -1))}>‹</Button>
        <Text className="miniapp-calendar__month-text">{month.year}年 {month.month + 1}月</Text>
        <Button onClick={() => setCursor((value) => shiftMonth(value, 1))}>›</Button>
      </View>

      <View className="miniapp-calendar__weekdays">
        {weekdays.map((weekday) => <Text key={weekday}>{weekday}</Text>)}
      </View>

      <View className="miniapp-calendar__grid">
        {cells.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} className="miniapp-calendar__cell" />
          const key = localDayKey(month.year, month.month, day)
          const isToday = key === currentDay
          const dayMoods = moodByDay.get(key)
          return (
            <View key={key} className="miniapp-calendar__cell" onClick={() => openDay(key)}>
              {isToday
                ? <Text className="miniapp-calendar__num miniapp-calendar__num--today">今天</Text>
                : <Text className="miniapp-calendar__num">{day}</Text>}
              <View className="miniapp-calendar__slot">
                {dayMoods?.mine && <Image className="miniapp-calendar__mood-icon" src={moodIcons[dayMoods.mine.level - 1]} mode="aspectFill" />}
              </View>
              <View className="miniapp-calendar__slot">
                {dayMoods?.friend && friendId && <Image className="miniapp-calendar__mood-icon" src={moodIcons[dayMoods.friend.level - 1]} mode="aspectFill" />}
              </View>
            </View>
          )
        })}
      </View>

      <View className="miniapp-calendar__legend">
        <View className="miniapp-calendar__legend-item">
          <Image className="miniapp-calendar__legend-icon" src={moodIcons[3]} mode="aspectFill" />
          <Text>我</Text>
        </View>
        <View className="miniapp-calendar__legend-item">
          <Image className="miniapp-calendar__legend-icon" src={moodIcons[2]} mode="aspectFill" />
          <Text>{friendName || '好友'}</Text>
        </View>
      </View>

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

      {modal && (
        <MiniappModal onClose={() => setModal(null)}>
          {modal.mode === 'pick' ? (
            <View className="mood-modal">
              <Text className="mood-modal__title">今天的心情</Text>
              <View className="mood-modal__grid">
                {moodLabels.map((label, index) => (
                  <Button
                    key={label}
                    className="mood-modal__item"
                    disabled={saving}
                    onClick={() => void saveMood(index + 1)}
                  >
                    <Image className="mood-modal__icon" src={moodIcons[index]} mode="aspectFill" />
                    <Text className="mood-modal__label">{label}</Text>
                  </Button>
                ))}
              </View>
              <Text className="mood-modal__tip">记录后，{friendName || '好友'}也能在日历上看到你的心情</Text>
            </View>
          ) : (
            <View className="mood-modal">
              <Text className="mood-modal__title">{Number(modal.day.slice(5, 7))}月{Number(modal.day.slice(8, 10))}日的心情</Text>
              <MoodDayRows dayMoods={moodByDay.get(modal.day)} friendName={friendName} />
            </View>
          )}
        </MiniappModal>
      )}
    </View>
  )
}
```

- [ ] **Step 2: 重写 `MiniappCalendarView.scss`**

完整新内容：

```scss
.miniapp-calendar {
  margin: -48px -32px 0;
  padding: 56px 28px 0;
  background: #fdfaf5;
  background-image:
    repeating-linear-gradient(0deg, transparent 0 44rpx, rgba(190, 170, 140, .14) 44rpx 46rpx),
    repeating-linear-gradient(90deg, transparent 0 44rpx, rgba(190, 170, 140, .14) 44rpx 46rpx);
}
.miniapp-calendar__header { padding: 0 4px 12px; }
.miniapp-calendar__month-bar { display: flex; align-items: center; justify-content: center; gap: 28rpx; padding: 8rpx 0 20rpx; }
.miniapp-calendar__month-bar button { min-width: 64rpx; padding: 0 12rpx; color: #c9a284; background: transparent; border: 0; font-size: var(--font-size-section-title); }
.miniapp-calendar__month-bar button::after, .miniapp-calendar__fortune-header button::after, .mood-modal__item::after { border: 0; }
.miniapp-calendar__month-text { color: #8a4f37; font-size: var(--font-size-section-title); font-weight: var(--font-weight-bold); }
.miniapp-calendar__weekdays, .miniapp-calendar__grid { display: grid; grid-template-columns: repeat(7, 1fr); }
.miniapp-calendar__weekdays { padding-bottom: 12rpx; }
.miniapp-calendar__weekdays text { text-align: center; color: #b49a8d; font-size: var(--font-size-aux); font-weight: var(--font-weight-medium); line-height: 1.4; }
.miniapp-calendar__grid { gap: 4rpx; }
.miniapp-calendar__cell { display: flex; min-height: 148rpx; flex-direction: column; align-items: center; padding: 4rpx 0 12rpx; }
.miniapp-calendar__num { height: 36rpx; color: #8e776a; font-size: var(--font-size-aux); line-height: 36rpx; }
.miniapp-calendar__num--today { color: #d9845d; font-weight: var(--font-weight-semibold); }
.miniapp-calendar__slot { width: 68rpx; height: 68rpx; margin-top: 6rpx; }
.miniapp-calendar__mood-icon { width: 68rpx; height: 68rpx; border-radius: 50%; }
.miniapp-calendar__legend { display: flex; justify-content: center; gap: 40rpx; padding: 16rpx 0 8rpx; }
.miniapp-calendar__legend-item { display: flex; align-items: center; gap: 8rpx; color: #8e776a; font-size: var(--font-size-aux); }
.miniapp-calendar__legend-icon { width: 36rpx; height: 36rpx; border-radius: 50%; }
.miniapp-calendar__fortune { margin-top: 24rpx; padding: 24rpx; background: #fff; border: 1px solid #ead5c2; border-radius: 20px; box-shadow: 0 7px 20px rgba(70, 48, 37, .05); }
.miniapp-calendar__fortune-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.miniapp-calendar__fortune-header button { min-width: 32px; padding: 4px 9px; color: #8a4f37; background: #fff; border: 0; border-radius: 999px; font-size: var(--font-size-body); }
.miniapp-calendar__fortune-label { display: block; color: #b18c79; font-size: var(--font-size-aux); }
.miniapp-calendar__fortune-title { display: block; margin-top: 6px; color: #5e3b1d; font-size: var(--font-size-card-title); font-weight: var(--font-weight-bold); }
.miniapp-calendar__fortune-meta { display: block; margin-top: 8px; color: #a89489; font-size: var(--font-size-aux); }

.mood-modal { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding-top: 8rpx; }
.mood-modal__title { color: #382b23; font-size: var(--font-size-overlay-title); font-weight: var(--font-weight-bold); }
.mood-modal__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; width: 100%; }
.mood-modal__item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 8rpx 0; background: transparent; border: 0; }
.mood-modal__icon { width: 96rpx; height: 96rpx; border-radius: 50%; }
.mood-modal__label { color: #8e776a; font-size: var(--font-size-aux); }
.mood-modal__tip { color: #b49a89; font-size: var(--font-size-aux); }
.mood-modal__rows { display: flex; flex-direction: column; gap: 20rpx; width: 100%; padding: 8rpx 12rpx; }
.mood-modal__row { display: flex; align-items: center; gap: 16rpx; }
.mood-modal__who { width: 96rpx; color: #b18c79; font-size: var(--font-size-secondary); }
.mood-modal__row-icon { width: 84rpx; height: 84rpx; border-radius: 50%; }
.mood-modal__row-label { color: #5e3b1d; font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); }
.mood-modal__row-label--none { color: #b49a8d; font-weight: var(--font-weight-regular); }
.mood-modal__empty { padding: 12rpx 0 8rpx; color: #a89489; font-size: var(--font-size-secondary); }
```

- [ ] **Step 3: 类型检查**

Run: `cd miniapp; npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 4: Commit**

```bash
git add miniapp/src/features/main/MiniappCalendarView.tsx miniapp/src/features/main/MiniappCalendarView.scss
git commit -m "feat(miniapp): 小记页重设计为格纸大日历与双人心情弹窗"
```

---

### Task 4: index.tsx 传入双人身份 props

**Files:**
- Modify: `miniapp/src/pages/index/index.tsx`（`renderMainContent` 中 calendar 分支，约 292-294 行）

- [ ] **Step 1: 修改 calendar 分支**

将：

```tsx
    if (activeTab === 'calendar') {
      return <MiniappCalendarView roomId={roomId} />
    }
```

替换为：

```tsx
    if (activeTab === 'calendar') {
      const activeRoom = context?.rooms.find((room) => room.id === roomId)
      return <MiniappCalendarView
        roomId={roomId}
        myUserId={context?.user.id || ''}
        friendId={activeRoom?.partner.id || ''}
        friendName={activeRoom?.partner.displayName || '好友'}
      />
    }
```

- [ ] **Step 2: 类型检查 + 全量测试**

Run: `cd miniapp; npx tsc --noEmit; npx vitest --run`
Expected: 无错误、全部 PASS。

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/pages/index/index.tsx
git commit -m "feat(miniapp): 小记页传入双人身份信息"
```

---

### Task 5: 构建 + 微信开发者工具清缓存重编译 + 预览验证

- [ ] **Step 1: 清理旧产物并构建**

```powershell
cd d:\Pet10\miniapp
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build:weapp
```

Expected: 构建成功；`dist/assets/moods/` 或 `dist/` 内含 4 张 mood 图（Taro 资源输出路径以实际为准）。

- [ ] **Step 2: 校验包体积**

```powershell
Get-ChildItem -Recurse dist -Include *.png | Where-Object { $_.Name -like "mood-*" } | Select-Object FullName, Length
```

Expected: 单张 < 184800 字节；主包总量 < 2MB（`Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum` 粗估，分包另计）。

- [ ] **Step 3: 微信开发者工具 CLI 清缓存 + 重编译**

```powershell
& "D:\Tecent\微信web开发者工具\cli.bat" cache --clean all --project "d:\Pet10\miniapp" --lang zh
& "D:\Tecent\微信web开发者工具\cli.bat" close --project "d:\Pet10\miniapp"
& "D:\Tecent\微信web开发者工具\cli.bat" open --project "d:\Pet10\miniapp"
```

- [ ] **Step 4: 预览核对清单**

在开发者工具中切到「小记」tab 核对：
1. 格纸背景大日历，周一起始，日期+上下两枚圆形心情图标；
2. 「今天」橙色文字；图例行显示 我/好友名；
3. 点「今天」→ 弹窗四选一，点选后日历即时出现我的图标；
4. 点过去有记录的日期 → 弹窗显示两人心情；无记录日期 → 「这天还没有心情记录」；
5. 点未来日期无响应；运势卡片与详情弹窗正常；
6. 文字均不小于 26rpx、无语义变量外硬编码字号。

- [ ] **Step 5: 若预览正常，最终 Commit（如有收尾修改）**

```bash
git add -A
git commit -m "chore(miniapp): 小记页重设计收尾"
```
