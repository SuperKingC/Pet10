# “我的”列表手绘图标 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用用户截图中的五个手绘图标替换“我的”页面列表项前的 emoji。

**Architecture:** 静态 PNG 资源放在 `public/me/`，由 `MeTab` 通过普通图片元素渲染。视觉尺寸和对齐由现有全局样式中的 `me-list` 局部规则控制，资源登记到资产清单。

**Tech Stack:** React 19、TypeScript、Vitest、CSS、PNG

## Global Constraints

- 只修改“我的”页面五个列表前缀图标。
- 保持现有文字、颜色、布局结构和交互行为。
- 图标必须来自用户提供的原图，并输出透明背景运行时资源。
- 不新增运行时依赖。

---

### Task 1: 锁定列表图片语义

**Files:**
- Create: `src/components/MeTab.test.tsx`
- Modify: `src/components/MeTab.tsx`

**Interfaces:**
- Consumes: `MeTab` 当前属性接口
- Produces: 五个带明确 `alt` 文本和稳定资源路径的图片元素

- [ ] **Step 1: 写失败测试**

断言生日、消息通知、联系我们、关于小多利、退出登录分别渲染 `/me/birthday.png`、`/me/notification.png`、`/me/contact.png`、`/me/about.png`、`/me/logout.png`，图片使用空 `alt` 避免与相邻文字重复朗读，并且列表文本中不包含原 emoji。

- [ ] **Step 2: 验证测试失败**

Run: `npm test -- --run src/components/MeTab.test.tsx`

Expected: FAIL，因为当前页面仍使用 emoji，图片元素不存在。

- [ ] **Step 3: 最小实现**

在 `MeTab` 中增加局部图标渲染结构，并保持所有按钮、链接和事件处理器不变。

- [ ] **Step 4: 验证测试通过**

Run: `npm test -- --run src/components/MeTab.test.tsx`

Expected: PASS

### Task 2: 生成并登记透明图标

**Files:**
- Create: `public/me/birthday.png`
- Create: `public/me/notification.png`
- Create: `public/me/contact.png`
- Create: `public/me/about.png`
- Create: `public/me/logout.png`
- Modify: `docs/assets/asset-manifest.json`

**Interfaces:**
- Consumes: 用户提供的 1024×1024 PNG
- Produces: 五个透明背景、紧边界、适合列表显示的 PNG

- [ ] **Step 1: 恢复附件原图**

从当前会话记录中的 `input_image` 数据恢复原始 PNG 到临时目录。

- [ ] **Step 2: 裁切并透明化**

按五个图标区域裁切，去除浅米色背景，缩放到统一画布并保存到 `public/me/`。

- [ ] **Step 3: 登记资源**

把五个图标登记为 `runtime-feature`，用途写明为“我的页面列表图标”。

- [ ] **Step 4: 检查资源**

Run: `npm run check:assets`

Expected: PASS

### Task 3: 对齐视觉并验收

**Files:**
- Modify: `src/styles.css`
- Modify: `docs/features/app-navigation.md`
- Modify: `docs/features/assets-and-performance.md`

**Interfaces:**
- Consumes: `.me-list__icon` 图片结构
- Produces: 统一的图标占位、比例和移动端对齐

- [ ] **Step 1: 添加局部样式**

为图标增加固定占位、`object-fit: contain` 和禁止收缩规则，不改动列表其他布局。

- [ ] **Step 2: 更新文档**

记录“我的”页面图标入口和 `public/me/` 资源目录。

- [ ] **Step 3: 运行快速验证**

Run: `npm run verify:quick`

Expected: PASS

- [ ] **Step 4: 启动本地验收**

Run: `npm run review`

Expected: 输出可访问的本地 URL，在“我的”页检查五个图标、移动端布局和控制台错误。
