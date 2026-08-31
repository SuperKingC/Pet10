# 小多利 AI 能力升级计划

## 基线
- 分支 main @ cc7a5fa；工作树有 friendship 相关未提交改动（7 文件）——本次不动、不混入提交。
- 现有能力盘点：接话/插话/每日问候已有（petBrain，内存定时器）；定时提醒全链路已有（reminderService + reminderRules 正则 + pet_tasks 表 60s 调度）；宠物发帖链路已有（posts.createAsPet + 小多利圈页）；Tavily 搜索已有（单查询 basic）；persona.ts 是语气唯一入口。
- 你已确认：不接微信订阅消息（消息打开小程序可见）；朋友圈帖子纯文字；心情在小窝状态卡展示。

## 目标
1. 长时间没被理会时主动发消息找人说话（带心情腔调）。
2. 沉默太久或从聊天关键点自动发朋友圈（纯文字）。
3. 定时任务增强：聊天内取消提醒、更自由的说法（AI 兜底解析）、可爱的到期播报。
4. 说话风格升级：调皮天真、被冷落时带点坏坏的阴阳怪气。
5. 心情引擎：由小窝动作、聊天关键词、被冷落时长驱动，影响腔调与主动频率，并在状态卡展示。
6. 搜索类问题回答更详细：多查询并行检索 + 结构化详答。

## 非目标
不接订阅消息推送；不做流式回复；不接 WebSocket；不引入 node-cron/redis 队列（沿用 setInterval，冷却由 DB 时间戳派生，进程重启不失忆）；朋友圈不配图；不做提醒管理 UI；不改 petRules 数值经济；不动未提交的 friendship 改动。

## 实施步骤（每步先写测试、独立提交）

### 1. 心情引擎
- 新 `server/src/domain/petMoodRules.ts`（纯函数）：5 档心情标签（happy/content/bored/sulky/angry）→ 各配 {状态卡文案, 人设腔调提示}；`computeMoodState({mood, idleHours})`（闲置≥24h 至少 bored、≥48h 至少 sulky）；`decayMood`（闲置>12h 起每 12h -5，下限 10）；`adjustMoodForChat`（夸奖/亲昵词 +2、嫌弃/凶词 -3，clamp 0-100）。
- 仓储扩展 contracts + memory/postgres 双实现：`RoomRepository.listAll()`、`PetEventRepository.lastAt(petId)`。
- 新 `server/src/services/petMoodSweepService.ts`：每小时衰减落库，以 pet.updatedAt 作天然检查点（写后 12h 内不再衰减）。
- petBrain：onUserMessage 挂聊天情绪调整（1h 内存冷却防刷）；speak() 把心情标签+腔调传给 persona。

### 2. 人设重写（persona.ts）
- PersonaContext 增心情文本；重写人设：调皮天真小孩 + 被冷落/被戳痛处时坏坏的阴阳怪气（无恶意、一句就哄好），保留 7 条硬性规则与搜索详答规则。

### 3. 搜索增强
- `aiRouting.buildQueries` 改为每类生成 2 条差异化查询（纯函数）。
- `searchService` 由「queries 拼成一条」改为并行多个 Tavily 请求，按 URL 去重合并、部分失败容错。
- `aiService` 搜索分支 system 改为结构化详答：先一句话结论 → 分点关键数据/时间/条件 → 可执行建议 → 一句小多利腔收尾，明确允许长回答。
- config：SEARCH_MAX_RESULTS 默认 6→8、SEARCH_MAX_SNIPPET_LENGTH 500→700，同步 .env.example / .env.production.example。

### 4. 主动找人说话 + 自动朋友圈
- 新 `server/src/services/proactiveSweepService.ts`：每 10 分钟遍历 proactiveEnabled 房间，冷却全部由 DB 时间戳派生：
  - 沉默 > 阈值（基础 24h；委屈/生气时 12h）且最近一条宠物消息 > 12h → ai.composeProactiveMessage（新方法，失败回退模板池）→ 落库 + emit。
  - 沉默 > 48h 且最近一条宠物帖 > 24h → ai.composeMomentPost（新方法，失败跳过）→ posts.createAsPet + emit('post.new')。
- petBrain.maybeExtractMemory：新记忆创建后 20% 概率、每房每日上限 1 条，以该记忆为素材发圈。
- app.ts 装配；config 增 PROACTIVE_SWEEP_INTERVAL_MS（默认 600000，0=禁用）。

### 5. 定时任务增强
- reminderRules 增 `parseReminderCancel`（含「提醒」+ 取消/撤掉/不要了 等，确定性规则）。
- reminderService：取消分支（pet_tasks.status 是自由 text 列，置 'cancelled' 即可，无迁移）；正则失败 → ai.parseReminderFallback（严格 JSON，service 校验后才采用）；到期播报改 ai.composeReminderAnnouncement 生成，失败回退现有模板。
- TaskRepository 增 listByRoom（pending）/ cancelById（contracts + 双实现）。

### 6. 小程序心情展示（需你 DevTools 验收）
- 服务端宠物状态载荷（getRoom bootstrap / applyAction 返回）统一附 `moodLabel`/`moodCaption`（服务端计算，客户端不知道闲置时长）；petMapper 优先用服务端字段，保留本地推导兜底。
- PetStatusCard 状态卡文案行改动态心情（保留精力低时「困困的想休息」优先级）；复用现有样式，无新增资源，包体零压力；按 miniapp-change 清 dist 重编译。

### 7. 文档同步
- docs/features/miniapp.md 补心情机制、主动行为节奏、朋友圈自动帖规则、提醒取消说法；跑 documentation-sync。

## 验证与提交
- 每步 vitest 快速验证；每步一个中文 commit（只 stage 本任务文件）。
- 最终 `npm run verify:full`（已知既有失败：CLI 路径测试×2、miniapp 裸 tsc；门禁为三端 vitest + server 构建 + check:docs + check:assets）。
- 预览：`npm run build:weapp --prefix miniapp` → 微信开发者工具（复用已有窗口）编译 miniapp/dist；验收路径：小窝状态卡心情文案、聊天语气、聊天内「取消提醒」「30分钟后提醒我…」、小多利圈自动帖。
- 需你验收的主观点：调皮/阴阳怪气语气尺度、心情标签文案、搜索回答详略。
- 回滚：各 commit 独立 revert；两个 sweep 服务有 env 开关可关闭。

## 风险
- AI 调用量：sweep 仅对沉默房间触发且有派生冷却，个人项目量级可控；AI 故障时模板池兜底，不阻塞主流程。
- 语气是主观项：persona.ts 单点可快速调整，以 DevTools/真机聊天验收为准。