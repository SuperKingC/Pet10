# 小记页单人日记重设计（日记流 + 全页面纪念日）

## 背景与目标

现有小程序「小记」页是双人共享心情日历：每天上下两枚心情头像（上=我、下=好友），通过 `DayModal` 弹窗记录双方心情，另有房间维度的纪念日分页与今日运势区块。产品方向改为**单人记录**：小记页重设计为「个人日记 + 纪念日」，去掉双人心情，全部改为单人记录。

目标：

1. 小记主视图改为参考图二布局：周历条 + 今日日记卡片 + 写日记/拍照记录按钮 + 今日运势区块。
2. 顶部保留「日记｜纪念日」分页胶囊；点击纪念日跳转**全页面**（非弹窗），列表样式参考图一左侧。
3. 日记为个人维度，服务端新增 `diaries` 表与路由（用户明确同意服务端改动）。
4. 写日记/拍照记录进入**全页面**编辑器（非弹窗）。

## 非目标

- 不改 PWA（`src/`）的心情日历、小记与服务端既有 mood/anniversary 合同。
- 不实现参考图二的首页（HomeScreen）改版；首页保持现状。
- 不改动底部 tab 结构、塔罗、小窝、消息、我的等无关功能。
- 不做日记图片 CDN/COS 上传，图片按 base64 data URL 入库（沿用头像既有模式）。
- 不迁移历史心情数据为日记；旧 mood 数据保留在服务端供 PWA 使用。

## 服务端设计

### 迁移 `server/sql/008_diaries.sql`

```sql
CREATE TABLE diaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  day date NOT NULL,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]',
  liked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX diaries_user_day_idx ON diaries(user_id, day);
```

同一天允许多条记录；列表按 `day desc, created_at desc` 排序。

### 路由（新增 `server/src/http/diaryRoutes.ts`）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/diaries?from=YYYY-MM-DD&to=YYYY-MM-DD` | 本人区间日记（含照片） |
| POST | `/api/diaries` | 创建，返回完整条目 |
| PUT | `/api/diaries/:id` | 更新 title/body/location/photos |
| DELETE | `/api/diaries/:id` | 删除本人条目 |
| POST | `/api/diaries/:id/like` | 切换 liked，返回完整条目 |

校验（zod，新增 `diaryService` 协调、repository 合同 + memory + postgres 实现，遵循现有分层）：

- `day` 匹配 `YYYY-MM-DD`；`title` ≤ 40 字；`body` ≤ 1000 字；`location` ≤ 40 字；
- `photos` 最多 3 张，每项匹配 `^data:image/(png|jpeg|webp);base64,` 且 ≤ 300,000 字符；
- 越权访问他人日记返回 404。

## 小程序设计

### 主视图 `features/main/MiniappJournalView.tsx`（替换 `MiniappCalendarView`）

- 页头：标题「小记」，副标题改为单人口吻「记录和小多利的每一天。」
- 顶部分页胶囊：`日记`（当前视图）｜`纪念日`（`Taro.navigateTo` 全页面）。
- 周历条：`‹ 2026年8月 ›` 按**周**切换（±7 天），7 格周一至周日；有日记的日期显示小圆点；选中日默认今天，选中态橙色圆底（参考图一/图二）。
- 「今日日记」区块（选中非今天时标题变为「当日日记」）：
  - 有日记：卡片展示首张配图、标题、正文预览；下方照片行（≤3）、地点（有则显示）、喜欢心形（调 like 接口切换）、分享（`Button open-type="share"`，复用 index 页 `useShareAppMessage`，新增日记分享标题状态）。
  - 同一天多条时按时间倒序叠放卡片。
  - 无日记：虚线引导卡「还没有日记，记录今天的生活吧」。
  - 点卡片 → 编辑器页编辑该条。
- 操作按钮：`写日记`（空编辑器，day=选中日）；`拍照记录`（主视图先 `Taro.chooseMedia` 相机/相册取图，经草稿模块把临时路径交给编辑器页）。
- 底部「今日运势」区块：复用现有运势加载逻辑与 `MiniappFortuneView` 全屏浮层（未设置生日时提示先设置生日）。
- 样式沿用现有格纸风与壳层背景；继承当前未提交的壳层 padding 调整（顶部 16px 意图）。

### 新增全页面 `pages/journal-anniversary/`

- 全页面纪念日列表（参考图一左侧，非弹窗）：页头「纪念日」，顶部「+ 添加纪念日」按钮；列表项含图标、名称、日期、已度过/倒计时天数（复用 `anniversaryModel`）。
- 点列表项或添加按钮 → 同页切换为**全页面表单**（复用 `AnniversaryForm` 内联渲染，含删除按钮），不再使用 `MiniappModal`。
- 数据沿用现有房间维度 anniversary API：roomId 由 index 页通过 query 传入；为空时页面内 `listConversations` 回退 `pet_dm`（复用 `resolveMoodRoomId`）。

### 新增全页面 `pages/journal-editor/`

- 参数：`id`（编辑模式）、`day`。
- 字段：日期展示、标题输入、正文 textarea、照片管理（添加≤3/删除，`chooseMedia`）、地点输入、保存按钮；编辑模式可删除该条。
- 保存前对每张图片 `Taro.compressImage`（quality 60）并转 base64；单张超限 toast 提示。
- 保存成功 `navigateBack`；主视图在 `useDidShow` 时重新拉取区间日记。

### 服务与模型

- 新增 `services/diaryApi.ts`（上述路由合同）。
- 新增 `features/main/journalModel.ts`：周历条生成（`getWeekDays(cursor)`）、按周移位、按 day 分组日记、圆点标记等纯函数；配 `journalModel.test.ts`。
- 照片草稿交接 `features/main/journalDraft.ts`（内存级 set/get，拍照记录用）。

### 删除清单（双人心情）

- `DayModal.tsx` 及其引用；
- 主视图心情双槽、网格日历、「我/好友」图例；
- `calendarModel.ts` 中 mood 相关函数（`buildMoodByDay` 等）与 `calendarModel.test.ts` 对应用例（日期工具迁入 `journalModel`）；
- 小程序 `socialApi.ts` 的 `listMoods/setMood`；
- `miniapp/src/assets/moods/*` 图片。

## 测试计划

- 服务端：`diaryService.test.ts`（创建/列表区间/更新/删除/like 切换/校验边界/越权 404）。
- 小程序：`journalModel.test.ts`（周历条、周移位、分组、圆点）；既有 `anniversaryModel.test.ts` 保持通过；涉及小记文案的呈现类测试同步更新。
- 构建验证：`npm run build:weapp --prefix miniapp` 通过。

## 验收与文档

- 按 `.agents/rules/miniapp-change.md`：清 `miniapp/dist` 缓存 → 重新编译 → 微信开发者工具 CLI 清缓存并重开。
- 验收路径：小记 tab → 周历条切换/选日 → 写日记（标题+正文+照片+地点）保存回显 → 拍照记录带图进入编辑器 → 喜欢切换 → 分享 → 纪念日全页面增删改与天数 → 今日运势浮层。
- 更新 `docs/features/miniapp.md` 小记相关描述（单人日记、全页面纪念日/编辑器、今日运势区块）。
