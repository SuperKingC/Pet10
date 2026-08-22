# 小程序小记页重设计（大日历 + 双人心情图标）

## 概述

重设计小程序「小记」页：参考用户提供的可爱心情日历图，采用轻盈格纸风大日历，每天上下两枚手绘小多利心情头像（上=我、下=好友）；点日期通过统一弹窗记录/查看心情。数据逻辑复用 PWA 的 `listMoods` / `setMood`（仅当天可记录）。仅改动 `miniapp/`，不动 Web 端与服务端。

视觉 mockup 见 `.superpowers/brainstorm/journal-20260823/content/journal-final-preview.html`（本地视觉伴侣服务预览）。

## 视觉设计（方案 A · 轻盈格纸风，已确认）

- 页面背景：奶油白 `#fdfaf5` + 淡棕格纸线（repeating-linear-gradient，约 22px 网格、线色 `rgba(190,170,140,.14)`）。
- 页头：保留「小记」标题 + 副标题「记录你们一起度过的每一天」。
- 月份栏：`‹ 2026年 8月 ›` 居中，棕橙 `#8a4f37`。
- 星期行：**周一起始**（与 PWA 一致）：一二三四五六日。
- 日历格：无单日白卡；每格 = 日期数字（小、`#8e776a`）+ 上下两个圆形心情图标槽位（上=我，下=好友）。
  - 图标显示尺寸约 64rpx（32px），圆形裁切（`border-radius: 50%`）。
  - 无记录的槽位留空（保持行对齐）。
  - 「今天」日期数字替换为橙色 `#d9845d`「今天」。
- 图例行：`[图标] 我 · [图标] {好友名}`。
- 今日运势卡片：保留现有样式与详情弹窗（`MiniappFortuneView`），位置在日历下方。
- 字体：全部使用小程序语义字体变量（`var(--font-size-*)` / `var(--font-weight-*)`），不硬编码字号。

## 心情图标（已确认 v2 手绘水彩版）

- 4 张基于小多利角色形象的夸张表情头像，哑光水粉/暖金棕水彩手绘风，与现有 `xiaoduoli.png` 风格一致：
  - `mood-1.png` 低落：泪眼+泪珠+垂耳+小雨云
  - `mood-2.png` 一般：半圆平静眼+小直线嘴+汗滴
  - `mood-3.png` 不错：吐舌笑+星星眼+小火花
  - `mood-4.png` 特别好：眯眼大笑+腮红+爱心星星
- 存放 `miniapp/src/assets/moods/`，160×160 PNG（System.Drawing 缩放自 1024 源图），单张 < 180KB。
- 白底图通过圆形裁切融入界面（与现有头像用法一致）。

## 交互设计

- 点「今天」→ `MiniappModal` 弹窗「今天的心情」：4 个心情图标按钮（图标 96rpx + 文案），点选即 `setMood` 保存并关闭；保存中显示 loading。
- 点过去日期 → 弹窗「{M}月{D}日的心情」：两行展示 我/好友 的图标+文案；若当天无记录显示「这天还没有心情记录」。
- 点未来日期 → 无响应。
- 弹窗遵循统一规范：奶油白 `#fffaf6`、圆角 28px、遮罩 0.5（复用 `MiniappModal` 组件）。
- 记录成功后日历当日「我」行图标即时更新。

## 数据与接口

- 复用 `socialApi.listMoods(roomId, from, to)` 与 `socialApi.setMood(roomId, level)`，不新增服务端接口。
- `MiniappCalendarView` 新增 props：`myUserId`、`friendId`、`friendName`，由 `pages/index/index.tsx` 从 `LaunchContext`（`context.user.id`、当前 room 的 `partner`）传入（参照 `MiniappGobangPanel` 的传法）。
- 心情映射纯函数放 `calendarModel.ts`：`buildMoodByDay(moods, myUserId)` → `Map<day, { mine?: MiniappMood; friend?: MiniappMood }>`；`getCalendarMonth` 增加周一起始前置格计算（`mondayLead`）。

## 改动文件清单

1. `miniapp/src/assets/moods/mood-1..4.png`（新增，压缩后）
2. `miniapp/src/features/main/calendarModel.ts`（+`mondayLead`、`buildMoodByDay`）
3. `miniapp/src/features/main/calendarModel.test.ts`（新增用例）
4. `miniapp/src/features/main/MiniappCalendarView.tsx`（重写视图与弹窗）
5. `miniapp/src/features/main/MiniappCalendarView.scss`（重写样式）
6. `miniapp/src/pages/index/index.tsx`（传新 props）

## 非目标

- 不改 Web 端（`src/`）、服务端（`server/`）。
- 不支持补记过去日期（服务端仅当天）。
- 不引入聊天爪印标记（PWA 有、小程序现状没有，保持现状）。
- 不改 TabBar、运势逻辑、其他页面。

## 验证计划

1. `calendarModel.test.ts` 新用例通过；`npm test`（miniapp）全绿；`tsc` 无错。
2. `npm run build:weapp` 成功，确认 `dist` 含新图标且单张 < 180KB、主包 < 2MB。
3. 按 `.agents/rules/miniapp-change.md`：微信开发者工具 CLI 清缓存 + close/open 重编译。
4. 预览核对：日历双人图标、今天橙色标注、点今天弹窗四选一、点过去日期查看弹窗、运势卡片正常。
