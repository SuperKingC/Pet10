# 聊天详情页隐藏底部导航 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 仅在打开某个会话的聊天详情时隐藏底部导航，并在返回会话列表后恢复显示。

**Architecture:** 页面级显示规则继续由拥有 `activeTab` 和 `currentRoomId` 的 `AppShell` 负责。测试通过会话存储初始化不同页面状态并服务端渲染 `AppShell`，从用户可见的主导航标记验证显示行为，不修改通用 `TabBar` 的职责。

**Tech Stack:** React 19、TypeScript、Vitest、React DOM Server、Vite。

---

当前工作区已有与本任务无关的未提交修改，且 `AppShell.tsx` 和导航文档已有静态资源/COS 调整。本计划在当前工作区执行；用户完成视觉验收后已明确要求提交到 `main`，提交阶段只选择性暂存本任务改动，既有修改继续保留在工作区。

### Task 1: 用集成测试锁定底部导航显示规则

**Files:**
- Create: `src/components/AppShell.test.tsx`
- Modify: `src/components/AppShell.tsx`

- [x] **Step 1: 写入会失败的聊天详情导航测试**

创建 `src/components/AppShell.test.tsx`：

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppShell } from './AppShell'

function renderWithUiState(tab: 'messages' | 'nest' | 'calendar' | 'me', roomId?: string) {
  window.sessionStorage.setItem('pet10_ui_state', JSON.stringify({ tab, roomId }))
  return renderToStaticMarkup(<AppShell onLogout={vi.fn()} />)
}

afterEach(() => {
  window.sessionStorage.clear()
})

describe('AppShell bottom navigation visibility', () => {
  it('keeps the bottom navigation on the conversation list', () => {
    expect(renderWithUiState('messages')).toContain('aria-label="主导航"')
  })

  it('hides the bottom navigation inside a conversation detail', () => {
    expect(renderWithUiState('messages', 'room-1')).not.toContain('aria-label="主导航"')
  })

  it('shows the bottom navigation again after returning to the conversation list', () => {
    renderWithUiState('messages', 'room-1')
    expect(renderWithUiState('messages')).toContain('aria-label="主导航"')
  })

  it('keeps the bottom navigation on other tabs', () => {
    expect(renderWithUiState('nest', 'room-1')).toContain('aria-label="主导航"')
  })
})
```

- [x] **Step 2: 运行聚焦测试并确认现有行为失败**

Run:

```powershell
npm test -- --run src/components/AppShell.test.tsx
```

Expected: `hides the bottom navigation inside a conversation detail` 失败，因为当前 `AppShell` 始终渲染 `TabBar`；其余显示断言通过。

- [x] **Step 3: 在 AppShell 中实现最小条件渲染**

把 `src/components/AppShell.tsx` 中无条件渲染的底部导航：

```tsx
<TabBar
  active={activeTab}
  onChange={changeTab}
  onTogglePawMenu={() => setPawMenuOpen((open) => !open)}
  messageBadge={totalUnread}
  pawMenuOpen={pawMenuOpen}
/>
```

改为：

```tsx
{!(activeTab === 'messages' && currentRoomId) && (
  <TabBar
    active={activeTab}
    onChange={changeTab}
    onTogglePawMenu={() => setPawMenuOpen((open) => !open)}
    messageBadge={totalUnread}
    pawMenuOpen={pawMenuOpen}
  />
)}
```

- [x] **Step 4: 重新运行聚焦测试并确认全部通过**

Run:

```powershell
npm test -- --run src/components/AppShell.test.tsx
```

Expected: 4 个测试全部通过，0 个失败。

### Task 2: 同步导航功能文档

**Files:**
- Modify: `docs/features/app-navigation.md`

- [x] **Step 1: 记录会话列表与聊天详情的底栏差异**

在“底部导航”说明中加入：

```markdown
会话列表仍属于主标签页并显示底部导航；进入某个会话的聊天详情后，聊天页以全屏模式显示并隐藏底部导航。点击聊天页返回按钮回到会话列表后，底部导航恢复。
```

在“验收”清单中加入：

```markdown
- [ ] 会话列表显示底部导航；进入聊天详情后底部导航隐藏，返回会话列表后恢复。
```

- [x] **Step 2: 验证文档和资产规则**

Run:

```powershell
npm run check:docs
npm run check:assets
```

Expected: 两个命令均退出码为 0；本任务没有新增或修改运行时资产。

### Task 3: 完成自动验证与本地视觉验收准备

**Files:**
- Verify: `src/components/AppShell.test.tsx`
- Verify: `src/components/AppShell.tsx`
- Verify: `docs/features/app-navigation.md`

- [x] **Step 1: 运行快速验证**

Run:

```powershell
npm run verify:quick -- --scope=ui
```

Expected: 类型检查、前端聚焦范围内的项目快速检查全部通过，退出码为 0。

- [x] **Step 2: 启动本地验收服务**

Run:

```powershell
npm run review
```

Expected: 输出一个 `http://127.0.0.1:<port>/` 本地地址，服务保持运行。

- [x] **Step 3: 检查实际交互**

在本地验收地址执行：

1. 打开“消息”会话列表，确认底部导航可见。
2. 点击任意会话进入聊天详情，确认底部导航完全隐藏且页面底部没有残留点击区域。
3. 点击左上角返回按钮，确认回到会话列表且底部导航恢复。
4. 切换“小窝”“小记”“我的”，确认这些页面仍显示底部导航。
5. 检查浏览器控制台，确认没有新增错误或警告。

- [x] **Step 4: 报告未验证区域与回滚方式**

报告聚焦测试、快速验证、文档检查和本地验收地址。若未能实际完成浏览器交互，明确列为未验证；回滚范围仅为 `AppShell` 条件渲染、新增测试和导航文档条目。
