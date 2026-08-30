# 衣柜 · 照片墙 · 任务（含道具经济与默契换装）系统设计

日期：2026-08-29（v2，吸收用户三点反馈）
状态：设计稿（待用户确认后实施）

## 背景与定位

小窝「已养宠」态（`getNestSceneMode` 为 `active`）右上已有三个快捷图标：衣柜、照片墙、任务（`MiniappNestView.tsx:16-18, 120-132`，素材 `nest/wardrobe.png` / `photo-wall.png` / `tasks.png`）。当前点击无响应，是死区；空状态与锁定态（信件场景）本就不渲染快捷区，本设计不涉及。

三个系统共用一个产品叙事，v2 起形成**完整经济闭环**：

```
任务（产出道具+经验） → 道具（照顾动作的门票） → 照顾小多利（涨等级）
        ↓                                          ↓
默契换装/装扮（服饰解锁与默契打卡） ← 衣柜（等级+任务解锁服饰）
        ↓
照片墙（默契换装拍照 + 各机制自动/手动入墙的回忆陈列）
```

## 实施顺序

**任务+道具 → 照片墙 → 衣柜（含默契换装）**。任务和道具是一体两面（先有产出/消耗闭环），照片墙承接照片类内容，衣柜+换装需要素材出件放最后。每期独立提交、独立验收。

## 通用约定（三系统一致）

- **房间维度**：小多利一人一只、共享房间已存在，三系统数据全部挂在当前房间。
- **入口**：小窝快捷区三图标分别打开对应面板，仅 `active` 态可点；默契换装卡在小窝页面最底部（见照片墙一节）。
- **面板形态**：复用纪念日面板模式——当前页全屏固定层，定高 `overflow: hidden` 一屏不可滑动（超矮机型层内滚动兜底），顶栏用共享 `MiniappBackButton`，入场动效支持 `prefers-reduced-motion` 降级，先骨架后内容。不新增独立路由页。
- **服务端分层**：`server/src/http/` 路由（zod 校验 + `authMiddleware` + `isRoomMember`）→ `server/src/services/` 用例 → `server/src/repositories/` 持久化；迁移幂等追加到 `server/src/db/migrations.ts`（`uuid PK DEFAULT gen_random_uuid()`、外键 `ON DELETE CASCADE`、房间索引入），同步扩展 `contracts.ts` 的 `RepositoryBundle` 与内存实现。
- **客户端分层**：`services/` 加 API 封装（沿用 `diaryApi` 风格），`features/main/` 加面板组件与 SCSS，纯判定逻辑（周期、解锁、道具映射）放 `domain/` 配 vitest；组件不做领域计算。
- **实时性**：第一版全走拉取，不接 Socket.IO。
- **提交纪律**：每期完成后清缓存重编译 `miniapp/dist`，微信开发者工具清缓存预览，汇报「本次修改/修改文件/行为变化/自动验证/预览方式/验收路径/重点检查/未验证内容/回滚方式」，**用户视觉验收后**才提交合入 main。

### 明确不在范围（三系统整体）

- Web 端（`src/`）不做；
- 不做实时推送；不做任务到期推送（`pushService` 联动留后续）；
- 不打通日记照片与照片墙（个人维度语义混乱）；
- 不改造 `pet_tasks` / 提醒功能；
- 不重绘小多利立绘（服饰用参考图切件覆盖件方案，见衣柜一节）；
- 道具不做购买/充值（只产出不消耗货币）。

---

## 一、任务系统 + 道具经济（第一步做）

### 定位

任务是小多利世界的**经济源泵**：两人完成照顾计划 → 获得**道具 + 小多利经验**；道具是照顾动作的**门票**——没有道具就不能喂食/玩耍/清洁/睡觉。这把「照顾面板」从无成本连点变成有取舍的经营：想照顾好小多利，就得每天来做任务。

### 与现有 `pet_tasks` 的关系

`pet_tasks` 是 `reminderService` 的内部定时器（聊天说「提醒我」→ 到点小多利发消息），语义冲突。**不改老表，新增 `nest_tasks`**，两者互不知晓。

### 照顾动作改造（核心行为变化）

现有 `POST /api/rooms/:roomId/pet-actions`（`roomRoutes.ts:39`）目前免费无消耗。改造为：

1. 请求带 `action`，服务端按 `ACTION_COST` 映射找到所需道具；
2. 检查房间道具库存，不足返回 409 `insufficient_item`（带 `requiredItem` 信息供前端提示）；
3. 足够则**扣 1 个** + 原有 `applyPetAction` 生效 + 记 `pet_events`；
4. 前端照顾面板按库存置灰：库存为 0 的动作按钮灰置 + 小锁/「+0」角标，点击弹提示「道具不够啦，去完成任务获得 {道具名} 吧」，附「去做任务」跳转入口。

**动作-道具映射**（`server/src/domain/itemCatalog.ts` 常量，两端共享语义）：

| 动作 | 消耗道具 | 图标 key | 说明 |
| --- | --- | --- | --- |
| feed 喂食 | 狗粮 🍚 `dog_food` | item-dog-food | |
| play 玩耍 | 皮球 ⚽ `ball` | item-ball | |
| clean 清洁 | 香皂 🧼 `soap` | item-soap | 洗澡即清洁动作的口语化 |
| sleep 睡觉 | 无消耗 | — | 睡觉是自然节律，永远可用——否则小多利没体力会陷入「没道具→没法玩→没法挣道具」的死锁 |

> 防死锁设计：sleep 永久免费 + 新手礼包（见下）双保险。即使两人长期不登录，回来后靠新手包余量和睡觉保底可恢复运转。

### 数据模型（新表）

```sql
CREATE TABLE IF NOT EXISTS nest_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,                        -- ≤20 字
  icon text NOT NULL DEFAULT 'paw',
  repeat_rule text NOT NULL DEFAULT 'daily' CHECK (repeat_rule IN ('daily','weekly','none')),
  reward_items jsonb NOT NULL DEFAULT '[]',   -- [{itemId, count}]
  reward_exp int NOT NULL DEFAULT 10,
  last_completed_day date,                    -- 上海时区自然日
  last_completed_by uuid,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nest_tasks_room_idx ON nest_tasks (room_id, archived, created_at);

CREATE TABLE IF NOT EXISTS room_inventory (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  item_id text NOT NULL,                      -- itemCatalog 中的 key
  count int NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, item_id)
);

CREATE TABLE IF NOT EXISTS room_pouches (
  room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()   -- 新手礼包已发标记
);
```

- `room_pouches` 只存「发过没有」；新手礼包内容是目录常量（`STARTER_POUCH = { dog_food: 3, ball: 2, soap: 2 }`），首次读取任务面板时若未发过则发放并落库。
- 任务奖励不在此固定——建任务时从**建议奖励**（每日 1 狗粮档）选择，允许创建者微调数量（每日任务 1–3 件、每周 3–7 件、单次 1–5 件，域函数校验上限防刷）。

### 领域规则（`server/src/domain/nestTaskRules.ts` / `itemCatalog.ts`）

- `isDoneToday(task, today)`：daily 对今日、weekly 对本周一、none 完成过即完成；
- `applyTaskReward(pet, exp)`：只加经验，复用从 `applyPetAction` 抽出的 levelUp 逻辑（`server/src/domain/petRules.ts:31-35`）；
- 完成防刷：每任务每周期一次，重复返回 409；
- 库存变更全部走 service 内「读-改-写同一事务」，并发扣减由 `UPDATE ... SET count = count - 1 WHERE count > 0` 的条件更新兜底，返回行数为 0 即不足。

### API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/rooms/:roomId/tasks` | 未归档列表 + `doneToday` + `doneByName`；首次调用触发新手礼包 |
| POST | `/api/rooms/:roomId/tasks` | 新建 `{title, icon?, repeatRule, rewardItems, rewardExp}`，活跃上限 8 条 |
| PATCH | `/api/rooms/:roomId/tasks/:taskId` | 编辑 / `archived: true` 归档 |
| POST | `/api/rooms/:roomId/tasks/:taskId/complete` | 校验周期 → 发道具+经验 → 返回 `{task, pet, grantedItems}` |
| GET | `/api/rooms/:roomId/inventory` | 道具库存 `{items: [{itemId, count}]}` |
| POST | `/api/rooms/:roomId/pet-actions` | **改造现有接口**：扣道具，库存不足 409 `insufficient_item` |

### 小程序交互

- 任务面板：列表卡（图标贴纸座 + 标题 + 奖励预览「🍖×1 · 小多利 +10 经验」+ 右侧完成胶囊）；完成时星星礼花 + 「获得 狗粮×1，小多利开心多了！」；底部虚线「+ 添加任务」→ 表单（标题、图标格、重复分段、奖励选择）。
- 照顾面板（`PetActionBar`）改造：四个动作按钮下加库存角标（`×3`），0 库存灰置；点击灰按钮弹提示并给「去做任务」入口（关闭面板切到任务面板或小窝内引导）。
- 道具库存条：照顾面板标题旁或任务面板顶部显示当前库存（粮/球/皂小图标+数量），来源 `GET /inventory`。
- 新手礼包：首次进入任务面板弹轻提示「小多利的见面礼：狗粮×3 皮球×2 香皂×2」。

### 测试

- server：`nestTaskService.test.ts`（完成发奖、重复拒绝、周期重置、上限 8）、`petService.test.ts` 扩展（无道具 409、扣减、sleep 免费）、`itemCatalog.test.ts`（映射完整、新手包只发一次）。
- miniapp：`nestTaskModel.test.ts`、`itemPresentation.test.ts`（库存显示/置红/动作映射文案）+ 面板渲染测试。

---

## 二、照片墙系统（第二步做）

### 定位

房间维度的共同照片陈列墙，拍立得软木墙视觉。v2 增加两个变化：**默契换装拍照入墙**（核心互动，见下）与**多个自动生成机制**，让照片墙有持续新增的内容，而不是只靠手动上传。

### 数据模型（新表）

```sql
CREATE TABLE IF NOT EXISTS photo_wall (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,  -- 自动生成可为 NULL
  origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','match_outfit','levelup','anniversary','codeword_streak')),
  photo text NOT NULL,                 -- dataURL 或由服务端合成的图
  caption text NOT NULL DEFAULT '',    -- ≤40 字
  taken_day date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photo_wall_room_idx ON photo_wall (room_id, created_at DESC);
```

- 上限 **36 张**（手动 + 自动合计，超出自动淘汰最旧的手动照；`origin='match_outfit'` 的默契卡不被自动淘汰，只能手动删）。
- 手动上传 dataURL ≤ 300_000 字符，走 `imageCompression.ts` 统一链路。

### 入墙机制（手动 + 自动）

| 机制 | 类型 | 说明 |
| --- | --- | --- |
| 手动上传 | 手动 | 基础能力：选图→压缩→caption→贴墙 |
| **默契换装卡** | 双方协作 | 见下节，小窝底部入口，拍照入墙 |
| 升级纪念 | 自动 | 小多利每次升级，服务端自动生成一张「Lv.N 达成」纪念卡（模板合成：底图+等级字样+日期）入墙，caption「小多利升到 Lv.N 啦」 |
| 纪念日仪式 | 半自动 | 纪念日当天双方任一人打开小窝，弹出「今天是 {名称}，拍一张纪念吧」引导卡，拍照后以该纪念日名义入墙（可跳过） |
| 暗号连胜 | 自动 | 每日暗号连续 7 天都答上，自动生成「暗号连胜×7」趣味卡入墙（模板合成，无真实照片） |

自动卡实现：`server/src/services/photoWallService.ts` 内做**模板合成**——底图用包内/服务端静态贴纸素材 + 文字排版（sharp），输出 PNG 存 dataURL；不依赖 AI 生图（`imageGenerationService` 成本高、慢，留后续可选）。每类自动卡有冷却（升级卡每次升级 1 张；连胜卡每满 7 天 1 张）。

### API（挂 `/api/rooms/:roomId/photos`）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/photos` | 列表（倒序）+ 上传者名 + origin 标记 |
| POST | `/photos` | 手动 `{photo, caption?, takenDay?}` |
| PATCH | `/photos/:photoId` | 改 caption |
| DELETE | `/photos/:photoId` | 双方可删；默契卡也可删 |

升级/连胜卡的自动写入在 `petService`（升级事件）与暗号结算处挂 service 调用，HTTP 层不感知。

### 小程序交互

- 全屏面板：顶部墙面插画，2 列拍立得网格（白框+微差倾角+图钉），自动卡右上角小徽章区分来源（等级🏆/纪念日📅/暗号🔑/默契👕）；默契卡尺寸放大一档。
- 点照片：自绘大图覆盖层（`previewImage` 不支持 dataURL，复用日记先例），可改 caption/删除。
- 空态：小多利趴墙边插画 + 引导。

### 默契换装（小窝最底部入口，随衣柜期一起实施）

**玩法**：每天双方各自在衣柜里为小多利选一件当日装扮（互相看不见对方的选择）→ 双方都选完后揭晓：一致则生成「默契打卡」卡自动入墙（今日装扮 + 「心有灵犀！」+ 日期），不一致则显示「明天再试试，默契值 +1」；连续默契有连胜计数。

- **入口**：小窝页面最下方新增一张「今日默契换装」横卡（左侧小多利小立绘+当日装扮预览，右侧「去换装」按钮 + 连胜天数角标）；未换装双方时卡片显示「TA 已选好啦，就等你了」。
- **数据模型**（随衣柜期建表）：

```sql
CREATE TABLE IF NOT EXISTS outfit_match_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  day date NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, day, user_id)
);
CREATE TABLE IF NOT EXISTS outfit_match_streak (
  room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  streak int NOT NULL DEFAULT 0,
  best_streak int NOT NULL DEFAULT 0,
  last_match_day date
);
```

- **判定**（`server/src/domain/outfitMatchRules.ts`，双方 picks 就齐后结算）：一致 → streak+1、生成默契卡入墙；不一致 → streak 清零但 `best_streak` 保留。纯函数 + vitest。
- **激励**：默契达成也给少量道具奖励（如香皂×1），与任务经济合流；连胜数展示在卡片角标。
- 服饰素材就绪前该卡先灰置（「即将开放」），衣柜期完成后点亮——所以归入衣柜期交付。

### 测试

- server：`photoWallService.test.ts`（成员校验、36 张上限与淘汰、手动上传校验、自动卡写入与冷却）、`outfitMatchRules.test.ts`（结算、连胜、单方未选不结算）。
- miniapp：`photoWallModel.test.ts` + 面板渲染测试、默契卡渲染测试。

---

## 三、衣柜系统（第三步做，含默契换装）

### 定位

给小多利装扮。**服饰素材按用户提供的参考图切件**：参考图是一排 8 套已穿在小多利身上的服饰立绘（围巾/连帽衫/背带裤/小裙子/雨衣/睡衣/小包/帽子，手绘柴犬风格，衣服与身体自然融合）。

### 素材方案：参考图切件 + 覆盖层

参考图位于 `design-assets/nest/`（source-only，8 只小狗各穿一套，已标注服饰名）。出件流程：

1. **整身穿戴件直出**：参考图中每只小狗的服饰是「穿在身上的完整效果」，最忠实的做法不是把衣服抠下来再叠回默认立绘（手绘衣服贴身轮廓、反抠必留补痕，违反素材规则），而是**每套服饰出一张「小多利+该服饰」完整立绘 PNG**——从参考图按小狗轮廓确定性裁切（8 只小狗间距均匀、背景纯净，可脚本化切分），单张透明底 PNG ≈ 436×700 同比例。
2. **换装 = 换立绘**：`equipped` 保存套装 key，场景渲染时直接用对应立绘图替换 `xiaoduoli.png`（`aspectFit` 固定容器，无叠加对位问题）。混合佩戴（帽子+围巾不同套）v1 不做——参考图本身是整套设计，拆件叠加反而失真；后续若要混搭再走「头部件/身体件分层源」重制。
3. 脚本 `miniapp/tools/make-wardrobe-suits.mjs`：参考图 → 8 张套装立绘 + `wardrobe-parts.report.json`（切分坐标与素材登记）；过 `optimize-miniapp-assets.mjs`（256 全色板），单张 ≤ 60KB（8 张共 ~480KB，包内预算见下）。
4. **换图必须升文件名版本号**（开发者工具缓存旧图的既有教训）。

> 包体预算：主包当前约 1.9MB（2MB 上限），8 张套装 ~480KB 会超。方案：**默认 2 套（原装 + 围巾）打包随包**，其余 6 套首开衣柜时按需从 COS 下载并落本地缓存（复用塔罗 `launchAssetLoader` 的下载+缓存模式，COS 域名已具备）；或衣柜面板走分包。实施时以包体实测为准，优先按需下载方案。

### 服饰目录与解锁

`server/src/domain/wardrobeCatalog.ts` 静态常量（8 件，与参考图一一对应）：

| key | 名称 | 解锁条件 | 条件文案 |
| --- | --- | --- | --- |
| `default` | 原装小多利 | 默认 | — |
| `scarf` | 围巾 | 默认 | 初始赠送 |
| `hoodie` | 连帽衫 | 小多利 Lv.3 | 「小多利 3 级解锁」 |
| `overalls` | 背带裤 | 完成 5 次任务 | 「一起完成 5 次任务解锁」 |
| `dress` | 小裙子 | 暗号连胜 ×3 | 「暗号连胜 3 天解锁」 |
| `raincoat` | 雨衣 | 小多利 Lv.5 | 「小多利 5 级解锁」 |
| `pajamas` | 睡衣 | 累计睡觉动作 ×20 | 「陪小多利睡 20 次解锁」 |
| `bag` | 小包 | 默契连胜 ×3 | 「默契换装连胜 3 天解锁」 |
| `hat` | 帽子 | 完成 15 次任务 | 「一起完成 15 次任务解锁」 |

- **默认给 3 套**：原装 + 围巾 + 连帽衫（让首日换装就有得选，默契换装第一天就能玩）；其余 6 件按上表解锁。
- 解锁条件全部**派生计算**（等级、`pet_events.statsByRoom` 动作统计、任务完成计数、暗号/默契连胜），不建解锁流水表；服务端 GET 时计算 `unlocked` 返回，客户端不重复判定。
- `pet_wardrobe` 表（v1 设计保留）：`room_id PK + equipped jsonb`，保存当前套装 key；PUT 时校验已解锁否则 409。

### API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/wardrobe` | `{equipped, unlocked, catalog, matchToday: {myPick, partnerPicked, streak}}` |
| PUT | `/wardrobe` | 保存 equipped（含当日默契 pick，见下） |
| POST | `/wardrobe/match` | 提交当日默契选择（即当日「换装」动作） |

默契提交：双方各自 PUT 自己今天的 pick（`outfit_match_daily` 落一行）；任一方 GET 时若双方已齐且当日未结算则触发结算（幂等，先到先结算）。

### 小程序交互

- 衣柜面板：上半小多利实时预览（当前套装立绘，切换目录即时换图）；下半 3 列目录网格——已解锁高亮点选（选中深描边），未解锁灰置+小锁印+条件文案；底部「保存」暖色渐变胶囊。
- 每件服饰卡角标显示获得途径徽章（任务🎯/等级⭐/默契👕）；今日已参与默契换装时网格顶部提示条「今天的默契装扮已锁定，明天再来~」（当日 pick 后不可改，保证双方博弈公平）。
- 保存后小窝场景立绘同步更新。

### 测试

- server：`wardrobeService.test.ts`（默认 3 套、未解锁拒绝、双方可改、幂等结算）、`wardrobeCatalog.test.ts`（id 唯一、条件可计算）、`outfitMatchService.test.ts`。
- miniapp：`wardrobeModel.test.ts`（目录过滤、徽章、锁印态）+ 面板与场景立绘替换渲染测试。

---

## 分期与验收

| 期 | 内容 | 关键交付 |
| --- | --- | --- |
| 1 | 任务+道具 | 两张迁移 + service/routes + `pet-actions` 扣道具改造 + 新手礼包 + 全屏面板壳层 + 照顾面板库存角标 + 测试 |
| 2 | 照片墙 | 迁移 + service/routes + 手动上传 + 升级/连胜自动卡 + 拍立得墙面板 + 测试（纪念日引导卡可顺延） |
| 3 | 衣柜+默契换装 | 参考图切件脚本 + 8 套素材 + 目录/解锁 + 衣柜面板 + 小窝底部默契卡 + 结算与拍照入墙 + 测试 |

每期：`npm test --prefix miniapp` + `npm run server:test` 通过 → 清缓存重编译 → 开发者工具预览 → 汇报 → 用户视觉验收 → 提交。

## 架构边界核对

- 面板组件只做渲染与交互；周期/解锁/道具映射/默契结算在 `domain/`；网络在 `services/`；
- 服务端 routes 只做校验转发，道具扣减与入墙写在 service，持久化在 repository；
- `pet-actions` 扣道具是对现有接口的**行为变化**（免费→门票），实施前会单独说明并更新 `docs/features/miniapp.md`；
- 迁移幂等、外键级联；不跨层 import；除明确列出的服务端改动外全在小程序。
