# 小多利智能检索与专业问答实施计划

> 设计文档：`docs/superpowers/specs/2026-08-12-xiaoduoli-intelligent-search-design.md`

## 实施前边界

- **目标**：让小多利对实时和专业问题自动判断、追问、检索并整理回答。
- **非目标**：不重写聊天 UI，不展示来源，不改变房间消息协议，不接入专用商品或游戏数据库。
- **基线**：`main`，当前提交 `6b98a6b66061fae2bd9f269eb680e8bfd0626af7`，与 `origin/main` 一致。
- **工作区状态**：存在未提交文件 `docs/superpowers/plans/2026-08-12-responsive-layout-editor-implementation.md` 和 `docs/superpowers/specs/2026-08-12-responsive-layout-editor-design.md`，实施时不得修改或覆盖。
- **验证入口**：服务端专项测试、前端测试、类型检查；完成阶段再运行 `npm run verify:full`。

## Task 1：定义路由与检索领域类型

**Files:**
- Create: `server/src/services/aiRouting.ts`
- Create: `server/src/services/aiRouting.test.ts`
- Modify: `server/src/services/aiService.ts`

**Interfaces:**
- `AiRouteDecision`
- `AiRouteInput`
- `routeAiQuestion(input)`
- `AiService.route(input)`

**Steps:**

1. 先为闲聊、信息不足的价格问题、完整价格问题、版本敏感游戏问题和稳定专业问题写失败测试。
2. 定义 `direct`、`clarify`、`search` 三种路由结果。
3. 让路由逻辑通过 AI 服务返回结构化 JSON，解析失败时使用保守的 `clarify` 或 `direct` 降级。
4. 限制分类、查询词数量和追问长度，避免模型输出越界内容。
5. 保持现有 `reply` 接口兼容，暂不改变消息创建流程。
6. 运行 `npm run test --workspace server -- aiRouting`。

## Task 2：实现可替换的 SearchService

**Files:**
- Create: `server/src/services/searchService.ts`
- Create: `server/src/services/searchService.test.ts`
- Modify: `server/src/config.ts`
- Modify: `.env.example`
- Modify: `.env.production.example`

**Interfaces:**
- `SearchService`
- `SearchInput`
- `SearchResult`
- `SearchResultSet`
- `createSearchService(config.search, fetchImpl?)`

**Steps:**

1. 先测试成功响应、HTTP 错误、超时、空结果和非法供应商响应。
2. 增加统一的供应商适配器，把外部响应转换为 `SearchResultSet`。
3. 使用 `AbortController` 实现固定超时。
4. 限制查询数、结果数、摘要长度和总字符数。
5. 让搜索服务在未配置密钥时返回可识别的 `unavailable` 状态，而不是抛出未处理异常。
6. 增加搜索服务的基础 URL、API key、超时、最大查询数和结果数配置。
7. 运行 `npm run test --workspace server -- searchService`。

## Task 3：接入问题路由与检索整理

**Files:**
- Modify: `server/src/services/aiService.ts`
- Modify: `server/src/services/petBrain.ts`
- Modify: `server/src/ai/persona.ts`
- Modify: `server/src/index.ts`
- Modify: `server/src/services/aiService.test.ts`
- Modify: `server/src/services/petBrain.test.ts`

**Interfaces:**
- `createAiService(config.ai, dependencies?)`
- `AiReplyInput`
- `AiReplyResult`
- `SearchContext`

**Steps:**

1. 先补充失败测试：direct 不搜索、clarify 不搜索且返回追问、search 调用搜索服务、无结果不猜、冲突结果使用不确定表达。
2. 将 `SearchService` 注入 `createAiService`，不要在 AI 服务内部直接创建网络客户端。
3. 对每次宠物回复先运行路由器。
4. 对 `clarify` 直接生成一条自然追问并创建宠物消息。
5. 对 `search` 调用 SearchService，再将规范化资料传入最终整理提示词。
6. 保持 `PetBrain` 负责房间、宠物、记忆和消息编排，保持服务边界清晰。
7. 对搜索异常使用不猜测的失败回答，并确保 `pet.typing` 事件仍然正常关闭。
8. 运行 `npm run test --workspace server -- aiService petBrain`。

## Task 4：补充专业回答规则与聊天文档

**Files:**
- Modify: `server/src/ai/persona.ts`
- Modify: `docs/features/chat.md`
- Modify: `README.md`

**Steps:**

1. 为价格、游戏版本和专业问题增加回答规则，但不削弱小多利的陪伴语气。
2. 明确模型不得把不确定事实写成确定数字。
3. 明确最终用户消息不输出 URL、引用标记和内部工具字段。
4. 在聊天功能文档中补充路由、检索、失败状态和代码入口。
5. 运行 `npm run check:docs`，确认文档链接和结构检查通过。

## Task 5：全链路验证与本地验收

**Files:**
- No new implementation files.

**Steps:**

1. 运行服务端专项测试和前端现有测试。
2. 运行类型检查与生产构建。
3. 配置测试搜索适配器，验证相机价格、碰碰棋 S2、普通闲聊和搜索失败四类场景。
4. 运行 `npm run review`，启动本地验收服务。
5. 检查浏览器控制台、聊天消息只出现一次、搜索等待状态和失败文案。
6. 运行 `npm run verify:full`。
7. 报告已验证、未验证、Review URL 和回滚方式；不在用户验收前合并或部署。

## 自检

- 每条设计目标都有对应 Task。
- 路由失败、搜索失败、空结果和冲突结果都有测试。
- `petBrain` 不直接调用外部搜索 API。
- 前端不新增外部搜索依赖。
- 生产密钥只通过环境变量读取。
- 用户可见回答不包含来源链接。
- 现有未提交响应式布局文档未被修改。
- 计划不包含数据库迁移或生产服务器直接编辑。

## 执行方式

计划完成并保存到：

```text
docs/superpowers/plans/2026-08-12-xiaoduoli-intelligent-search-implementation.md
```

建议使用 **Inline Execution**，因为路由、搜索适配器和 AI 编排存在顺序依赖，逐 Task 验证比并行修改更容易保持服务边界和测试稳定。
