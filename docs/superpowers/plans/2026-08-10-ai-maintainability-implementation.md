# Pet10 AI 可维护性与安全发布实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一套适合非技术维护者和 AI 协作的项目规则、功能文档、本地验收、塔罗动画基线、架构检查和腾讯云 Lighthouse 手动批准部署流程。

**Architecture:** 先增加不改变业务行为的仓库护栏和文档，再增加本地 review/快速验证工具和塔罗开发入口，最后接入 GitHub CI、服务器固定部署脚本和手动批准发布。所有部署仍基于现有 Docker Compose，不引入新前端框架、Kubernetes 或数据库迁移自动化。

**Tech Stack:** Markdown、Node.js ESM scripts、TypeScript、Vitest、React/Vite、GitHub Actions、Bash、Docker Compose、SSH。

## Global Constraints

- `main` 是唯一稳定基线；每个任务基于最新 `main` 创建独立分支/worktree。
- 不改变现有产品功能、牌库内容、牌阵数量、抽牌随机规则和分享能力。
- 不引入 GSAP、Framer Motion、Kubernetes 或重量级 lint/架构框架。
- UI、动画和交互修改必须提供本地验收链接；用户确认前不得合并或部署生产。
- 服务器只部署 `main` 的已提交版本；生产 `.env.production` 只保留在服务器。
- 默认使用最小服务更新：前端只更新 `web`，后端只更新 `api`，数据库迁移必须单独确认。
- 每个任务都必须包含专项测试或静态验证，并同步受影响文档。
- 不在代码中写入生产密钥、SSH 私钥、固定真实服务器地址或用户数据。
- 部署脚本必须支持显式提交、健康检查和可操作回滚。

---

## 文件与职责地图

### 仓库规则与 AI Skills

- Create: `AGENTS.md` — AI 自动读取的仓库级强制规则，保持短小并链接专项规则。
- Create: `AI_RULES.md` — 面向中文维护者和通用 AI 的操作说明。
- Create: `.agents/rules/architecture.md` — 前后端目录边界与禁止依赖。
- Create: `.agents/rules/change-protocol.md` — 修改前、修改中、修改后的固定流程。
- Create: `.agents/rules/testing-and-review.md` — 快速验证、交付验收、合并发布三级验证。
- Create: `.agents/rules/documentation.md` — 代码与功能文档同步要求。
- Create: `.agents/rules/deployment.md` — 服务器、密钥、版本、最小更新和回滚规则。
- Create: `.agents/rules/tarot-animation.md` — 塔罗阶段、动画 token、CSS 和视觉基线规则。
- Create: `.agents/skills/feature-development/SKILL.md` — 新功能开发流程。
- Create: `.agents/skills/visual-animation-change/SKILL.md` — 动画修改流程。
- Create: `.agents/skills/react-refactor/SKILL.md` — React 重构流程。
- Create: `.agents/skills/domain-rule-change/SKILL.md` — 领域规则修改流程。
- Create: `.agents/skills/documentation-sync/SKILL.md` — 文档同步流程。
- Create: `.agents/skills/release-verification/SKILL.md` — 发布前验证流程。

### 功能文档与视觉基线

- Create: `docs/features/README.md` — 功能目录和非技术维护入口。
- Create: `docs/features/app-navigation.md` — 页面导航和入口。
- Create: `docs/features/chat.md` — 聊天、消息和实时更新。
- Create: `docs/features/pet-system.md` — 宠物状态、动作和成长。
- Create: `docs/features/social-and-session.md` — 登录、会话、好友和房间。
- Create: `docs/features/daily-fortune.md` — 每日运势。
- Create: `docs/features/tarot.md` — 塔罗完整用户流程。
- Create: `docs/features/image-generation.md` — 图片生成和参考图。
- Create: `docs/features/gobang.md` — 五子棋。
- Create: `docs/features/deployment.md` — 本地、测试和线上更新方式。
- Create: `docs/features/assets-and-performance.md` — 图片分类、质量预算和加载策略。
- Create: `docs/visual-baselines/tarot/README.md` — 塔罗基线使用方法。
- Create: `docs/visual-baselines/tarot/timeline.md` — 每个阶段的时间线。
- Create: `docs/visual-baselines/tarot/checkpoints.md` — 固定截图检查点。
- Create: `docs/visual-baselines/tarot/acceptance-criteria.md` — 人工验收标准。
- Create: `docs/assets/asset-manifest.md` — 运行时图片清单、用途、预算和例外。
- Modify: `README.md` — 修复乱码、补充入口命令和文档索引。

### 本地验证与开发入口

- Modify: `package.json` — 增加 `review`、`review:stop`、`verify:quick`、`verify:full`、`check:architecture`、`check:docs`。
- Create: `scripts/review.mjs` — 启动本地验收前端并输出 URL。
- Create: `scripts/review-stop.mjs` — 根据进程记录停止验收服务。
- Create: `scripts/verify-quick.mjs` — 根据变更范围执行快速验证。
- Create: `scripts/check-architecture.mjs` — 执行低误报架构边界检查。
- Create: `scripts/check-docs.mjs` — 检查文档入口和本地路径。
- Create: `scripts/check-assets.mjs` — 检查图片格式、尺寸、体积预算和运行时引用。
- Create: `scripts/lib/process.mjs` — 进程记录、端口探测和跨平台命令辅助。
- Create or modify: `src/dev/tarot/TarotDevEntry.tsx` — 开发环境塔罗阶段入口。
- Create or modify: `src/dev/tarot/tarotDevEntry.test.tsx` — 阶段参数和生产禁用测试。
- Modify: `src/main.tsx` or current app router entry — 仅开发环境注册 `/dev/tarot`。
- Modify: `src/games/tarot/tarotAssets.ts` — 将全量串行预加载改为关键资源优先、结果牌按需预取和受限并发加载。
- Modify: `src/games/tarot/useTarotLauncher.ts` — 只等待塔罗入口关键资源，不等待所有牌面。
- Modify: `src/games/tarot/tarotAssets.test.ts` — 锁定资源分类、并发限制和按需加载。

### CI/CD 与 Lighthouse

- Create: `.github/workflows/ci.yml` — PR、`main` push、手动运行的自动测试。
- Create: `.github/workflows/deploy-production.yml` — 手动触发、Environment 审批和 SSH 发布。
- Create: `deploy/lib/deploy-common.sh` — 服务器部署公共函数。
- Create: `deploy/update-web.sh` — 只更新 `web`。
- Create: `deploy/update-api.sh` — 只更新 `api`。
- Create: `deploy/update-all.sh` — 完整 Compose 更新。
- Create: `deploy/verify.sh` — 容器和公开健康检查。
- Create: `deploy/rollback.sh` — 回滚到部署前稳定提交。
- Modify: `deploy/README.md` — Lighthouse 初始化、Secrets、部署、回滚和排查。
- Modify: `.gitignore` — 排除部署本地状态文件，不排除脚本和文档。

### 低风险前端能力层示范

- Create: `src/services/asyncResult.ts` — 统一异步结果类型和用户可读错误映射。
- Create: `src/hooks/useAsyncTask.ts` — `idle/loading/success/error` 生命周期 hook。
- Create: `src/services/asyncResult.test.ts` — 结果和错误映射测试。
- Create: `src/hooks/useAsyncTask.test.ts` — hook 生命周期测试。
- Modify: 一个已有低耦合入口，例如 `src/services/memoryService.ts` 或 `src/services/sessionApi.ts` — 采用新能力层，不改外部行为。

### 图片资源治理

- Create: `scripts/image-metadata.mjs` — 读取 PNG/JPEG/WebP/AVIF 元信息，不解码整张图片。
- Create: `scripts/check-assets.test.mjs` — 图片预算、source-only 引用和 manifest 检查。
- Create: `design-assets/.gitkeep` — 原始设计素材的非运行时目录占位。
- Move: `public/tarot/concepts/*` → `design-assets/tarot/concepts/*` only after confirming Git history/large-file strategy with user.
- Create: `public/tarot/cards-webp/` or update `public/tarot/cards/` — 高质量 WebP 展示图；保留 JPEG fallback。
- Modify: `src/games/tarot/TarotCard.tsx` and stage components if needed — 使用 `<picture>` 或集中图片组件输出 WebP/JPEG fallback、尺寸和解码提示。

---

## Phase 1: 建立 AI 规则与协作护栏

### Task 1: 添加仓库总规则

**Files:**
- Create: `AGENTS.md`
- Create: `AI_RULES.md`

**Interfaces:**
- `AGENTS.md` 必须链接 `.agents/rules/*.md` 和 `docs/features/README.md`。
- `AI_RULES.md` 必须包含用户可复制的任务提示模板、验收报告模板和部署请求模板。

- [ ] **Step 1: 编写规则验收清单**

在 `docs/superpowers/specs/2026-08-10-ai-maintainability-design.md` 的成功标准基础上列出可检查条目：基线确认、单目标修改、测试、链接、文档、用户审批、部署安全。

- [ ] **Step 2: 编写 `AGENTS.md`**

只保留强制规则和链接，不复制长篇解释。明确以下禁止事项：不从旧 worktree 继续修改、不在用户验收前合并视觉改动、不直接修改服务器代码、不输出生产密钥。

- [ ] **Step 3: 编写 `AI_RULES.md`**

使用中文说明项目用途、目录地图、AI 标准流程和标准输出。至少包含：

```text
修改前：
- 当前分支和基线：
- 当前未提交改动：
- 目标功能：
- 明确不修改：

修改后：
- 修改文件：
- 行为变化：
- 自动验证：
- 本地验收链接：
- 未验证内容：
- 回滚方式：
```

- [ ] **Step 4: 静态检查规则入口**

运行：

```powershell
Test-Path AGENTS.md
Test-Path AI_RULES.md
rg -n "main|worktree|验收|生产密钥|回滚" AGENTS.md AI_RULES.md
```

Expected: 两个文件存在，包含全部关键规则。

- [ ] **Step 5: Commit**

```powershell
git add AGENTS.md AI_RULES.md
git commit -m "docs: add AI maintenance rules"
```

### Task 2: 添加专项规则与 AI Skills

**Files:**
- Create: `.agents/rules/architecture.md`
- Create: `.agents/rules/change-protocol.md`
- Create: `.agents/rules/testing-and-review.md`
- Create: `.agents/rules/documentation.md`
- Create: `.agents/rules/deployment.md`
- Create: `.agents/rules/tarot-animation.md`
- Create: `.agents/skills/feature-development/SKILL.md`
- Create: `.agents/skills/visual-animation-change/SKILL.md`
- Create: `.agents/skills/react-refactor/SKILL.md`
- Create: `.agents/skills/domain-rule-change/SKILL.md`
- Create: `.agents/skills/documentation-sync/SKILL.md`
- Create: `.agents/skills/release-verification/SKILL.md`

**Interfaces:**
- 每个规则文件定义边界、触发条件、禁止事项和验证出口。
- 每个 Skill 文件包含 `name`、`description`、触发条件、执行步骤、完成报告格式。
- `visual-animation-change` 必须引用 `docs/visual-baselines/tarot/`。
- `release-verification` 必须引用 `npm run verify:full` 和部署脚本。

- [ ] **Step 1: 为每个规则文件写最小可执行结构**

每份规则固定使用：目的、适用范围、必须做、禁止做、验证方式、相关文档。避免写成无法检查的口号。

- [ ] **Step 2: 编写架构规则**

把现有 `src/components`、`src/domain`、`src/services`、`src/state`、`server/src/http`、`server/src/services`、`server/src/repositories` 的职责写成实际路径，不发明当前不存在的层。

- [ ] **Step 3: 编写塔罗动画规则**

固定阶段：

```text
question → spread → shuffle → cut → fan → reveal → reading
```

明确动画 token、交互锁、reduced-motion、CSS 单一归属、固定检查点和“每次只改一个阶段”。

- [ ] **Step 4: 编写 Skills**

每个 Skill 必须给出 AI 可执行步骤，不允许出现“适当处理”“以后补充”“写测试即可”等空泛表述。

- [ ] **Step 5: 运行规则自检**

```powershell
rg -n "TBD|TODO|待定|以后|适当处理" AGENTS.md AI_RULES.md .agents
rg -n "name:|description:|必须|禁止|验证" .agents
```

Expected: 无占位表述，每个 Skill 都有元数据、步骤和验证出口。

- [ ] **Step 6: Commit**

```powershell
git add .agents
git commit -m "docs: define architecture and AI skills"
```

## Phase 2: 中文功能文档与塔罗视觉基线

### Task 3: 修复 README 并建立功能文档入口

**Files:**
- Modify: `README.md`
- Create: `docs/features/README.md`
- Create: `docs/features/app-navigation.md`
- Create: `docs/features/chat.md`
- Create: `docs/features/pet-system.md`
- Create: `docs/features/social-and-session.md`
- Create: `docs/features/daily-fortune.md`
- Create: `docs/features/tarot.md`
- Create: `docs/features/image-generation.md`
- Create: `docs/features/gobang.md`
- Create: `docs/features/deployment.md`

**Interfaces:**
- `docs/features/README.md` 是所有功能文档的入口。
- 每个功能文档必须包含“用途、流程、正常结果、关键入口、数据位置、风险、验收清单”。
- 所有代码链接必须指向仓库内存在的路径。

- [ ] **Step 1: 先为文档入口写路径检查**

创建或扩展 `scripts/check-docs.mjs` 的测试输入，要求文档中引用的 `src/`、`server/src/`、`deploy/` 路径存在。

- [ ] **Step 2: 运行检查确认失败**

运行：

```powershell
node scripts/check-docs.mjs
```

Expected: FAIL，因为脚本和功能文档尚未建立。

- [ ] **Step 3: 重写 README 为 UTF-8 中文入口**

保留现有启动方式、Mock/真实 API、Docker、测试和部署信息，去掉重复细节，增加 `docs/features/README.md` 和 `docs/superpowers/` 索引。

- [ ] **Step 4: 编写功能文档**

先依据真实入口填写，不猜测实现。入口至少检查：

```powershell
rg -n "export|onClick|fetch|Api|Service|Tarot" src/components src/games src/services server/src
```

每份文档用 Mermaid 描述用户操作到结果的流程，并标注失败状态。

- [ ] **Step 5: 运行文档检查**

```powershell
node scripts/check-docs.mjs
```

Expected: PASS，并报告功能文档数量和无效路径数量。

- [ ] **Step 6: Commit**

```powershell
git add README.md docs/features
git commit -m "docs: add Chinese feature documentation"
```

### Task 4: 建立塔罗动画基线文档

**Files:**
- Create: `docs/visual-baselines/tarot/README.md`
- Create: `docs/visual-baselines/tarot/timeline.md`
- Create: `docs/visual-baselines/tarot/checkpoints.md`
- Create: `docs/visual-baselines/tarot/acceptance-criteria.md`
- Modify: `docs/features/tarot.md`

**Interfaces:**
- 基线文档使用当前已合并的塔罗状态机和阶段组件作为唯一实现来源。
- `checkpoints.md` 中的检查点名称必须与开发入口使用的 `stage` 参数一致。

- [ ] **Step 1: 盘点当前塔罗阶段与事件**

运行：

```powershell
rg -n "Tarot|stage|shuffle|cut|fan|reveal|reading|dispatch|animation" src/games/tarot src/components/AppShell.tsx
```

记录每个阶段的进入条件、用户事件、出口事件和测试文件。

- [ ] **Step 2: 编写时间线**

每个阶段写成固定表格，列出 `0ms`、中间关键点、结束点、交互解锁点。没有代码证据的时间不得伪造，先标记为当前实现测得值。

- [ ] **Step 3: 编写截图检查点**

至少定义：

```text
question-start
shuffle-start
shuffle-mid
shuffle-end
cut-lift
cut-drop
fan-ready
card-selected
reveal-mid
reading-final
```

每个检查点写固定视口、预期布局、必须可见元素和禁止现象。

- [ ] **Step 4: 编写人工验收标准**

加入连续点击、动画期间锁定、reduced-motion、窄屏无溢出、重新开始、历史面板和分享结果检查。

- [ ] **Step 5: 运行文档路径检查**

```powershell
node scripts/check-docs.mjs
```

Expected: PASS，并识别所有塔罗基线文档。

- [ ] **Step 6: Commit**

```powershell
git add docs/features/tarot.md docs/visual-baselines/tarot
git commit -m "docs: define tarot visual acceptance baseline"
```

## Phase 3: 图片质量与加载性能

### Task 5: 建立图片资源清单与体积检查

**Files:**
- Create: `docs/assets/asset-manifest.md`
- Create: `docs/features/assets-and-performance.md`
- Create: `scripts/image-metadata.mjs`
- Create: `scripts/check-assets.mjs`
- Create: `scripts/check-assets.test.mjs`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- `npm run check:assets` 输出 errors、warnings 和资源总量，存在 error 时非零退出。
- 图片清单记录路径、类别、尺寸、格式、体积、运行时用途、预算和例外原因。
- `source-only` 资源不得被 `src/`、`public/sw.js` 或任何预加载清单引用。

- [ ] **Step 1: 写资源预算失败测试**

使用临时 fixture 覆盖：

```text
runtime-feature 单图 > 500 KB → error
runtime-feature 单图 350–500 KB → warning
source-only 路径出现在运行时代码 → error
manifest 缺少运行时图片 → error
768x1152 且体积在预算内的塔罗牌面 → pass
```

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm test -- --run scripts/check-assets.test.mjs
```

Expected: FAIL，因为检查脚本和 manifest 尚不存在。

- [ ] **Step 3: 实现图片元信息读取**

`scripts/image-metadata.mjs` 读取 PNG、JPEG、WebP 和 AVIF 的宽高、格式和字节数。它只做检查，不修改图片，也不自动降低质量。

- [ ] **Step 4: 编写当前资源清单**

至少记录：

```text
public/pet/xiaoduoli-startup.png → runtime-critical
public/pet/xiaoduoli-small.jpg → runtime-critical
public/pet/xiaoduoli-large.jpg → runtime-feature
public/tarot/cards/*.jpg → runtime-feature
public/tarot/ui/*.jpg → runtime-feature
public/tarot/concepts/*.png → source-only
```

当前 `public/tarot/concepts` 约 `202.9 MB`，在尚未迁移前只产生归档体积 warning；一旦被运行时代码引用必须产生 error。

- [ ] **Step 5: 实现资源检查**

预算固定为：

```text
塔罗牌面 > 350 KB → warning
塔罗牌面 > 500 KB → error
塔罗背景 > 300 KB → warning
塔罗背景 > 500 KB → error
首屏关键图 > 150 KB → warning
运行时图片总量 > 8 MB → warning
运行时图片总量 > 12 MB → error
```

所有运行时图片必须出现在 manifest 中；新增格式仅允许 PNG、JPEG、WebP、AVIF、SVG 和应用图标 ICO。

- [ ] **Step 6: 运行检查**

```powershell
npm test -- --run scripts/check-assets.test.mjs
npm run check:assets
```

Expected: 测试通过；现有原始概念图只产生 warning；现有正式运行资源不产生 error。

- [ ] **Step 7: Commit**

```powershell
git add package.json README.md docs/assets docs/features/assets-and-performance.md scripts
git commit -m "perf: add image asset budgets and checks"
```

### Task 6: 优化塔罗图片加载并保持展示质量

**Files:**
- Modify: `src/games/tarot/tarotAssets.ts`
- Modify: `src/games/tarot/tarotAssets.test.ts`
- Modify: `src/games/tarot/useTarotLauncher.ts`
- Modify: `src/games/tarot/useTarotLauncher.test.tsx`
- Modify: `src/games/tarot/TarotCard.tsx` only if picture fallback or intrinsic dimensions are missing
- Create: `src/components/OptimizedImage.tsx` only if at least two features need the same image behavior
- Modify: `docs/assets/asset-manifest.md`
- Modify: `docs/features/tarot.md`

**Interfaces:**

```ts
export const TAROT_CRITICAL_RESOURCE_URLS: string[]
export const TAROT_ARTWORK_URLS: string[]
export const TAROT_RESOURCE_URLS: string[]

export function preloadTarotArtwork(
  urls?: string[],
  onProgress?: (progress: number) => void,
  loader?: (url: string) => Promise<void>,
  options?: { concurrency?: number },
): Promise<void>
```

- 塔罗入口只等待牌背和背景等关键资源。
- 抽牌结果确定后才预取实际将展示的牌面。
- 牌面预加载默认并发不超过 `3`。
- 当前 `768x1152` JPEG 保持为清晰 fallback；新格式不能静默替换 fallback。

- [ ] **Step 1: 写资源加载失败测试**

覆盖：

```text
关键资源列表不包含 source-only 概念图
入口关键资源不包含全部 22 张牌面
preloadTarotArtwork 最大并发为 3
单个资源失败时错误包含资源 URL
空数组立即完成且进度为 1
```

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm test -- --run src/games/tarot/tarotAssets.test.ts src/games/tarot/useTarotLauncher.test.tsx
```

Expected: 新增并发和关键资源测试失败。

- [ ] **Step 3: 实现受限并发预加载**

使用固定 worker 数量消费 URL 队列。保留 loader 注入以便测试，不一次性创建全部请求。每完成一项更新进度。

- [ ] **Step 4: 拆分关键资源和牌面资源**

`TAROT_CRITICAL_RESOURCE_URLS` 只包含塔罗入口立刻需要的背景和牌背。牌面在抽牌结果确定后预取；概念图不得进入任何运行时常量。

- [ ] **Step 5: 保证图片展示质量**

牌面保留当前 `768x1152` JPEG fallback。图片组件提供明确宽高或 `aspect-ratio`、`decoding="async"`，非立即可见图片使用 `loading="lazy"`。动画即将使用的牌面必须提前预取，避免翻牌时闪烁。

- [ ] **Step 6: 评估现代格式变体**

先只转换一张代表性塔罗牌和一张背景为高质量 WebP/AVIF，对比：

```text
文字和线条边缘
暗部渐变
色彩偏移
压缩块和光晕断层
手机与桌面视口清晰度
文件体积
```

只有肉眼无明显质量下降且体积有实际收益时，才生成完整变体；否则保留现有 JPEG，不为了数字更小强制转换。

- [ ] **Step 7: 处理原始概念图**

不自动移动约 `202.9 MB` 的概念图。先报告 Git 历史和部署镜像影响，再由用户选择：

```text
迁移到 design-assets 并从生产镜像排除
迁移到 Git LFS
迁移到对象存储
暂时保留但保持 source-only
```

- [ ] **Step 8: 运行专项和视觉验证**

```powershell
npm test -- --run src/games/tarot/tarotAssets.test.ts src/games/tarot/useTarotLauncher.test.tsx
npx tsc -b
npm run check:assets
npm run review
```

使用塔罗验收入口检查首次打开、洗牌、翻牌、慢速网络和移动端清晰度。记录实际请求数量和是否出现图片闪烁。

- [ ] **Step 9: Commit**

```powershell
git add src/games/tarot src/components/OptimizedImage.tsx docs/assets docs/features/tarot.md
git commit -m "perf: load tarot images by stage"
```

## Phase 4: 本地快速验证与直接验收

### Task 7: 添加本地 review 服务命令

**Files:**
- Modify: `package.json`
- Create: `scripts/lib/process.mjs`
- Create: `scripts/review.mjs`
- Create: `scripts/review-stop.mjs`
- Create: `scripts/review.test.mjs`

**Interfaces:**
- `npm run review` 输出 `{ url, mode, pid }` 的人类可读报告。
- `npm run review:stop` 读取 `.codex/review-process.json` 或系统临时目录中的记录并停止服务。
- 默认前端端口为 `4173`，占用时输出实际端口。

- [ ] **Step 1: 写进程辅助测试**

测试端口探测、进程记录序列化和不存在进程时的安全停止，不启动真实服务器。

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm test -- --run scripts/review.test.mjs
```

Expected: FAIL，因为脚本尚不存在。

- [ ] **Step 3: 实现 `scripts/lib/process.mjs`**

提供小函数：

```js
export function findAvailablePort(startPort)
export function writeProcessRecord(recordPath, record)
export function readProcessRecord(recordPath)
export function stopRecordedProcess(record)
```

禁止拼接破坏性 shell 命令；Windows 使用 Node 子进程 API，记录 PID、端口、工作目录和启动时间。

- [ ] **Step 4: 实现 `scripts/review.mjs`**

启动 `vite --host 127.0.0.1 --port <port>`，等待 HTTP 可访问后输出：

```text
本地验收地址: http://127.0.0.1:<port>
模式: mock
停止命令: npm run review:stop
```

- [ ] **Step 5: 实现停止脚本**

只停止自己记录的进程，PID 不存在时返回成功并清理记录，不杀同端口的未知进程。

- [ ] **Step 6: 运行专项验证**

```powershell
npm test -- --run scripts/review.test.mjs
npm run review
Invoke-WebRequest http://127.0.0.1:4173
npm run review:stop
```

Expected: 页面返回成功，停止后端口释放。

- [ ] **Step 7: Commit**

```powershell
git add package.json scripts
git commit -m "feat: add local review server workflow"
```

### Task 8: 添加分级验证命令

**Files:**
- Modify: `package.json`
- Create: `scripts/verify-quick.mjs`
- Create: `scripts/verify-full.mjs`
- Create: `scripts/verify-scripts.test.mjs`

**Interfaces:**
- `npm run verify:quick -- --scope=tarot` 只运行塔罗相关测试和类型检查。
- `npm run verify:quick -- --scope=ui` 运行前端组件测试和类型检查。
- `npm run verify:quick -- --scope=server` 运行后端测试。
- `npm run verify:full` 运行 `npx tsc -b`、`npm run test:all`、`npm run build:all`、架构、文档和图片资源检查。

- [ ] **Step 1: 写命令选择测试**

测试 `tarot`、`ui`、`server` 和未知 scope 的命令解析，未知 scope 必须失败并显示可用值。

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm test -- --run scripts/verify-scripts.test.mjs
```

Expected: FAIL。

- [ ] **Step 3: 实现快速验证映射**

明确命令映射，不使用模糊的全仓库 grep：

```text
tarot → src/games/tarot 相关 Vitest + npx tsc -b
ui → src/components 相关 Vitest + npx tsc -b
server → npm run server:test + npm run server:build
```

- [ ] **Step 4: 实现完整验证**

串行执行每一步，失败立即返回非零状态，并输出失败命令和下一步排查位置。

- [ ] **Step 5: 运行验证**

```powershell
npm test -- --run scripts/verify-scripts.test.mjs
npm run verify:quick -- --scope=tarot
npm run verify:full
```

- [ ] **Step 6: Commit**

```powershell
git add package.json scripts
git commit -m "feat: add tiered verification commands"
```

### Task 9: 添加塔罗开发验收入口

**Files:**
- Create: `src/dev/tarot/TarotDevEntry.tsx`
- Create: `src/dev/tarot/tarotDevEntry.test.tsx`
- Modify: `src/main.tsx` or the actual app entry discovered during implementation
- Modify: `src/games/tarot/TarotGame.tsx` only if a narrow deterministic initial-state interface is required

**Interfaces:**
- 开发入口读取 `?stage=question|spread|shuffle|cut|fan|reveal|reading`。
- 生产模式访问该入口时返回普通 404 或不注册入口。
- 使用正式 `TarotGame`/阶段组件，不复制动画。
- 允许注入固定牌和确定性随机源，但不得写入真实历史。

- [ ] **Step 1: 盘点当前路由入口**

运行：

```powershell
rg -n "createRoot|BrowserRouter|Routes|route|AppShell|TarotGame" src
```

确认实际入口后只修改一个路由注册点。

- [ ] **Step 2: 写入口测试**

覆盖：

```text
?stage=cut → 直接显示 cut 阶段
?stage=unknown → 回退到 question 并显示提示
production build → 不注册 /dev/tarot
```

- [ ] **Step 3: 运行测试确认失败**

```powershell
npm test -- --run src/dev/tarot/tarotDevEntry.test.tsx
```

Expected: FAIL。

- [ ] **Step 4: 实现开发入口**

只在 `import.meta.env.DEV` 下注册。固定测试数据通过 props/context 注入，不改生产 localStorage、历史和分享行为。

- [ ] **Step 5: 运行浏览器验收**

```powershell
npm run review
```

打开：

```text
http://127.0.0.1:4173/dev/tarot?stage=cut
```

检查阶段直达、移动端宽度和浏览器控制台。

- [ ] **Step 6: Commit**

```powershell
git add src/dev src/main.tsx src/games/tarot/TarotGame.tsx
git commit -m "feat: add direct tarot development review entry"
```

## Phase 5: 架构检查与前端能力层示范

### Task 10: 添加架构、文档和图片检查

**Files:**
- Create: `scripts/check-architecture.mjs`
- Create: `scripts/check-docs.mjs`
- Modify: `scripts/check-assets.mjs`
- Create: `scripts/checks.test.mjs`
- Modify: `package.json`

**Interfaces:**
- `node scripts/check-architecture.mjs` 输出 errors/warnings/counts，发现禁止跨层依赖时非零退出。
- `node scripts/check-docs.mjs` 检查功能文档入口、文件路径和塔罗基线入口。
- `node scripts/check-assets.mjs` 检查运行资源预算和 source-only 引用。
- 检查结果必须可在 GitHub Actions 中运行，不依赖浏览器、Docker 或生产密钥。

- [ ] **Step 1: 写禁止依赖失败测试**

使用临时 fixture 检查以下模式：

```text
src/components 直接 import server/src
src/components 直接调用 fetch
src/styles.css 出现 tarot 专属选择器
```

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm test -- --run scripts/checks.test.mjs
```

Expected: FAIL。

- [ ] **Step 3: 实现架构检查**

扫描受控目录和扩展名，忽略测试 fixture、`dist`、`node_modules`。首轮只把明确违规设为 error，组件文件行数和动态导入问题设为 warning。

- [ ] **Step 4: 实现文档检查**

检查 `docs/features/README.md` 列出的所有文件存在，文档中的仓库相对路径存在，`docs/visual-baselines/tarot` 入口存在。

- [ ] **Step 5: 运行检查**

```powershell
npm test -- --run scripts/checks.test.mjs
npm run check:architecture
npm run check:docs
npm run check:assets
```

- [ ] **Step 6: Commit**

```powershell
git add package.json scripts
git commit -m "feat: add architecture and documentation checks"
```

### Task 11: 添加统一异步能力层示范

**Files:**
- Create: `src/services/asyncResult.ts`
- Create: `src/hooks/useAsyncTask.ts`
- Create: `src/services/asyncResult.test.ts`
- Create: `src/hooks/useAsyncTask.test.ts`
- Modify: one low-coupling service consumer selected after import inspection

**Interfaces:**

```ts
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: T | null; error: string }

export function toUserError(error: unknown, fallback: string): string

export function useAsyncTask<TArgs extends unknown[], TResult>(
  task: (...args: TArgs) => Promise<TResult>,
): {
  state: AsyncState<TResult>
  run: (...args: TArgs) => Promise<TResult | undefined>
  reset: () => void
}
```

- [ ] **Step 1: 写 `toUserError` 测试**

覆盖 `Error`、字符串、带 `message` 的对象、未知值和 fallback。

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm test -- --run src/services/asyncResult.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现纯函数**

不访问 React、浏览器或网络；保证错误信息稳定、可测试。

- [ ] **Step 4: 写 hook 生命周期测试**

覆盖初始 idle、运行时 loading、成功、失败、reset 和组件卸载后不更新状态。

- [ ] **Step 5: 实现 `useAsyncTask`**

使用 ref 标记请求序号，旧请求完成时不得覆盖更新请求结果；保留调用方传入的参数类型。

- [ ] **Step 6: 迁移一个低耦合消费者**

优先选择 `src/services/memoryService.ts` 或 `src/services/sessionApi.ts` 的一个 React 调用点。只统一状态和错误处理，不改变请求路径、返回值和用户文案。

- [ ] **Step 7: 运行专项和全量前端验证**

```powershell
npm test -- --run src/services/asyncResult.test.ts src/hooks/useAsyncTask.test.ts
npx tsc -b
npm test -- --run
```

- [ ] **Step 8: Commit**

```powershell
git add src/services/asyncResult.ts src/hooks/useAsyncTask.ts src/services/asyncResult.test.ts src/hooks/useAsyncTask.test.ts <consumer-file>
git commit -m "refactor: add shared async task boundary"
```

## Phase 6: GitHub CI 与 Lighthouse 部署

### Task 12: 添加 GitHub 自动测试

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` only if a script alias is needed

**Interfaces:**
- PR 和 `main` push 触发 CI。
- Node 版本使用项目当前支持的 LTS，实施时从 `package.json`/Dockerfile 统一为 Node 22。
- CI 不读取生产 secrets，不访问生产数据库。

- [ ] **Step 1: 在本地验证 CI 命令**

```powershell
npm ci
npx tsc -b
npm run test:all
npm run build:all
npm run check:architecture
npm run check:docs
npm run check:assets
```

- [ ] **Step 2: 编写 CI workflow**

顺序执行 checkout、setup-node、`npm ci`、缓存 npm、类型检查、测试、构建和检查脚本。任何失败都停止。

- [ ] **Step 3: 使用 YAML 静态检查**

检查 workflow 中触发器、Node 版本、命令和 secrets 均符合设计；不要在 workflow 中写生产密钥值。

- [ ] **Step 4: Commit**

```powershell
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub validation workflow"
```

### Task 13: 编写 Lighthouse 公共部署脚本

**Files:**
- Create: `deploy/lib/deploy-common.sh`
- Create: `deploy/update-web.sh`
- Create: `deploy/update-api.sh`
- Create: `deploy/update-all.sh`
- Create: `deploy/verify.sh`
- Create: `deploy/rollback.sh`
- Modify: `.gitignore`
- Test: `deploy/deploy-scripts.test.mjs` or shell static tests

**Interfaces:**

```text
update-web.sh [commit]
update-api.sh [commit]
update-all.sh [commit]
verify.sh
rollback.sh [commit]
```

公共脚本读取：

```text
DEPLOY_PROJECT_DIR
DEPLOY_COMPOSE_FILE=docker-compose.prod.yml
DEPLOY_ENV_FILE=.env.production
DEPLOY_PUBLIC_URL
```

- [ ] **Step 1: 写 shell 静态测试**

检查脚本具有 `set -euo pipefail`、不包含 `docker compose down -v`、不删除数据卷、不输出 env 文件内容，并使用 `git pull --ff-only` 或显式 `git fetch`。

- [ ] **Step 2: 实现公共函数**

实现路径检查、工作区检查、提交存在性检查、旧版本记录、Compose 命令封装、重试健康检查和统一输出。脚本只允许在配置项目目录或 CI 传入的固定目录运行。

- [ ] **Step 3: 实现 `update-web.sh`**

显式检出目标提交后执行：

```bash
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build web
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps web
```

验证网站健康后输出 web 版本和 URL。

- [ ] **Step 4: 实现 `update-api.sh`**

只构建和重启 `api`，等待 API healthcheck，通过后输出状态。不得重启 PostgreSQL 和 Redis。

- [ ] **Step 5: 实现 `update-all.sh`**

只在明确请求完整更新时执行完整构建和启动，不使用 `down -v`，不删除数据卷。

- [ ] **Step 6: 实现 `verify.sh`**

检查 Compose 服务状态、前端 `/healthz` 和实际 API 健康路径。实施前读取 `server/src/app.ts` 和路由确认 API 路径，脚本与文档使用同一地址。

- [ ] **Step 7: 实现 `rollback.sh`**

从部署状态文件读取上一稳定提交，检出后按记录的服务类型重建并再次健康检查。数据库 schema 不在自动回滚范围内。

- [ ] **Step 8: 运行 shell 静态验证**

```powershell
node deploy/deploy-scripts.test.mjs
```

Expected: PASS；Linux 执行测试在 GitHub CI 或 WSL 中完成，Windows 本地只做静态验证。

- [ ] **Step 9: Commit**

```powershell
git add deploy .gitignore
git commit -m "ops: add safe Lighthouse deployment scripts"
```

### Task 14: 添加手动批准生产部署 workflow

**Files:**
- Create: `.github/workflows/deploy-production.yml`
- Modify: `deploy/README.md`
- Create: `docs/operations/lighthouse-deployment.md`

**Interfaces:**
- workflow_dispatch 参数：`commit`，默认当前 `main`；`service` 为 `web|api|all`。
- 使用 GitHub Environment，例如 `production`，要求 reviewer 批准。
- 通过 SSH 连接 Lighthouse，执行仓库内脚本，不在 workflow 中拼接业务部署逻辑。
- 输出旧版本、新版本、服务类型、线上 URL、健康检查结果和回滚命令。

- [ ] **Step 1: 编写部署文档**

说明一次性配置：

```text
DEPLOY_HOST
DEPLOY_PORT
DEPLOY_USER
DEPLOY_SSH_PRIVATE_KEY
DEPLOY_PATH
DEPLOY_URL
```

说明服务器专用用户、SSH 公钥、Docker 权限、`.env.production` 保留位置、GitHub Environment reviewer 和腾讯云防火墙。

- [ ] **Step 2: 编写 workflow**

流程固定为：

```text
workflow_dispatch
→ checkout 指定 commit
→ 复用 CI 所需验证
→ production environment approval
→ SSH 执行 update-web.sh/update-api.sh/update-all.sh
→ verify.sh
→ 输出部署摘要
```

- [ ] **Step 3: 添加并发保护**

同一时间只允许一个 production 部署；新部署不得取消正在进行的部署，避免两个 Docker 更新互相覆盖。

- [ ] **Step 4: 做 YAML 和命令静态检查**

确认 workflow 不包含真实地址、私钥、密码，不直接执行 `docker compose down -v`，只调用固定脚本。

- [ ] **Step 5: 更新部署文档**

增加日常流程：

```text
确认 main → 打开 Actions → 选择 service → Run workflow → 审批 production → 等待结果 → 打开线上验收链接
```

- [ ] **Step 6: Commit**

```powershell
git add .github/workflows/deploy-production.yml deploy/README.md docs/operations/lighthouse-deployment.md
git commit -m "ci: add approved Lighthouse production deploy"
```

### Task 15: 添加发布验证 Skill 和最终入口

**Files:**
- Modify: `.agents/skills/release-verification/SKILL.md`
- Modify: `docs/features/deployment.md`
- Modify: `README.md`

**Interfaces:**
- AI 能根据 `web/api/all` 选择最小部署脚本。
- 用户能根据文档完成本地验收、GitHub 审批和线上验收。

- [ ] **Step 1: 写发布 Skill 验收表**

覆盖本地 Level 1/2、CI、审批、部署、健康检查、线上验收和回滚。

- [ ] **Step 2: 更新功能和项目入口**

在 README 和部署功能文档中只保留用户需要的步骤，链接到详细运维文档。

- [ ] **Step 3: 运行最终验证**

```powershell
npm run verify:full
git diff --check
git status --short
```

- [ ] **Step 4: Commit**

```powershell
git add .agents README.md docs/features/deployment.md
git commit -m "docs: finalize AI release workflow"
```

## 最终自检

- [ ] 每个设计目标至少对应一个 Task。
- [ ] 所有新增 npm 命令都有实现文件和测试或静态验证。
- [ ] 所有运行时图片都进入 asset manifest，`source-only` 图片没有运行时引用。
- [ ] 塔罗牌面保持清晰 fallback，现代格式变体通过固定视口人工对比后才启用。
- [ ] `npm run check:assets` 已加入 `verify:full` 和 GitHub CI。
- [ ] 塔罗动画基线、开发入口和专项 Skill 使用相同的阶段名称。
- [ ] `update-web.sh`、`update-api.sh`、`update-all.sh` 的服务名称与 Compose 服务一致。
- [ ] 健康检查路径在实现时从实际路由确认，不凭文档猜测。
- [ ] 文档不包含生产密钥、真实 SSH 私钥或未确认的固定服务器地址。
- [ ] 未加入数据库迁移自动回滚。
- [ ] CI 自动测试与生产手动批准职责分离。
- [ ] 无 `TBD`、`TODO`、`待定`、`以后补充` 等占位内容。
- [ ] 合并前在 `main` 上重新运行完整验证。

## 执行方式

计划完成并保存到：

```text
docs/superpowers/plans/2026-08-10-ai-maintainability-implementation.md
```

建议使用 **Inline Execution** 分阶段执行，原因是本任务包含文档、Windows 本地脚本、Linux 部署脚本和 GitHub Actions，逐阶段在当前仓库验证更容易发现环境差异。若后续你希望并行处理互不相干的文档任务，再切换到 Subagent-Driven。
