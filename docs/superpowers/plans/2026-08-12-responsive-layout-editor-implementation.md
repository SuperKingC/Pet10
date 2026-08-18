# 全应用响应式可视化布局编辑器实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建仅开发环境可用的 `/dev/layout` 可视化编辑器，让维护者在三档设备宽度下调整已注册页面元素、同容器排序，并在差异确认后生成独立布局源码。

**Architecture:** 使用 `src/layout/` 提供纯类型、解析、校验和运行时包装；使用 `src/dev/layout/` 提供编辑器、真实页面预览与 `postMessage` 桥接；使用 Vite 开发插件暴露受限的源码预览和确认写入端点。布局草稿先保存在编辑器状态与 `localStorage`，生成结果只写入 `src/layout/generated/`，不改写现有组件 CSS。

**Tech Stack:** React 19、TypeScript 5.9、Vite 7、Vitest 3、原生 Pointer Events、CSS Grid/Flex、Node.js 文件系统 API。

## Global Constraints

- 开始实现前从最新 `main` 创建新的 `codex/` 工作树，不在现有旧功能工作树中继续。
- 当前设计基线为 `6b98a6b66061fae2bd9f269eb680e8bfd0626af7`；执行前先 `git fetch origin main` 并确认新工作树基于当时最新 `origin/main`。
- 开发路由固定为 `/dev/layout`，真实页面预览路由固定为 `/dev/layout-preview`。
- 设备档位固定为 `narrow: 320px–374px`、`standard: 375px–767px`、`wide: 768px+`。
- `standard` 是默认规则来源；`narrow` 和 `wide` 只保存覆盖值。
- 只编辑稳定布局 ID 注册的元素；不支持任意 DOM 选择。
- 只允许同一 `parentId` 内排序；禁止跨容器移动。
- 第一版不编辑文本内部、聊天消息内容、弹窗内部结构、Canvas 内容和塔罗动画节点。
- 编辑器和源码写入端点只在开发环境启用。
- 源码生成只允许写入 `src/layout/generated/layout.config.ts` 和 `src/layout/generated/layout.generated.css`。
- UI 组件不直接访问文件系统；Node 源码服务不导入 React 或业务状态。
- 行为改动必须先写聚焦失败测试，再写最小实现。
- Git 提交信息使用中文。
- UI 完成后运行 `npm run review` 并提供 `/dev/layout` 本地验收地址。
- 合并或部署前运行 `npm run verify:full`；视觉变更必须经过用户验收。

---

## 文件结构

### 新增布局核心

- `src/layout/layoutTypes.ts`：设备档位、属性、配置、注册表和桥接消息类型。
- `src/layout/layoutResolver.ts`：三档继承、规范化和最终规则解析。
- `src/layout/layoutValidation.ts`：布局 ID、能力白名单、数值范围和排序边界校验。
- `src/layout/layoutRegistry.ts`：全应用页面、容器和元素注册表。
- `src/layout/LayoutRegion.tsx`：受控容器和元素运行时包装。
- `src/layout/layoutRuntime.ts`：把解析后的配置转换为 class、data 属性和 CSS 变量。
- `src/layout/generated/layout.config.ts`：结构化生成配置。
- `src/layout/generated/layout.generated.css`：确定性生成 CSS。

### 新增编辑器

- `src/dev/layout/LayoutDevEntry.tsx`：编辑器路由入口。
- `src/dev/layout/LayoutPreviewEntry.tsx`：iframe 真实页面预览入口。
- `src/dev/layout/layoutScenes.tsx`：开发预览场景与真实组件适配。
- `src/dev/layout/layoutBridge.ts`：父页面与 iframe 的类型安全消息桥接。
- `src/dev/layout/layoutDraft.ts`：草稿 reducer、撤销、重做、重置和本地恢复。
- `src/dev/layout/LayoutEditor.tsx`：编辑器状态编排。
- `src/dev/layout/LayoutElementTree.tsx`：页面和受控元素树。
- `src/dev/layout/LayoutCanvas.tsx`：设备画布、iframe 和工具栏。
- `src/dev/layout/LayoutInspector.tsx`：当前档位属性编辑。
- `src/dev/layout/LayoutDiff.tsx`：候选源码差异和确认写入。
- `src/dev/layout/layoutEditor.css`：编辑器自身样式，不影响业务页面。

### 新增开发期源码服务

- `scripts/layout-source-service.mjs`：纯 Node 生成、摘要、差异和安全写入逻辑。
- `scripts/layout-source-service.test.mjs`：使用 `node:test` 验证确定性生成和路径安全。
- `scripts/layout-vite-plugin.mjs`：Vite `configureServer` 端点适配。

### 修改现有入口和页面

- `vite.config.ts`：仅开发服务器注册布局源码插件。
- `package.json`：增加布局源码服务聚焦测试命令。
- `src/main.tsx`：注册 `/dev/layout` 和 `/dev/layout-preview`。
- `src/components/AppShell.tsx`：为主页面和覆盖层添加页面级 `LayoutRegion`，不改变业务状态。
- `src/components/NestTab.tsx`、`CalendarTab.tsx`、`ConversationList.tsx`、`ChatView.tsx`、`MeTab.tsx`、`TabBar.tsx`、`PawMenu.tsx`：注册主要受控布局区域。
- `src/components/FeedScreen.tsx`、`NotificationCenter.tsx`、`MemoryPanel.tsx`、`MbtiTestScreen.tsx`、`AvatarStudio.tsx`、`FortuneDetail.tsx`：注册页面级容器与主要区域。
- `src/games/gobang/GobangGame.tsx`、`src/games/map/MapScreen.tsx`、`src/games/tarot/TarotGame.tsx`：注册页面外壳；塔罗阶段内部动画节点保持锁定。
- `docs/features/layout-editor.md`：新增非技术维护者功能文档。
- `docs/features/app-navigation.md`：记录开发路由。

---

### Task 1: 创建隔离工作树并锁定基线

**Files:**
- Existing untracked design: `docs/superpowers/specs/2026-08-12-responsive-layout-editor-design.md`
- Existing untracked plan: `docs/superpowers/plans/2026-08-12-responsive-layout-editor-implementation.md`

**Interfaces:**
- Consumes: 当前 `main` 工作区中的已确认设计和实施计划。
- Produces: 基于最新 `origin/main` 的独立 `codex/responsive-layout-editor` 工作树。

- [ ] **Step 1: 确认当前工作区只有设计文档和计划文档未提交**

Run:

```powershell
git status --short
git worktree list --porcelain
```

Expected: 不存在产品代码改动；只有本设计和计划文档未跟踪。

- [ ] **Step 2: 暂存文档补丁并更新远端基线**

Run:

```powershell
git diff --no-index -- NUL docs/superpowers/specs/2026-08-12-responsive-layout-editor-design.md > $env:TEMP\pet10-layout-spec.patch
git diff --no-index -- NUL docs/superpowers/plans/2026-08-12-responsive-layout-editor-implementation.md > $env:TEMP\pet10-layout-plan.patch
git fetch origin main
git rev-parse origin/main
```

Expected: 获取最新 `origin/main` 提交；两个补丁文件已生成。`git diff --no-index` 返回 `1` 表示存在差异，可忽略该状态码。

- [ ] **Step 3: 使用 worktree 技能创建新工作树**

Run:

```powershell
git worktree add D:\Pet10-worktrees\responsive-layout-editor -b codex/responsive-layout-editor origin/main
```

Expected: 新工作树位于 `D:\Pet10-worktrees\responsive-layout-editor`，分支为 `codex/responsive-layout-editor`。

- [ ] **Step 4: 把设计和计划文档复制到新工作树**

Run:

```powershell
New-Item -ItemType Directory -Force D:\Pet10-worktrees\responsive-layout-editor\docs\superpowers\specs | Out-Null
New-Item -ItemType Directory -Force D:\Pet10-worktrees\responsive-layout-editor\docs\superpowers\plans | Out-Null
Copy-Item D:\Pet10\docs\superpowers\specs\2026-08-12-responsive-layout-editor-design.md D:\Pet10-worktrees\responsive-layout-editor\docs\superpowers\specs\
Copy-Item D:\Pet10\docs\superpowers\plans\2026-08-12-responsive-layout-editor-implementation.md D:\Pet10-worktrees\responsive-layout-editor\docs\superpowers\plans\
git -C D:\Pet10-worktrees\responsive-layout-editor status --short --branch
```

Expected: 新工作树只有两份文档未跟踪，分支基于最新 `origin/main`。

- [ ] **Step 5: 提交设计和计划**

Run:

```powershell
git -C D:\Pet10-worktrees\responsive-layout-editor add docs/superpowers/specs/2026-08-12-responsive-layout-editor-design.md docs/superpowers/plans/2026-08-12-responsive-layout-editor-implementation.md
git -C D:\Pet10-worktrees\responsive-layout-editor commit -m "文档：设计响应式布局编辑器"
```

Expected: 中文提交成功；后续任务都在新工作树执行。

---

### Task 2: 定义布局合同与三档解析

**Files:**
- Create: `src/layout/layoutTypes.ts`
- Create: `src/layout/layoutResolver.ts`
- Create: `src/layout/layoutResolver.test.ts`
- Create: `src/layout/generated/layout.config.ts`
- Create: `src/layout/generated/layout.generated.css`

**Interfaces:**
- Consumes: 无。
- Produces:
  - `type LayoutBreakpoint = 'narrow' | 'standard' | 'wide'`
  - `type LayoutElementId = string`
  - `interface LayoutRuleSet`
  - `interface LayoutElementConfig`
  - `interface GeneratedLayoutConfig`
  - `resolveLayoutRule(config, breakpoint): ResolvedLayoutRule`
  - `normalizeLayoutConfig(config): GeneratedLayoutConfig`

- [ ] **Step 1: 写三档继承失败测试**

Create `src/layout/layoutResolver.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeLayoutConfig, resolveLayoutRule } from './layoutResolver'

describe('layoutResolver', () => {
  it('uses standard as the base and applies breakpoint overrides', () => {
    const config = {
      parentId: 'nest.main',
      order: 10,
      standard: { marginInline: 16, maxWidth: '100%' },
      narrow: { marginInline: 12 },
      wide: { gridColumn: '1 / 2' }
    }

    expect(resolveLayoutRule(config, 'narrow')).toEqual({
      marginInline: 12,
      maxWidth: '100%'
    })
    expect(resolveLayoutRule(config, 'standard')).toEqual({
      marginInline: 16,
      maxWidth: '100%'
    })
    expect(resolveLayoutRule(config, 'wide')).toEqual({
      marginInline: 16,
      maxWidth: '100%',
      gridColumn: '1 / 2'
    })
  })

  it('removes empty overrides and sorts element ids deterministically', () => {
    expect(Object.keys(normalizeLayoutConfig({
      'nest.status': {
        parentId: 'nest.main',
        order: 20,
        standard: { marginInline: 16 },
        narrow: { marginInline: 16 }
      },
      'app.tab-bar': {
        parentId: 'app.shell',
        order: 10,
        standard: { zIndex: 40 }
      }
    }))).toEqual(['app.tab-bar', 'nest.status'])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/layout/layoutResolver.test.ts
```

Expected: FAIL，提示 `layoutResolver` 模块不存在。

- [ ] **Step 3: 实现最小类型和解析器**

Create `src/layout/layoutTypes.ts` with these exact public shapes:

```ts
export type LayoutBreakpoint = 'narrow' | 'standard' | 'wide'
export type LayoutStrategy = 'flow' | 'grid' | 'positioned'
export type LayoutAnchor = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface LayoutRuleSet {
  display?: 'block' | 'flex' | 'grid' | 'none'
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number
  marginInline?: number
  marginBlock?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  paddingInline?: number
  paddingBlock?: number
  width?: number | string
  height?: number | string
  minWidth?: number | string
  minHeight?: number | string
  maxWidth?: number | string
  maxHeight?: number | string
  alignSelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch'
  justifySelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch'
  gridColumn?: string
  gridRow?: string
  order?: number
  zIndex?: number
  anchor?: LayoutAnchor
  offsetX?: number
  offsetY?: number
}

export interface LayoutElementConfig {
  parentId: string
  order: number
  strategy?: LayoutStrategy
  standard: LayoutRuleSet
  narrow?: LayoutRuleSet
  wide?: LayoutRuleSet
}

export type GeneratedLayoutConfig = Record<string, LayoutElementConfig>
export type ResolvedLayoutRule = LayoutRuleSet
```

Implement `resolveLayoutRule` as `{ ...standard, ...breakpointOverride }`. Implement `normalizeLayoutConfig` by sorting IDs, removing override properties equal to `standard`, and omitting empty override objects.

Create empty committed generated files:

```ts
import type { GeneratedLayoutConfig } from '../layoutTypes'

export const generatedLayout: GeneratedLayoutConfig = {}
```

```css
/* Generated by the Pet10 layout editor. Do not edit manually. */
```

- [ ] **Step 4: 运行聚焦测试和类型检查**

Run:

```powershell
npx vitest --run src/layout/layoutResolver.test.ts
npx tsc -b
```

Expected: 两个命令均 PASS。

- [ ] **Step 5: 提交布局合同**

Run:

```powershell
git add src/layout
git commit -m "功能：定义响应式布局合同"
```

---

### Task 3: 实现注册表与布局校验

**Files:**
- Create: `src/layout/layoutRegistry.ts`
- Create: `src/layout/layoutValidation.ts`
- Create: `src/layout/layoutValidation.test.ts`

**Interfaces:**
- Consumes: `LayoutBreakpoint`、`LayoutRuleSet`、`GeneratedLayoutConfig`。
- Produces:
  - `type LayoutCapability`
  - `interface LayoutRegistration`
  - `interface LayoutPageRegistration`
  - `layoutPages`
  - `getLayoutRegistration(id)`
  - `validateLayoutConfig(config, registry): LayoutValidationResult`

- [ ] **Step 1: 写唯一 ID、能力和跨容器排序失败测试**

Create `src/layout/layoutValidation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateLayoutConfig } from './layoutValidation'

const registry = [
  {
    id: 'nest.status',
    pageId: 'nest',
    parentId: 'nest.main',
    label: '宠物状态',
    kind: 'item' as const,
    capabilities: ['spacing', 'size', 'order'] as const,
    orderable: true
  }
]

describe('validateLayoutConfig', () => {
  it('rejects unknown ids and capabilities', () => {
    const result = validateLayoutConfig({
      'nest.unknown': {
        parentId: 'nest.main',
        order: 10,
        standard: { marginInline: 12 }
      }
    }, registry)

    expect(result.errors[0]?.code).toBe('unknown_element')
  })

  it('rejects a parent change used as a cross-container move', () => {
    const result = validateLayoutConfig({
      'nest.status': {
        parentId: 'calendar.main',
        order: 10,
        standard: {}
      }
    }, registry)

    expect(result.errors[0]?.code).toBe('parent_mismatch')
  })

  it('accepts ordering within the registered parent', () => {
    expect(validateLayoutConfig({
      'nest.status': {
        parentId: 'nest.main',
        order: 30,
        standard: { marginInline: 12 }
      }
    }, registry).errors).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/layout/layoutValidation.test.ts
```

Expected: FAIL，提示校验模块不存在。

- [ ] **Step 3: 实现注册和校验接口**

Use these exact declarations in `layoutRegistry.ts`:

```ts
export type LayoutCapability = 'spacing' | 'size' | 'alignment' | 'grid' | 'order' | 'visibility' | 'positioned' | 'z-index'

export interface LayoutRegistration {
  id: string
  pageId: string
  parentId?: string
  label: string
  kind: 'container' | 'item'
  capabilities: readonly LayoutCapability[]
  locked?: boolean
  orderable?: boolean
}

export interface LayoutPageRegistration {
  id: string
  label: string
  scene: string
  elements: readonly LayoutRegistration[]
}
```

Initially register page shells and representative elements:

```ts
export const layoutPages: readonly LayoutPageRegistration[] = [
  {
    id: 'app',
    label: '应用壳',
    scene: 'app',
    elements: [
      { id: 'app.shell', pageId: 'app', label: '应用壳', kind: 'container', capabilities: ['spacing', 'size', 'alignment'] },
      { id: 'app.tab-bar', pageId: 'app', parentId: 'app.shell', label: '底部导航', kind: 'item', capabilities: ['size', 'alignment', 'visibility', 'z-index'], orderable: false }
    ]
  },
  {
    id: 'nest',
    label: '小窝',
    scene: 'nest',
    elements: [
      { id: 'nest.main', pageId: 'nest', label: '小窝内容', kind: 'container', capabilities: ['spacing', 'size', 'grid'] },
      { id: 'nest.pet-status', pageId: 'nest', parentId: 'nest.main', label: '宠物状态卡', kind: 'item', capabilities: ['spacing', 'size', 'alignment', 'grid', 'order'], orderable: true },
      { id: 'nest.actions', pageId: 'nest', parentId: 'nest.main', label: '照顾操作组', kind: 'item', capabilities: ['spacing', 'size', 'alignment', 'grid', 'order'], orderable: true }
    ]
  }
] as const
```

Implement validation mappings:

- spacing → margin/padding fields
- size → width/height/min/max fields
- alignment → `alignSelf`, `justifySelf`
- grid → `gridColumn`, `gridRow`
- order → `order`
- visibility → `display`
- positioned → `anchor`, `offsetX`, `offsetY`
- z-index → `zIndex`

Reject unknown IDs, duplicate registry IDs, parent mismatch, unauthorized properties, `zIndex` outside `0..100`, `order` outside `-1000..1000`, non-finite numbers, and positioned fields without `positioned`.

- [ ] **Step 4: 运行校验测试**

Run:

```powershell
npx vitest --run src/layout/layoutValidation.test.ts src/layout/layoutResolver.test.ts
npx tsc -b
```

Expected: PASS。

- [ ] **Step 5: 提交注册与校验**

Run:

```powershell
git add src/layout
git commit -m "功能：添加布局注册与校验"
```

---

### Task 4: 实现页面运行时包装

**Files:**
- Create: `src/layout/layoutRuntime.ts`
- Create: `src/layout/LayoutRegion.tsx`
- Create: `src/layout/LayoutRegion.test.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `generatedLayout`、`resolveLayoutRule`、注册表。
- Produces:
  - `getLayoutRuntimeProps(id, breakpoint)`
  - `<LayoutRegion id kind children className?>`
  - DOM attributes `data-layout-id`, `data-layout-parent`, `data-layout-kind`

- [ ] **Step 1: 写运行时属性失败测试**

Create `src/layout/LayoutRegion.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LayoutRegion } from './LayoutRegion'

describe('LayoutRegion', () => {
  it('renders stable editor attributes without changing child content', () => {
    const html = renderToStaticMarkup(
      <LayoutRegion id="nest.pet-status" kind="item">
        <span>宠物状态</span>
      </LayoutRegion>
    )

    expect(html).toContain('data-layout-id="nest.pet-status"')
    expect(html).toContain('data-layout-kind="item"')
    expect(html).toContain('宠物状态')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/layout/LayoutRegion.test.tsx
```

Expected: FAIL，提示组件不存在。

- [ ] **Step 3: 实现轻量包装和生成 CSS 引入**

`LayoutRegion` must render one neutral `div`:

```tsx
interface LayoutRegionProps {
  id: string
  kind: 'container' | 'item'
  className?: string
  children: React.ReactNode
}

export function LayoutRegion({ id, kind, className, children }: LayoutRegionProps) {
  const registration = getLayoutRegistration(id)
  return (
    <div
      className={className}
      data-layout-id={id}
      data-layout-kind={kind}
      data-layout-parent={registration?.parentId}
    >
      {children}
    </div>
  )
}
```

Import `./layout/generated/layout.generated.css'` once from `src/main.tsx` after `styles.css`, so generated rules load after existing styles.

- [ ] **Step 4: 运行聚焦测试和现有 UI 测试**

Run:

```powershell
npx vitest --run src/layout/LayoutRegion.test.tsx src/components/AppShell.test.tsx
npx tsc -b
```

Expected: PASS；现有应用壳测试不变。

- [ ] **Step 5: 提交运行时**

Run:

```powershell
git add src/layout src/main.tsx
git commit -m "功能：接入布局运行时包装"
```

---

### Task 5: 注册主应用页面的受控区域

**Files:**
- Modify: `src/layout/layoutRegistry.ts`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/NestTab.tsx`
- Modify: `src/components/CalendarTab.tsx`
- Modify: `src/components/ConversationList.tsx`
- Modify: `src/components/ChatView.tsx`
- Modify: `src/components/MeTab.tsx`
- Modify: `src/components/TabBar.tsx`
- Modify: `src/components/PawMenu.tsx`
- Create: `src/layout/layoutRegistration.test.tsx`

**Interfaces:**
- Consumes: `<LayoutRegion>` and `layoutPages`.
- Produces: 页面 ID `app`、`nest`、`calendar`、`messages`、`chat`、`me`、`paw-menu` 的稳定 DOM 注册。

- [ ] **Step 1: 写页面布局 ID 失败测试**

Create `src/layout/layoutRegistration.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { initialSnapshot } from '../state/mockStore'
import { NestTab } from '../components/NestTab'
import { TabBar } from '../components/TabBar'
import { layoutPages } from './layoutRegistry'

describe('layout registrations', () => {
  it('keeps every registered layout id unique', () => {
    const ids = layoutPages.flatMap((page) => page.elements.map((element) => element.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('renders the nest root and editable sections', () => {
    const html = renderToStaticMarkup(
      <NestTab
        pairRoom={null}
        pet={initialSnapshot.pet}
        friendNames={['你', initialSnapshot.friend.name]}
        onAction={vi.fn()}
        onOpenMemories={vi.fn()}
      />
    )

    expect(html).toContain('data-layout-id="nest.main"')
    expect(html).toContain('data-layout-id="nest.pet-status"')
    expect(html).toContain('data-layout-id="nest.actions"')
  })

  it('renders the existing tab bar as a registered item', () => {
    const html = renderToStaticMarkup(
      <TabBar
        active="nest"
        onChange={vi.fn()}
        pawOpen={false}
        onPawToggle={vi.fn()}
      />
    )

    expect(html).toContain('data-layout-id="app.tab-bar"')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/layout/layoutRegistration.test.tsx
```

Expected: FAIL，因为页面尚未输出布局 ID。

- [ ] **Step 3: 给主页面添加最小包装**

Register and wrap these exact regions:

| Page | Container | Items |
| --- | --- | --- |
| `app` | `app.shell` | `app.tab-bar`, `app.paw-menu` |
| `nest` | `nest.main` | `nest.pet-status`, `nest.actions`, `nest.memories`, `nest.contributions` |
| `calendar` | `calendar.main` | `calendar.header`, `calendar.month`, `calendar.fortune` |
| `messages` | `messages.main` | `messages.header`, `messages.list` |
| `chat` | `chat.main` | `chat.header`, `chat.message-list`, `chat.composer` |
| `me` | `me.main` | `me.header`, `me.profile-card`, `me.settings-list` |
| `paw-menu` | `paw-menu.main` | `paw-menu.actions` |

Wrap existing top-level blocks without moving business logic or changing callbacks. When a component already has a semantic root element, prefer adding `data-layout-*` props through `getLayoutRuntimeProps` instead of introducing a wrapper that changes flex/grid behavior.

- [ ] **Step 4: 运行页面测试**

Run:

```powershell
npx vitest --run src/layout src/components/AppShell.test.tsx src/components/TabBar.test.tsx src/components/PawMenu.test.tsx src/components/MeTab.test.tsx src/components/CalendarTab.test.tsx src/components/ChatView.test.tsx
npx tsc -b
```

Expected: PASS；现有页面内容和交互测试保持通过。

- [ ] **Step 5: 提交主页面注册**

Run:

```powershell
git add src/layout src/components
git commit -m "功能：注册主页面布局区域"
```

---

### Task 6: 建立真实页面预览路由与场景

**Files:**
- Create: `src/dev/layout/LayoutPreviewEntry.tsx`
- Create: `src/dev/layout/layoutScenes.tsx`
- Create: `src/dev/layout/layoutScenes.test.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: 真实页面组件、`initialSnapshot`、现有 Mock 类型。
- Produces:
  - `type LayoutSceneId`
  - `layoutScenes`
  - `getLayoutScene(sceneId)`
  - `/dev/layout-preview?scene=<id>&breakpoint=<id>`

- [ ] **Step 1: 写开发场景路由失败测试**

Create `src/dev/layout/layoutScenes.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { getLayoutScene, layoutScenes } from './layoutScenes'

describe('layoutScenes', () => {
  it('provides every registered page scene', () => {
    expect(layoutScenes.map((scene) => scene.id)).toEqual(expect.arrayContaining([
      'app', 'nest', 'calendar', 'messages', 'chat', 'me', 'paw-menu'
    ]))
  })

  it('falls back to nest for an unknown scene', () => {
    expect(getLayoutScene('missing').id).toBe('nest')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/dev/layout/layoutScenes.test.tsx
```

Expected: FAIL，场景模块不存在。

- [ ] **Step 3: 实现真实组件场景适配**

Define:

```ts
export interface LayoutScene {
  id: string
  label: string
  render(): React.ReactNode
}
```

Use existing `initialSnapshot` and deterministic no-op callbacks. Each scene renders the real component, not copied HTML. For state-heavy pages:

- `app` renders `AppShell` in Mock mode.
- `nest`, `calendar`, `messages`, `me` render their real components with deterministic Mock props.
- `chat` renders `ChatView` with `initialSnapshot.messages`.
- `paw-menu` renders `PawMenu` open.

`LayoutPreviewEntry` reads `scene` from `URLSearchParams` and renders:

```tsx
<main data-layout-preview-root data-layout-scene={scene.id}>
  {scene.render()}
</main>
```

Add to `App()` before normal session initialization:

```tsx
if (import.meta.env.DEV && window.location.pathname === '/dev/layout-preview') {
  return <LayoutPreviewEntry />
}
```

- [ ] **Step 4: 运行场景和入口测试**

Run:

```powershell
npx vitest --run src/dev/layout src/layout
npx tsc -b
```

Expected: PASS。

- [ ] **Step 5: 提交预览场景**

Run:

```powershell
git add src/dev/layout src/main.tsx
git commit -m "功能：添加布局页面预览入口"
```

---

### Task 7: 实现 iframe 选择桥接

**Files:**
- Create: `src/dev/layout/layoutBridge.ts`
- Create: `src/dev/layout/layoutBridge.test.ts`
- Modify: `src/dev/layout/LayoutPreviewEntry.tsx`

**Interfaces:**
- Consumes: DOM 中的 `data-layout-id`、`data-layout-parent`。
- Produces:
  - `LayoutBridgeMessage`
  - `createLayoutBridge(targetWindow, origin)`
  - `installLayoutPreviewBridge()`
  - messages: `preview-ready`, `element-selected`, `element-rects`, `apply-draft`, `set-interaction-mode`

- [ ] **Step 1: 写消息解析和来源校验失败测试**

Create tests for:

```ts
import { describe, expect, it } from 'vitest'
import { parseLayoutBridgeMessage } from './layoutBridge'

describe('parseLayoutBridgeMessage', () => {
  it('accepts a valid preview selection message', () => {
    expect(parseLayoutBridgeMessage({
      source: 'pet10-layout-preview',
      type: 'element-selected',
      payload: {
        id: 'nest.pet-status',
        parentId: 'nest.main',
        rect: { x: 16, y: 120, width: 230, height: 120 }
      }
    })).toEqual({
      source: 'pet10-layout-preview',
      type: 'element-selected',
      payload: {
        id: 'nest.pet-status',
        parentId: 'nest.main',
        rect: { x: 16, y: 120, width: 230, height: 120 }
      }
    })
  })

  it('rejects messages from another source', () => {
    expect(parseLayoutBridgeMessage({
      source: 'other',
      type: 'element-selected',
      payload: {}
    })).toBeNull()
  })

  it('rejects draft rules for an unregistered id', () => {
    expect(parseLayoutBridgeMessage({
      source: 'pet10-layout-editor',
      type: 'apply-draft',
      payload: {
        id: 'missing.element',
        breakpoint: 'standard',
        rule: { marginInline: 12 }
      }
    })).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/dev/layout/layoutBridge.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现桥接与预览选区**

Use exact envelope:

```ts
export interface LayoutBridgeEnvelope<TType extends string, TPayload> {
  source: 'pet10-layout-editor' | 'pet10-layout-preview'
  type: TType
  payload: TPayload
}
```

Preview behavior:

- Capture pointer click on nearest `[data-layout-id]`.
- In edit mode call `preventDefault()` and `stopPropagation()`.
- Send selected ID, parent ID and `getBoundingClientRect()`.
- Add one fixed overlay element inside preview document for selection border.
- On scroll and resize, resend the selected rect.
- `set-interaction-mode: true` disables interception and hides overlay.
- `apply-draft` sets temporary CSS custom properties/data attributes only for preview; it does not write storage or source.

- [ ] **Step 4: 运行桥接测试和类型检查**

Run:

```powershell
npx vitest --run src/dev/layout/layoutBridge.test.ts src/dev/layout/layoutScenes.test.tsx
npx tsc -b
```

Expected: PASS。

- [ ] **Step 5: 提交预览桥接**

Run:

```powershell
git add src/dev/layout
git commit -m "功能：连接布局编辑器与页面预览"
```

---

### Task 8: 实现草稿、撤销、重做和版本恢复

**Files:**
- Create: `src/dev/layout/layoutDraft.ts`
- Create: `src/dev/layout/layoutDraft.test.ts`

**Interfaces:**
- Consumes: `GeneratedLayoutConfig`、`LayoutBreakpoint`。
- Produces:
  - `interface LayoutDraftState`
  - `type LayoutDraftAction`
  - `layoutDraftReducer`
  - `createDraftStorageKey(baseCommit, registryVersion)`
  - `loadLayoutDraft`
  - `saveLayoutDraft`
  - `createInitialLayoutDraftState(config)`
  - `parseStoredLayoutDraft(raw, expected)`

- [ ] **Step 1: 写草稿历史失败测试**

Create `src/dev/layout/layoutDraft.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  createInitialLayoutDraftState,
  layoutDraftReducer,
  parseStoredLayoutDraft
} from './layoutDraft'

const initialConfig = {
  'nest.pet-status': {
    parentId: 'nest.main',
    order: 10,
    standard: { marginInline: 16 }
  },
  'nest.actions': {
    parentId: 'nest.main',
    order: 20,
    standard: { marginInline: 16 }
  }
}

describe('layoutDraftReducer', () => {
  it('undoes and redoes one completed edit', () => {
    const initial = createInitialLayoutDraftState(initialConfig)
    const edited = layoutDraftReducer(initial, {
      type: 'set-rule',
      id: 'nest.pet-status',
      breakpoint: 'narrow',
      patch: { marginInline: 12 }
    })
    const undone = layoutDraftReducer(edited, { type: 'undo' })
    const redone = layoutDraftReducer(undone, { type: 'redo' })

    expect(undone.present.config).toEqual(initialConfig)
    expect(redone.present.config['nest.pet-status'].narrow).toEqual({ marginInline: 12 })
  })

  it('resets one element without touching siblings', () => {
    const edited = createInitialLayoutDraftState({
      ...initialConfig,
      'nest.pet-status': {
        ...initialConfig['nest.pet-status'],
        narrow: { marginInline: 12 }
      },
      'nest.actions': {
        ...initialConfig['nest.actions'],
        wide: { gridColumn: '1 / 3' }
      }
    })
    const reset = layoutDraftReducer(edited, {
      type: 'reset-element',
      id: 'nest.pet-status'
    })

    expect(reset.present.config['nest.pet-status']).toEqual(initialConfig['nest.pet-status'])
    expect(reset.present.config['nest.actions'].wide).toEqual({ gridColumn: '1 / 3' })
  })

  it('rejects local drafts from another base commit', () => {
    expect(parseStoredLayoutDraft(JSON.stringify({
      schemaVersion: 1,
      baseCommit: 'old-commit',
      registryVersion: '1',
      savedAt: '2026-08-12T00:00:00.000Z',
      config: initialConfig
    }), {
      baseCommit: 'new-commit',
      registryVersion: '1'
    })).toEqual({ status: 'incompatible', reason: 'base_commit' })
  })

  it('stores narrow overrides without copying unchanged standard values', () => {
    const initial = createInitialLayoutDraftState(initialConfig)
    const edited = layoutDraftReducer(initial, {
      type: 'set-rule',
      id: 'nest.pet-status',
      breakpoint: 'narrow',
      patch: { marginInline: 12 }
    })

    expect(edited.present.config['nest.pet-status'].narrow).toEqual({ marginInline: 12 })
    expect(edited.present.config['nest.pet-status'].narrow).not.toHaveProperty('maxWidth')
  })
})
```

Use actions:

```ts
{ type: 'set-rule', id, breakpoint, patch }
{ type: 'set-order', id, order }
{ type: 'reset-element', id }
{ type: 'reset-breakpoint', id, breakpoint }
{ type: 'undo' }
{ type: 'redo' }
{ type: 'load', config }
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/dev/layout/layoutDraft.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现纯 reducer 和存储格式**

Use:

```ts
export interface LayoutDraftSnapshot {
  config: GeneratedLayoutConfig
  selectedId?: string
}

export interface LayoutDraftState {
  past: LayoutDraftSnapshot[]
  present: LayoutDraftSnapshot
  future: LayoutDraftSnapshot[]
  dirty: boolean
}
```

Storage value:

```ts
interface StoredLayoutDraft {
  schemaVersion: 1
  baseCommit: string
  registryVersion: string
  savedAt: string
  config: GeneratedLayoutConfig
}
```

Return an explicit incompatibility result rather than silently applying mismatched drafts.

- [ ] **Step 4: 运行 reducer 测试**

Run:

```powershell
npx vitest --run src/dev/layout/layoutDraft.test.ts
npx tsc -b
```

Expected: PASS。

- [ ] **Step 5: 提交草稿状态**

Run:

```powershell
git add src/dev/layout
git commit -m "功能：添加布局草稿历史"
```

---

### Task 9: 构建编辑器操作台和三档画布

**Files:**
- Create: `src/dev/layout/LayoutDevEntry.tsx`
- Create: `src/dev/layout/LayoutEditor.tsx`
- Create: `src/dev/layout/LayoutElementTree.tsx`
- Create: `src/dev/layout/LayoutCanvas.tsx`
- Create: `src/dev/layout/LayoutInspector.tsx`
- Create: `src/dev/layout/layoutEditor.css`
- Create: `src/dev/layout/LayoutEditor.test.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `layoutPages`、桥接、草稿 reducer。
- Produces: `/dev/layout` 编辑器；设备宽度 `320`、`390`、`768`；页面树、画布、属性面板和工具栏。

- [ ] **Step 1: 写编辑器骨架失败测试**

Test:

```tsx
const html = renderToStaticMarkup(<LayoutDevEntry />)
expect(html).toContain('布局编辑器')
expect(html).toContain('窄屏')
expect(html).toContain('标准')
expect(html).toContain('宽屏')
expect(html).toContain('/dev/layout-preview?scene=')
```

Also assert the route is guarded by `import.meta.env.DEV` using an exported route helper:

```ts
expect(resolveDevEntry('/dev/layout', true)).toBe('layout')
expect(resolveDevEntry('/dev/layout', false)).toBeNull()
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/dev/layout/LayoutEditor.test.tsx
```

Expected: FAIL。

- [ ] **Step 3: 实现三栏操作台**

Required behavior:

- Left: page select, searchable element tree, lock/order status.
- Center: iframe with width map `{ narrow: 320, standard: 390, wide: 768 }`.
- Right: selected element label, parent, capabilities, inherited/current values.
- Toolbar: breakpoint buttons, undo, redo, reset element, interaction preview, generate source.
- Use `sandbox="allow-scripts allow-same-origin allow-forms"` on iframe.
- Display “草稿未写入源码” when `dirty`.
- Do not implement file generation yet; generate button remains disabled with explanatory title until Task 12.

Add route before normal hooks:

```tsx
if (import.meta.env.DEV && window.location.pathname === '/dev/layout') {
  return <LayoutDevEntry />
}
```

- [ ] **Step 4: 运行组件测试和类型检查**

Run:

```powershell
npx vitest --run src/dev/layout src/layout
npx tsc -b
```

Expected: PASS。

- [ ] **Step 5: 提交编辑器骨架**

Run:

```powershell
git add src/dev/layout src/main.tsx
git commit -m "功能：搭建响应式布局编辑器"
```

---

### Task 10: 实现属性编辑、拖拽、缩放和容器内排序

**Files:**
- Create: `src/dev/layout/layoutPointer.ts`
- Create: `src/dev/layout/layoutPointer.test.ts`
- Modify: `src/dev/layout/LayoutCanvas.tsx`
- Modify: `src/dev/layout/LayoutInspector.tsx`
- Modify: `src/dev/layout/LayoutEditor.tsx`
- Modify: `src/dev/layout/layoutBridge.ts`

**Interfaces:**
- Consumes: selected rect、parent rect、能力白名单、草稿 reducer。
- Produces:
  - `calculateDragPatch(input): LayoutRuleSet`
  - `calculateResizePatch(input): LayoutRuleSet`
  - `calculateReorder(items, draggedId, targetId): Record<string, number>`

- [ ] **Step 1: 写指针算法失败测试**

Create `src/dev/layout/layoutPointer.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  calculateDragPatch,
  calculateReorder,
  calculateResizePatch
} from './layoutPointer'

describe('layout pointer calculations', () => {
  it('turns a horizontal drag into marginInline when the element is flow-based', () => {
    expect(calculateDragPatch({
      strategy: 'flow',
      capabilities: ['spacing'],
      startRule: { marginInline: 16 },
      deltaX: -4,
      deltaY: 0
    })).toEqual({ marginInline: 12 })
  })

  it('uses anchored offsets only when positioned capability is enabled', () => {
    expect(calculateDragPatch({
      strategy: 'positioned',
      capabilities: ['positioned'],
      startRule: { anchor: 'top-left', offsetX: 10, offsetY: 20 },
      deltaX: 5,
      deltaY: -8
    })).toEqual({ anchor: 'top-left', offsetX: 15, offsetY: 12 })
  })

  it('clamps resized width to the parent bounds', () => {
    expect(calculateResizePatch({
      capabilities: ['size'],
      startWidth: 230,
      startHeight: 120,
      deltaX: 80,
      deltaY: 0,
      parentWidth: 280,
      parentHeight: 500
    })).toEqual({ width: 280, height: 120 })
  })

  it('returns sequential order values for siblings in one parent', () => {
    expect(calculateReorder([
      { id: 'a', parentId: 'nest.main', order: 10 },
      { id: 'b', parentId: 'nest.main', order: 20 },
      { id: 'c', parentId: 'nest.main', order: 30 }
    ], 'c', 'a')).toEqual({ c: 10, a: 20, b: 30 })
  })

  it('rejects reorder targets from another parent', () => {
    expect(() => calculateReorder([
      { id: 'a', parentId: 'nest.main', order: 10 },
      { id: 'b', parentId: 'calendar.main', order: 20 }
    ], 'a', 'b')).toThrow('cross_parent_reorder')
  })
})
```

Use order increments of `10` to leave insertion space.

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/dev/layout/layoutPointer.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现 Pointer Events 操作**

Rules:

- On pointer down capture selected element and parent rect.
- During move update preview using `requestAnimationFrame`.
- On pointer up dispatch one completed history action.
- Arrow keys change supported spacing/offset by `1px`; `Shift+Arrow` uses `8px`.
- Resize handles update width/height only if `size` is allowed.
- Reorder mode activates when dragging an `orderable` sibling across another sibling midpoint.
- Cross-parent target sends a rejected visual state and never dispatches.
- Inspector inputs dispatch the same reducer actions as pointer operations.

- [ ] **Step 4: 运行交互算法和编辑器测试**

Run:

```powershell
npx vitest --run src/dev/layout/layoutPointer.test.ts src/dev/layout/layoutDraft.test.ts src/dev/layout/LayoutEditor.test.tsx
npx tsc -b
```

Expected: PASS。

- [ ] **Step 5: 提交编辑能力**

Run:

```powershell
git add src/dev/layout
git commit -m "功能：支持拖拽缩放与布局排序"
```

---

### Task 11: 实现确定性源码生成器

**Files:**
- Create: `scripts/layout-source-service.mjs`
- Create: `scripts/layout-source-service.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: JSON 形式的 `GeneratedLayoutConfig`。
- Produces:
  - `generateLayoutConfigSource(config): string`
  - `generateLayoutCss(config): string`
  - `createLayoutCandidate(root, config): Promise<LayoutCandidate>`
  - `applyLayoutCandidate(root, candidate): Promise<void>`

- [ ] **Step 1: 写 Node 生成器失败测试**

Create tests using `node:test` and temporary directories:

```js
test('generates deterministic config and css', () => {
  const first = generateLayoutCss(sample)
  const second = generateLayoutCss({ ...sample })
  assert.equal(first, second)
  assert.match(first, /@media \(max-width: 374px\)/)
  assert.match(first, /@media \(min-width: 768px\)/)
})

test('refuses paths outside generated layout files', async () => {
  await assert.rejects(
    applyLayoutCandidate(root, {
      files: [{ path: '../styles.css', content: 'body{}' }],
      digest: 'invalid',
      baseDigests: {}
    }),
    /not allowed/
  )
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
node --test scripts/layout-source-service.test.mjs
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现配置、CSS、摘要和原子写入**

`LayoutCandidate` exact shape:

```js
{
  files: [
    { path: 'src/layout/generated/layout.config.ts', content, beforeContent },
    { path: 'src/layout/generated/layout.generated.css', content, beforeContent }
  ],
  digest: '<sha256 of normalized files>',
  baseDigests: {
    'src/layout/generated/layout.config.ts': '<sha256>',
    'src/layout/generated/layout.generated.css': '<sha256>'
  }
}
```

CSS selector format:

```css
[data-layout-id="nest.pet-status"] {
  margin-inline: 16px;
  max-width: 100%;
  order: 10;
}

@media (max-width: 374px) {
  [data-layout-id="nest.pet-status"] {
    margin-inline: 12px;
  }
}

@media (min-width: 768px) {
  [data-layout-id="nest.pet-status"] {
    grid-column: 1 / 2;
  }
}
```

Use temporary sibling files and `rename` for atomic replacement. Before apply, recompute current file digests and reject stale candidates.

Add:

```json
"test:layout-source": "node --test scripts/layout-source-service.test.mjs"
```

- [ ] **Step 4: 运行 Node 测试**

Run:

```powershell
npm run test:layout-source
```

Expected: PASS。

- [ ] **Step 5: 提交源码生成器**

Run:

```powershell
git add scripts/layout-source-service.mjs scripts/layout-source-service.test.mjs package.json package-lock.json
git commit -m "功能：生成独立布局源码"
```

---

### Task 12: 接入 Vite 开发端点和差异确认

**Files:**
- Create: `scripts/layout-vite-plugin.mjs`
- Create: `src/dev/layout/layoutSourceClient.ts`
- Create: `src/dev/layout/layoutSourceClient.test.ts`
- Create: `src/dev/layout/LayoutDiff.tsx`
- Modify: `src/dev/layout/LayoutEditor.tsx`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: Task 11 source service。
- Produces:
  - `POST /__pet10_layout/preview`
  - `POST /__pet10_layout/apply`
  - `previewLayoutSource(config)`
  - `applyLayoutSource(candidate)`

- [ ] **Step 1: 写客户端状态和请求失败测试**

Mock `fetch` and test:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyLayoutSource, previewLayoutSource } from './layoutSourceClient'

afterEach(() => vi.unstubAllGlobals())

describe('layoutSourceClient', () => {
  it('returns candidate files without applying them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidate: {
        files: [
          { path: 'src/layout/generated/layout.config.ts', content: 'next', beforeContent: 'before' },
          { path: 'src/layout/generated/layout.generated.css', content: 'next css', beforeContent: 'before css' }
        ],
        digest: 'preview-digest',
        baseDigests: {}
      },
      diff: '--- before\n+++ after'
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await previewLayoutSource({})

    expect(result.candidate.files).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/__pet10_layout/preview')
  })

  it('sends the preview digest during explicit apply', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'applied'
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const candidate = {
      files: [],
      digest: 'preview-digest',
      baseDigests: {}
    }

    await applyLayoutSource(candidate)

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      candidate,
      digest: 'preview-digest'
    })
  })

  it('returns stale_candidate without pretending the draft was applied', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'stale_candidate',
      message: '生成文件已变化，请重新预览'
    }), { status: 409 })))

    await expect(applyLayoutSource({
      files: [],
      digest: 'old-digest',
      baseDigests: {}
    })).rejects.toMatchObject({ code: 'stale_candidate' })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/dev/layout/layoutSourceClient.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现仅开发环境端点**

`layout-vite-plugin.mjs`:

- Handle JSON bodies with a 1 MB limit.
- `preview` validates config, creates candidate and returns candidate plus line-based unified diff.
- `apply` requires `{ candidate, digest }`, verifies digest and current file base digests, then writes.
- Reject non-POST with `405`.
- Return structured errors `{ code, message, details? }`.
- Never accept a client-supplied target path outside candidate files.

Register plugin only when `command === 'serve'`:

```ts
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === 'serve' ? [pet10LayoutPlugin()] : [])
  ]
}))
```

`LayoutDiff` displays each allowed file with additions/deletions and requires a second explicit “确认写入工作区” click.

- [ ] **Step 4: 运行前端和 Node 聚焦测试**

Run:

```powershell
npx vitest --run src/dev/layout/layoutSourceClient.test.ts src/dev/layout/LayoutEditor.test.tsx
npm run test:layout-source
npx tsc -b
```

Expected: PASS。

- [ ] **Step 5: 提交差异与安全写入**

Run:

```powershell
git add scripts/layout-vite-plugin.mjs src/dev/layout vite.config.ts
git commit -m "功能：预览并确认布局源码差异"
```

---

### Task 13: 扩展到全部页面外壳

**Files:**
- Modify: `src/layout/layoutRegistry.ts`
- Modify: `src/dev/layout/layoutScenes.tsx`
- Modify: `src/components/FeedScreen.tsx`
- Modify: `src/components/NotificationCenter.tsx`
- Modify: `src/components/MemoryPanel.tsx`
- Modify: `src/components/MbtiTestScreen.tsx`
- Modify: `src/components/AvatarStudio.tsx`
- Modify: `src/components/FortuneDetail.tsx`
- Modify: `src/games/gobang/GobangGame.tsx`
- Modify: `src/games/map/MapScreen.tsx`
- Modify: `src/games/tarot/TarotGame.tsx`
- Modify: `src/layout/layoutRegistration.test.tsx`
- Modify: `src/dev/layout/layoutScenes.test.tsx`

**Interfaces:**
- Consumes: 现有注册、场景和运行时包装。
- Produces: 全部用户可见页面外壳的预览入口和主要受控区域。

- [ ] **Step 1: 写完整页面清单失败测试**

Expected scene IDs:

```ts
[
  'app',
  'nest',
  'calendar',
  'messages',
  'chat',
  'me',
  'paw-menu',
  'feed',
  'notifications',
  'memory',
  'mbti',
  'avatar',
  'fortune-detail',
  'gobang',
  'map',
  'tarot'
]
```

Assert every page has:

- one root container registration;
- one matching scene;
- at least one editable item or an explicit locked-only reason.

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx vitest --run src/layout/layoutRegistration.test.tsx src/dev/layout/layoutScenes.test.tsx
```

Expected: FAIL，缺少覆盖层和游戏场景。

- [ ] **Step 3: 注册页面外壳和主要区域**

Add:

| Page | Root | Editable items |
| --- | --- | --- |
| feed | `feed.main` | header, composer, list |
| notifications | `notifications.main` | header, list |
| memory | `memory.main` | header, list |
| mbti | `mbti.main` | header, content, actions |
| avatar | `avatar.main` | preview, controls, actions |
| fortune-detail | `fortune-detail.main` | header, body |
| gobang | `gobang.main` | header, board-shell, controls |
| map | `map.main` | header, map-shell, legend |
| tarot | `tarot.main` | page-shell only; internal stage nodes locked |

Do not wrap or expose tarot card animation nodes, shuffle deck, cut deck, fan flight or reveal cards.

- [ ] **Step 4: 运行全部布局和受影响组件测试**

Run:

```powershell
npx vitest --run src/layout src/dev/layout src/components src/games/gobang src/games/map src/games/tarot/TarotGame.test.tsx
npx tsc -b
```

Expected: PASS。

- [ ] **Step 5: 提交全页面接入**

Run:

```powershell
git add src/layout src/dev/layout src/components src/games
git commit -m "功能：接入全应用布局页面"
```

---

### Task 14: 文档、快速验证和本地视觉验收

**Files:**
- Create: `docs/features/layout-editor.md`
- Modify: `docs/features/app-navigation.md`
- Modify: `scripts/verify-quick.mjs`
- Modify: `scripts/review.mjs`

**Interfaces:**
- Consumes: 完成的编辑器和源码生成流程。
- Produces: 非技术维护文档、布局聚焦验证命令和本地验收入口。

- [ ] **Step 1: 写文档检查前的功能文档**

`docs/features/layout-editor.md` must include:

- 用途和仅开发环境限制。
- `/dev/layout` 操作流程。
- 三档宽度和继承规则。
- 受控元素、锁定元素和容器内排序。
- 草稿、撤销、重做、重置。
- 源码差异、确认写入和失败状态。
- 代码入口、风险、回滚和验收清单。

Update `app-navigation.md`:

- `/dev/layout` and `/dev/layout-preview` are development-only.
- Production routes do not expose the editor.

- [ ] **Step 2: 增加布局快速验证范围**

Add `layout` to `scripts/verify-quick.mjs`:

```js
layout: [
  ['npx', ['vitest', '--run', 'src/layout', 'src/dev/layout']],
  ['npm', ['run', 'test:layout-source']],
  ['npx', ['tsc', '-b']],
  ['npm', ['run', 'check:docs']]
]
```

Update usage text to include `layout`. Add to `review.mjs` output:

```text
布局编辑器直达: /dev/layout
```

- [ ] **Step 3: 运行聚焦自动验证**

Run:

```powershell
npm run verify:quick -- --scope=layout
```

Expected: layout tests, Node source tests, type check and docs check all PASS。

- [ ] **Step 4: 启动本地验收并使用浏览器检查**

Run:

```powershell
npm run review
```

Read the exact URL printed by `npm run review`, then append `/dev/layout`. Example:

```text
http://127.0.0.1:4173/dev/layout
```

Check:

1. 页面树列出全部场景。
2. `320px`、`390px`、`768px` 切换正确。
3. 选择小窝宠物状态卡，拖拽后只显示草稿状态。
4. 撤销、重做和重置有效。
5. 同容器排序有效，跨容器移动被拒绝。
6. 交互预览模式恢复页面点击。
7. 生成源码先显示两个允许文件的差异。
8. 取消差异不写文件。
9. 确认写入后生成文件变化，刷新预览应用新布局。
10. 普通根路由、聊天页和塔罗流程没有编辑器遮罩或交互变化。
11. 浏览器控制台无错误。

- [ ] **Step 5: 运行受影响范围测试**

Run:

```powershell
npm run verify:quick -- --scope=ui
npm run verify:quick -- --scope=tarot
```

Expected: PASS。若失败，只修复与布局注册包装直接相关的问题。

- [ ] **Step 6: 提交文档和验证脚本**

Run:

```powershell
git add docs/features/layout-editor.md docs/features/app-navigation.md scripts/verify-quick.mjs scripts/review.mjs
git commit -m "文档：补充布局编辑器验收说明"
```

---

### Task 15: 完成前最终验证

**Files:**
- Verify only; do not change unrelated files.

**Interfaces:**
- Consumes: 全部实现。
- Produces: 可交付验证报告、用户验收 URL 和未验证项清单。

- [ ] **Step 1: 确认工作树和提交历史**

Run:

```powershell
git status --short --branch
git log --oneline --decorate -12
git diff origin/main...HEAD --stat
```

Expected: 工作树干净；提交均为中文；变更只涉及计划范围。

- [ ] **Step 2: 运行完整验证**

Run:

```powershell
npm run verify:full
```

Expected: type checking、frontend tests、server tests、production builds、architecture checks、documentation checks、asset checks 全部 PASS。

- [ ] **Step 3: 重新启动验收服务并报告 URL**

Run:

```powershell
npm run review
```

Report:

```text
Goal:
Files changed:
Behavior changed:
Tests:
Review URL: use the exact port printed by `npm run review`, followed by `/dev/layout`
Not verified:
Rollback:
```

Do not merge or deploy before user visually accepts `/dev/layout` and representative business pages.
