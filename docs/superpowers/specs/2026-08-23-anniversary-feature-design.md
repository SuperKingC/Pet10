# 心情图标放大与纪念日功能设计

日期：2026-08-23
范围：小程序端「小记」页（`miniapp/src/features/main/MiniappCalendarView.tsx`）与服务端社交模块。

## 背景与目标

「小记」页目前有日历 + 心情记录。需求：

1. 日历格子与选择/查看弹窗中的心情图标放大。
2. 点击日期的弹窗除心情外，支持设置并查看纪念日。
3. 纪念日可选 5 种图标（爱心、星星、蛋糕、爪印、气球），可加说明文字。
4. 设置后在日历日期数字上以该图标标记。
5. 小记页增加「日历｜纪念日」分页，纪念日分页展示列表、已度天数与倒计时。

非目标：

- 不做农历/公历转换（日期一律公历）。
- 不做纪念日提醒推送/通知。
- 不改变心情记录的业务规则（仅当天可记录）。

## 已确认决策

| 决策点 | 结论 |
| --- | --- |
| 纪念日归属 | 挂在房间上双方共享，与 moods 一致；无好友时回退个人 `pet_dm` 房间（复用 `resolveMoodRoomId`） |
| 重复方式 | 支持「每年重复」与「不重复」两种，创建时选择 |
| 查看入口 | 小记页内「日历｜纪念日」分段分页（不新增底部导航） |
| 图标组 | 爱心、星星、蛋糕、爪印、气球，共 5 种，手绘成小多利风格资源图 |

## 一、心情图标放大（纯样式）

修改 `MiniappCalendarView.scss`：

- `.miniapp-calendar__slot` / `.miniapp-calendar__mood-icon`：68rpx → 84rpx
- `.mood-modal__icon`：96rpx → 128rpx
- `.mood-modal__row-icon`：84rpx → 112rpx
- `.miniapp-calendar__legend-icon` 保持 36rpx 不变

格子 `min-height` 随内容自然撑开，不额外限制。

## 二、日期弹窗升级为「心情 + 纪念日」

交互变化：

- `openDay` 放开限制：任意日期（含未来）都打开弹窗；今天仍进心情选择，过去仍看心情记录，未来日期不显示心情区块。
- 弹窗内容分两块，仍使用现有 `MiniappModal`：
  1. 心情区：今天 = 4 宫格选择（放大后图标）；过去 = 双方记录行；未来 = 不显示。
  2. 纪念日区：
     - 该日已有纪念日 → 列出图标、名称、说明，每条可编辑/删除；
     - 无纪念日 → 「为这一天设置纪念日」按钮。
- 新建/编辑表单（弹窗内切换为表单态）：
  - 名称：必填，单行输入，长度上限 20 字；
  - 图标：5 选 1，横向选择行；
  - 说明：可选，长度上限 50 字；
  - 重复方式：「每年重复 / 不重复」二选一，默认每年重复；
  - 日期：弹窗入口创建时固定为所点日期；从纪念日分页「+ 添加纪念日」进入时用原生 `Picker mode="date"` 选日期。

日历上的匹配规则：

- 每年重复：匹配月-日（任意年份的该日都标记）；
- 不重复：仅匹配精确日期。

## 三、日历日期标记

- 有纪念日的日期，在日期数字（或「今天」文字）右上角叠加约 32rpx 的图标徽标。
- 同一天多个纪念日：日历格子只显示第一个（按创建顺序），完整列表在日期弹窗与纪念日分页查看。
- 徽标与心情图标槽位互不影响，可同时存在。

## 四、小记分页「日历｜纪念日」

- 页头标题「小记」下方增加分段切换：`日历` / `纪念日`，默认日历。
- 日历分页保持现状（含今日运势卡片）。
- 纪念日分页：
  - 列表卡片，每条显示：图标、名称、日期、说明摘要（一行截断）、天数信息。
  - 天数信息规则：
    - 每年重复：`已经过去 N 天`（首个日期起算）+ `距第 X 周年还有 M 天`；若当天即周年日，显示 `今天是第 X 周年 🎉`；未到首个日期则仅显示 `还有 M 天`。
    - 不重复且已过：`已经过去 N 天`；未到：`还有 N 天`。
  - 排序：按最近临近升序（下一次发生日距今）；不重复且已过的排在最后，按过去时间近→远。
  - 底部「+ 添加纪念日」按钮，进入表单态（含日期选择器）。
  - 点卡片 → 打开该纪念日的编辑表单。
  - 空状态：一句话引导 + 添加按钮。

## 五、数据与服务端

新增迁移 `server/sql/007_anniversaries.sql`：

```sql
CREATE TABLE anniversaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  day DATE NOT NULL,
  repeat TEXT NOT NULL DEFAULT 'yearly', -- yearly | none
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, name, day)
);
```

服务端分层（遵循现有架构边界）：

- `domain/models.ts`：新增 `Anniversary` 类型。
- `repositories/contracts.ts` + postgres/memory 两个实现：`create / update / delete / listByRoom`。
- 服务层：校验 name/icon/repeat/day 合法性，房间成员鉴权与 moods 接口一致。
- HTTP 接口：
  - `GET /api/social/rooms/:roomId/anniversaries`
  - `POST /api/social/rooms/:roomId/anniversaries`
  - `PUT /api/social/rooms/:roomId/anniversaries/:id`
  - `DELETE /api/social/rooms/:roomId/anniversaries/:id`

## 六、小程序端结构

- `services/socialApi.ts`：新增 4 个方法与 `MiniappAnniversary` 类型。
- 新增纯函数模块 `features/main/anniversaryModel.ts`：
  - `matchesDay(anniversary, dayKey)`：日历标记匹配；
  - `anniversaryStats(anniversary, today)`：返回已度天数、距下次周年天数、周年序号、文案片段；
  - `sortAnniversaries(list, today)`：列表排序。
  - 全部为确定性纯函数，配套单元测试（`anniversaryModel.test.ts`），闰年 2-29 的周年顺延到 2-28。
- 图标资源：`miniapp/src/assets/anniversaries/anniv-heart.png`、`anniv-star.png`、`anniv-cake.png`、`anniv-paw.png`、`anniv-balloon.png`，手绘小多利风格，遵守资源体积预算。
- `MiniappCalendarView.tsx` 重构：抽离日期弹窗（心情+纪念日）与纪念日分页为独立子组件文件，保持主组件职责清晰。

## 七、测试与验证

- 单元测试：`anniversaryModel` 计算（含跨年、闰年、当天周年）；服务端纪念日接口测试；现有 `calendarModel.test.ts` 保持通过。
- UI 变更提供本地预览 URL；按 miniapp 变更规则清缓存重编译。
- 合并前运行 `npm run verify:full`；视觉变更需用户验收。
