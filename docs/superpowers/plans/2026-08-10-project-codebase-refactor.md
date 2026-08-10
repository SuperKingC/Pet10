# Pet10 全项目代码整理与塔罗动画重构实施计划

## 目标与原则

本计划针对当前项目“功能可运行，但代码边界持续被迭代打散”的问题，重点解决塔罗占卜流程和全局样式的可维护性、动画可预测性以及测试可信度。

本次不采用一次性重写，而采用“先建立边界，再迁移行为，最后删除旧实现”的渐进式路线：

- 不改变现有产品功能、牌库内容、牌阵数量、抽牌随机规则和分享能力。
- 不在原有大组件中继续追加条件分支或 CSS 覆盖。
- 每个阶段都保持可运行、可测试、可回滚。
- 动画完成必须由明确的阶段状态和完成事件确认，不能依赖“点击后猜测已经结束”。
- 视觉效果由结构化的动效契约驱动，而不是通过测试匹配 CSS 文本来间接约束。
- 先聚焦塔罗和直接相关基础设施，不顺手重构无关业务。

## 当前问题结论

### 塔罗模块

- `src/games/tarot/TarotGame.tsx` 同时承担页面编排、阶段状态机、洗牌计时器、切牌动画回调、抽牌动画回调、翻牌流程、阅读生成、历史记录和分享状态。
- 当前阶段通过多个独立 `useState` 组合表达：`stage`、`cutting`、`cutCount`、`flyingCard`、`picked`、`flipped`、`revealReady` 等存在隐式组合约束，非法状态可以被构造。
- 洗牌使用 `requestAnimationFrame`，切牌和抽牌依赖 CSS `animationend`；三套完成机制没有统一的生命周期、取消和 reduced-motion 处理方式。
- `skipRitual`、`restart`、组件卸载、指针取消与动画完成之间缺少统一清理入口，后续加入新阶段容易产生残留状态。
- `TarotCard.tsx`、`TarotSpreadPicker.tsx` 已经拆出，但仍依赖全局 `src/styles.css` 中的塔罗规则，组件边界和视觉边界不一致。

### 样式与动效

- `src/styles.css` 已达到约 900 行，塔罗选择器存在多轮重复定义：同名选择器最多重复 6 次，塔罗关键区域有 53 个重复选择器。
- 洗牌、切牌、扇形选牌、翻牌的最终行为由文件后段覆盖前段规则，单看任意一段很难判断实际生效样式。
- 历次设计文档逐步叠加了“仪式重设计”“动效重设计”“洗牌魔法增强”“切牌深度”等目标，但没有在实现后合并成单一的最终动效模型。
- `tarotRitualStyles.test.ts` 主要读取 CSS/TSX 文本并匹配字符串。这可以防止某些回归，但无法验证实际阶段迁移、重复点击、动画取消、窄屏布局和 reduced-motion 行为。

### 全项目

- `src/components/AppShell.tsx` 约 500 行，同时承担应用壳层、会话恢复、实时运行时、业务事件、覆盖层路由和塔罗资源预加载。
- `src/styles.css` 是全局样式单体，组件样式、游戏样式、响应式覆盖和后续修复混在同一文件。
- `src/games/tarot/tarotDeck.ts` 约 300 行，同时包含牌库、牌阵定义、抽牌、解读文本、专业阅读、分享文本和 localStorage 历史记录。
- 前端现有测试与构建均通过，但构建产物提示主 JS chunk 超过 500 kB；这不是本次第一优先级，但应在模块边界稳定后处理。

## 目标架构

### 塔罗模块目录

最终将塔罗模块收敛为以下职责边界：

```text
src/games/tarot/
  TarotGame.tsx                 # 页面编排，只连接阶段状态、子视图和业务动作
  tarotFlow.ts                  # 阶段状态模型、事件、合法迁移和初始状态
  useTarotFlow.ts               # React hook，处理迁移、重置和流程副作用
  tarotAnimation.ts             # 动画名称、持续时间、完成事件和 reduced-motion 契约
  usePressProgress.ts           # 按住推进的通用进度控制器
  TarotQuestionStage.tsx        # 提问阶段
  TarotSpreadStage.tsx          # 牌阵选择阶段
  TarotShuffleStage.tsx         # 洗牌阶段
  TarotCutStage.tsx             # 切牌阶段
  TarotFanStage.tsx             # 扇形选牌阶段
  TarotRevealStage.tsx          # 翻牌阶段
  TarotReadingStage.tsx         # 解读、分享和重启阶段
  TarotCard.tsx                 # 单张牌渲染
  TarotSpreadPicker.tsx         # 牌阵选择控件
  tarotDeck.ts                  # 牌库和纯数据/纯函数
  tarotReading.ts               # 阅读构建与分享文案
  tarotHistory.ts               # 历史记录存储适配
  tarotAssets.ts                # 资源清单和预加载
  tarotRitual.css               # 塔罗专属样式，最终从全局 CSS 移出
```

不要求第一阶段一次创建全部文件。迁移顺序以依赖倒置为准：先抽纯模型和动画契约，再拆视图，最后移动样式。

### 状态模型

使用一个显式的联合状态表达整个流程，替代多个相互耦合的布尔值：

```ts
type TarotFlowState =
  | { stage: 'question'; question: string; promptOffset: number }
  | { stage: 'spread'; question: string; spread: TarotSpreadKey }
  | { stage: 'shuffle'; question: string; spread: TarotSpreadKey; progress: number; pressed: boolean }
  | { stage: 'cut'; question: string; spread: TarotSpreadKey; cutCount: number; activeAnimation?: TarotAnimationRun }
  | { stage: 'fan'; question: string; spread: TarotSpreadKey; drawn: DrawnCard[]; picked: number[]; flyingCard?: number }
  | { stage: 'reveal'; question: string; spread: TarotSpreadKey; drawn: DrawnCard[]; flipped: boolean[] }
  | { stage: 'reading'; question: string; spread: TarotSpreadKey; drawn: DrawnCard[]; reading: TarotReading; shared: boolean }
```

所有阶段迁移通过事件函数完成，例如 `submitQuestion`、`selectSpread`、`shuffleProgressed`、`finishCut`、`pickCard`、`finishPick`、`flipCard`、`finishReading`。事件函数负责校验当前阶段，组件不直接调用多个 `setState` 拼装状态。

### 动画模型

统一定义：

```ts
type TarotAnimationName = 'shuffle-loop' | 'cut-upper' | 'cut-upper-reverse' | 'cut-lower' | 'pick-card' | 'reveal-card'

interface TarotAnimationRun {
  name: TarotAnimationName
  token: number
  startedAt: number
}
```

动画组件只关心三个动作：

1. `startAnimation(name)`：生成唯一 token 并锁定当前阶段。
2. `handleAnimationEnd(name, token)`：只接受当前 token 对应的完成事件。
3. `cancelAnimation()`：在跳过、卸载、重启、指针取消时统一清理。

`prefers-reduced-motion` 不再由各个事件处理函数分别判断，而由动画契约层提供即时完成策略；逻辑结果保持相同，只缩短视觉时序。

### CSS 组织

先将塔罗 CSS 原样迁移到 `src/games/tarot/tarotRitual.css`，再按阶段整理为：

```text
tokens
shell
question
spread
shuffle
cut
fan
reveal
reading
responsive
reduced-motion
```

每个选择器只保留一个最终定义，每个关键帧只保留一个来源。所有阶段专属的 CSS 变量集中在 `.tarot-game` 或对应阶段根节点上，避免在文件末尾用更高优先级覆盖旧变量。

## 分阶段实施

### 阶段 0：建立安全基线

**目的：** 在重构前固定当前行为和验证入口。

**文件：**

- `package.json`
- `src/games/tarot/*.test.ts`
- 新增 `src/games/tarot/tarotFlow.test.ts`
- 新增 `src/games/tarot/tarotAnimation.test.ts`

**任务：**

1. 固定当前验证命令：`npm test -- --run`、`npm run build`、`npm run server:test`。
2. 新增流程测试，覆盖当前业务必须保持的阶段顺序：
   `question -> spread -> shuffle -> cut -> fan -> reveal -> reading`。
3. 覆盖三牌阵需要 3 张牌、重复选择被拒绝、未完成洗牌不能进入切牌、未完成切牌不能进入扇形选牌。
4. 覆盖 `skipRitual`、重启和卸载清理的预期行为。
5. 把动画名称、阶段名称和持续时间抽成可测试的契约，不再在样式文本中复制这些字符串。

**验收：**

- 新测试在未迁移实现前能够描述当前应该保留的行为。
- 所有原测试、前端构建和服务端测试保持通过。

### 阶段 1：抽离塔罗纯领域模型

**目的：** 先把牌库、阅读构建和历史存储从 UI 中分离，降低 `tarotDeck.ts` 和 `TarotGame.tsx` 的耦合。

**文件：**

- `src/games/tarot/tarotDeck.ts`
- 新增 `src/games/tarot/tarotReading.ts`
- 新增 `src/games/tarot/tarotHistory.ts`
- `src/games/tarot/tarotDeck.test.ts`
- 新增 `src/games/tarot/tarotReading.test.ts`
- 新增 `src/games/tarot/tarotHistory.test.ts`

**任务：**

1. 保留 `MAJOR_ARCANA`、`SPREADS`、`drawCards` 等纯数据/纯随机函数在 `tarotDeck.ts`。
2. 将 `buildProfessionalReading`、`buildSynthesis`、`buildShareText` 和阅读相关类型迁移到 `tarotReading.ts`。
3. 将 `localStorage` 访问、解析失败降级和保存逻辑迁移到 `tarotHistory.ts`，对外只暴露 `listReadingHistory`、`saveReading`。
4. 去掉 `tarotDeck.ts` 对 `window`、localStorage 或 UI 文案流程的隐式依赖。
5. 保持旧导出短期兼容，迁移调用点后再删除兼容导出。

**验收：**

- 牌库和阅读构建可以在无 DOM 环境下独立测试。
- 历史记录解析异常不会影响牌库和阅读生成。

### 阶段 2：建立显式流程状态机

**目的：** 消除多个 `useState` 的隐式组合约束。

**文件：**

- 新增 `src/games/tarot/tarotFlow.ts`
- 新增 `src/games/tarot/useTarotFlow.ts`
- `src/games/tarot/TarotGame.tsx`
- 新增/更新 `src/games/tarot/tarotFlow.test.ts`

**任务：**

1. 定义 `TarotFlowState`、`TarotFlowEvent` 和 `tarotFlowReducer`。
2. 为每个事件定义合法前置阶段；非法事件返回原状态，不产生部分更新。
3. 将 `question`、`spread`、`drawn`、`picked`、`flipped`、`reading` 等业务状态纳入统一 reducer。
4. 将 `sharing`、`historyOpen` 等纯 UI 状态保留在页面或单独 hook，不混进流程状态机。
5. 将 `restart`、`skipRitual`、`close` 的清理行为集中处理。
6. 让 `TarotGame.tsx` 只负责将状态映射到阶段组件。

**验收：**

- `TarotGame.tsx` 不再直接维护 10 个以上塔罗业务状态。
- 每次阶段迁移是单一事件，不能通过多个 setter 拼接出中间非法状态。
- reducer 测试覆盖正常、重复、越级和取消路径。

### 阶段 3：统一动画生命周期与按住进度

**目的：** 解决洗牌 RAF、CSS animation 和指针事件各自管理的问题。

**文件：**

- 新增 `src/games/tarot/tarotAnimation.ts`
- 新增 `src/games/tarot/usePressProgress.ts`
- 新增 `src/games/tarot/tarotAnimation.test.ts`
- `src/games/tarot/TarotShuffleStage.tsx`
- `src/games/tarot/TarotCutStage.tsx`
- `src/games/tarot/TarotFanStage.tsx`

**任务：**

1. 将 `requestAnimationFrame` 进度推进封装为 `usePressProgress`，统一处理开始、暂停、完成、取消、卸载。
2. 使用 `pointerdown`、`pointerup`、`pointerleave`、`pointercancel` 的同一清理函数。
3. 将切牌、抽牌、翻牌的 animation name、持续时间、完成 token 放入 `tarotAnimation.ts`。
4. 所有 `animationend` 回调先校验 `event.animationName`，再校验当前动画 token，最后派发流程事件。
5. reduced-motion 下直接派发“动画完成”事件，不能留下 `cutting` 或 `flyingCard` 锁。
6. 阶段组件卸载时取消活动动画，确保快速关闭/重启不触发旧回调。

**验收：**

- 快速重复点击、拖出按钮、系统取消指针、关闭后重新打开不会卡在锁定状态。
- 洗牌进度和 CSS 视觉状态来源统一，避免 ref、state 和 DOM style 三套值不一致。

### 阶段 4：拆分塔罗阶段组件

**目的：** 将页面编排和阶段视觉实现分开，方便单独调试动画。

**文件：**

- `src/games/tarot/TarotGame.tsx`
- 新增 `src/games/tarot/TarotQuestionStage.tsx`
- 新增 `src/games/tarot/TarotSpreadStage.tsx`
- 新增 `src/games/tarot/TarotShuffleStage.tsx`
- 新增 `src/games/tarot/TarotCutStage.tsx`
- 新增 `src/games/tarot/TarotFanStage.tsx`
- 新增 `src/games/tarot/TarotRevealStage.tsx`
- 新增 `src/games/tarot/TarotReadingStage.tsx`

**任务：**

1. 每个阶段组件只接收阶段所需的数据和事件回调，不读取整个流程对象。
2. 将历史记录弹层、分享按钮、重新占卜操作从主流程渲染中分离。
3. 为洗牌、切牌、抽牌阶段增加行为测试：按钮禁用、完成后进入下一阶段、动画期间锁定。
4. 使用语义化 `aria-live` 或状态文本反馈当前阶段和完成状态。
5. 保留当前牌阵和阅读输出，不在本阶段修改文案和业务规则。

**验收：**

- `TarotGame.tsx` 只保留外壳、流程 hook、阶段选择和通用关闭行为。
- 每个动效阶段可以单独渲染和测试。

### 阶段 5：清理并重建塔罗样式

**目的：** 根除后置 CSS 覆盖和“改了很多次仍不可预测”的核心原因。

**文件：**

- `src/styles.css`
- 新增 `src/games/tarot/tarotRitual.css`
- `src/main.tsx` 或当前全局样式入口
- `src/games/tarot/tarotRitualStyles.test.ts`

**任务：**

1. 将塔罗样式从 `src/styles.css` 整体迁移到 `tarotRitual.css`，先保证视觉不变。
2. 按阶段重排 CSS，并删除所有旧重复选择器、旧关键帧和无引用的过渡规则。
3. 每个阶段只保留一套最终关键帧：
   `tarot-shuffle-loop`、`tarot-cut-upper`、`tarot-cut-upper-reverse`、`tarot-cut-lower`、`tarot-pick-smooth`、`tarot-reveal`。
4. 使用阶段根节点和 CSS 变量表达牌堆位置、扇形半径、动画时长和窄屏缩放。
5. 保留 320px/360px 窄屏约束和 reduced-motion 规则，但改为集中式媒体查询。
6. 为每个关键帧写“运动意图”测试，而不是测试整段 CSS 的具体压缩文本。
7. 确认全局样式中不再存在塔罗选择器；如果暂时无法完全移出，至少保证只有一个定义来源。

**验收：**

- 塔罗选择器没有重复定义。
- 牌堆动画不依赖同名后置覆盖。
- 洗牌运动范围、切牌深度、扇形抽牌路径和翻牌逻辑可单独调节。

### 阶段 6：补充真实交互和视觉验证

**目的：** 让测试覆盖真实用户路径，而不是只证明字符串存在。

**文件：**

- `src/games/tarot/TarotGame.test.tsx`
- `src/games/tarot/TarotShuffleStage.test.tsx`
- `src/games/tarot/TarotCutStage.test.tsx`
- `src/games/tarot/TarotFanStage.test.tsx`
- `src/games/tarot/tarotRitualStyles.test.ts`

**任务：**

1. 使用 React 测试渲染完整流程，模拟提问、选牌阵、完成洗牌、切牌、抽牌、翻牌。
2. 验证三牌阵只能选择 3 张，重复点击和动画期间点击不会增加数量。
3. 验证动画结束事件只处理目标动画，其他 animation name 不改变流程。
4. 验证 `prefers-reduced-motion` 下流程仍能完整结束。
5. 用浏览器在至少 320px、360px、390px 宽度检查横向溢出、按钮可点击区域和阅读页滚动。
6. 检查真实截图/录屏中的四个关键质量指标：
   - 牌的来源和去向清楚；
   - 运动连续，没有跳帧或突然回弹；
   - 动画中用户知道是否完成；
   - 牌面、标签和阅读内容在窄屏不互相遮挡。

**验收：**

- 关键流程有行为级测试。
- 样式文本测试只负责稳定的结构约束，不再承担主要行为验证。

### 阶段 7：按同一原则治理全项目

**目的：** 在塔罗边界稳定后，整理其他明显的大文件，不把塔罗重构变成全项目大爆炸。

**第一批文件：**

- `src/components/AppShell.tsx`
- `src/styles.css`
- `src/domain/types.ts`
- `src/services/socialApi.ts`
- `server/src/services/petBrain.ts`
- `server/src/repositories/memoryRepositories.ts`
- `server/src/repositories/postgresRepositories.ts`

**任务：**

1. 从 `AppShell.tsx` 抽出 `useAppNavigation`、`useTarotLauncher` 和覆盖层渲染映射。
2. 将塔罗资源预加载从应用壳层抽到 `src/games/tarot/useTarotAssets.ts` 或资源服务。
3. 将全局 CSS 按领域拆分为 `src/styles/base.css`、`layout.css`、`components.css`、`games.css`、`features/*.css`，保留单一入口文件。
4. 对 `domain/types.ts` 按领域拆分，先只迁移引用密集度低的类型，避免大范围循环依赖。
5. 对服务端 repository 先拆读写职责和内存/Postgres 实现，再考虑接口收敛。
6. 只有在导入关系稳定后再做 Vite 分包，避免通过动态 import 掩盖架构耦合。

**验收：**

- 单个文件职责清晰，新增功能不需要修改无关的大组件。
- 全局样式入口仍可追踪，领域样式不再互相覆盖。
- 服务端测试和前端测试均保持通过。

## 暂不处理的内容

- 不重写塔罗文案、牌义和牌库数据。
- 不替换现有塔罗图片资源。
- 不引入 GSAP、Framer Motion 或其他动画库；当前问题主要是状态和 CSS 组织问题，不是缺少动画库。
- 不在本轮重做整个 App Shell 的视觉设计。
- 不为了“看起来更干净”改动无关页面的业务逻辑。
- 不在没有真实性能数据前强行拆分所有代码块。

## 验证命令

每个阶段至少运行：

```powershell
npm test -- --run
npm run build
```

服务端接口或共享类型受到影响时追加：

```powershell
npm run server:test
npm run build:all
```

最终验收追加：

```powershell
docker compose config
```

并通过浏览器检查塔罗完整流程、窄屏布局和 reduced-motion。

## 完成标准

- 塔罗流程由显式状态机驱动，阶段迁移可单独测试。
- `TarotGame.tsx` 不再承载所有阶段和动画细节。
- 洗牌、切牌、抽牌和翻牌各自只有一套可追踪的动效定义。
- `src/styles.css` 不再包含塔罗重复覆盖层。
- 动画取消、重复点击、快速重启和 reduced-motion 都不会产生卡死或错误抽牌。
- 牌库/阅读/历史记录可以分别测试。
- 全项目主要大文件的职责边界得到改善，但不以一次性重写为代价。
- 前端、服务端测试和构建均通过，且最终方案可通过浏览器实际验证。
