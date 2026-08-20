# 微信登录与多关系小窝实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 将小程序升级为纯微信登录、可与多个好友分别养宠、支持邀请加入和按当前小窝加载资源的正式用户流程。

**Architecture:** 微信身份交换由 `server/src/http` 和 `server/src/services` 负责，用户对关系、小窝和宠物归属由服务端模型、仓储和 SQL 迁移负责。小程序通过启动上下文决定邀请页、准备中小窝、当前小窝或小窝列表，并由独立服务负责邀请、切换和资源加载；现有 PWA 邮箱登录保持不变。

**Tech Stack:** Node.js、Express、TypeScript、PostgreSQL、Taro、React、微信小程序登录 API、Vitest。

**Spec:** `docs/features/wechat-auth-and-multi-room.md`

## Global Constraints

- 每个小窝只包含两位用户和一只共享宠物。
- 同一对用户最多拥有一个小窝；A+B 与 B+A 必须命中同一关系。
- 一个用户可以和多个好友分别建立不同小窝。
- 无邀请且无小窝的用户进入准备中的小窝，不创建需要合并的正式宠物。
- 微信 AppSecret 只存在服务端环境，不能进入小程序包。
- 小程序首屏按启动入口加载；塔罗、五子棋、图片生成和活动资源按功能加载。
- 资源失败不得清理会话或丢失邀请上下文。
- 不修改现有 PWA 邮箱登录行为。
- 当前工作区已有未提交的小程序改动，不得覆盖或回滚。

---

## 文件职责地图

- `server/sql/005_wechat_multi_room.sql`：微信身份、关系小窝、邀请和唯一约束迁移。
- `server/src/domain/models.ts`：用户、关系小窝、共享宠物和邀请的领域类型。
- `server/src/repositories/contracts.ts`：身份、关系、邀请和小窝仓储接口。
- `server/src/repositories/memoryRepositories.ts`：测试用内存仓储。
- `server/src/repositories/postgresRepositories.ts`：生产 PostgreSQL 仓储。
- `server/src/services/wechatAuthService.ts`：服务端微信凭证交换和 Pet10 会话创建。
- `server/src/services/roomService.ts`：关系小窝查询、创建、当前小窝恢复。
- `server/src/services/invitationService.ts`：邀请凭证生命周期和接受事务。
- `server/src/http/authRoutes.ts`：小程序微信登录 HTTP 映射。
- `server/src/http/sessionRoutes.ts`：启动上下文 HTTP 映射。
- `server/src/http/friendshipRoutes.ts`：邀请 HTTP 映射。
- `miniapp/src/services/authApi.ts`：调用微信登录和会话接口。
- `miniapp/src/services/launchContextApi.ts`：读取启动上下文。
- `miniapp/src/services/invitationApi.ts`：创建、查看和接受邀请。
- `miniapp/src/services/roomApi.ts`：读取小窝摘要、当前小窝和切换。
- `miniapp/src/services/assetLoader.ts`：按入口加载和缓存首屏资源。
- `miniapp/src/pages/index/index.tsx`：启动状态分流和准备中小窝入口。
- `miniapp/src/pages/invite/invite.tsx`：邀请确认和接受反馈。
- `miniapp/src/pages/rooms/rooms.tsx`：小窝列表和切换。
- `miniapp/src/domain/launchState.ts`：可测试的启动入口判断。

实现前必须根据实际代码结构确认是否需要拆分或复用现有模块；不得为了匹配计划路径而跨层添加临时依赖。

## Task 1: 定义启动与关系领域契约

**Files:**
- Modify: `server/src/domain/models.ts`
- Modify: `server/src/repositories/contracts.ts`
- Create: `server/src/domain/launchContext.ts`
- Test: `server/src/domain/launchContext.test.ts`

**Interfaces:**
- Produces `RoomSummary`, `PairRoom`, `InvitationSummary`, `LaunchContext`。
- Produces `canonicalizeUserPair(userIdA, userIdB)`，返回稳定排序后的用户对。
- Produces `resolveLaunchEntry(input)`，返回 `shared-room`、`invite`、`room-list` 或 `waiting-room`。

**Steps:**
- [x] 先写用户对排序、重复关系和启动入口判断的失败测试。
- [x] 运行 `npm run test --workspace server -- src/domain/launchContext.test.ts`，确认测试失败。
- [x] 实现最小领域类型和纯函数，不引入 HTTP、数据库或 React。
- [x] 运行同一聚焦测试并确认通过。

## Task 2: 增加微信身份与多小窝数据库约束

**Files:**
- Create: `server/sql/005_wechat_multi_room.sql`
- Modify: `server/src/db/migrations.ts`
- Modify: `server/src/repositories/contracts.ts`
- Modify: `server/src/repositories/memoryRepositories.ts`
- Modify: `server/src/repositories/postgresRepositories.ts`
- Test: `server/src/db/migrations.test.ts`
- Test: `server/src/services/roomService.test.ts`

**Interfaces:**
- `WechatIdentityRepository.findByOpenId(openId)`。
- `WechatIdentityRepository.create(userId, openId, unionId?)`。
- `PairRoomRepository.findByUserPair(userIdA, userIdB)`。
- `PairRoomRepository.listForUser(userId)`。
- `PairRoomRepository.createWithPet(userIdA, userIdB)`。

**Steps:**
- [ ] 先写迁移包含微信身份唯一索引和规范化用户对唯一约束的失败测试。
- [ ] 先写 A+B、B+A 命中同一小窝以及 A+C 创建第二小窝的服务测试。
- [ ] 运行 `npm run server:test -- --run src/db/migrations.test.ts src/services/roomService.test.ts`，确认失败。
- [ ] 添加迁移和两种仓储实现。
- [ ] 确保创建关系和共享宠物在同一服务端事务边界内。
- [ ] 运行聚焦测试并确认通过。

## Task 3: 实现服务端微信登录和启动上下文

**Files:**
- Create: `server/src/services/wechatAuthService.ts`
- Modify: `server/src/services/sessionService.ts`
- Modify: `server/src/http/authRoutes.ts`
- Modify: `server/src/http/sessionRoutes.ts`
- Test: `server/src/services/wechatAuthService.test.ts`
- Test: `server/src/services/sessionService.test.ts`
- Test: `server/src/http/authMiddleware.test.ts`

**Interfaces:**
- `wechatAuthService.login(code, profile)`：服务端换取微信身份并创建或恢复 Pet10 会话。
- `sessionService.getLaunchContext(userId, invitationToken?)`：返回用户摘要、小窝摘要、待处理邀请、当前小窝和入口。
- `POST /api/auth/wechat`：接受小程序登录凭证，不接受客户端用户 ID。
- `GET /api/session/launch-context`：读取当前用户启动上下文。

**Steps:**
- [x] 先写首次登录、重复登录、无效凭证和会话续期失败测试。
- [ ] 先写无邀请无小窝、已有小窝、多个小窝和有效邀请四个入口测试。
- [x] 运行服务端聚焦测试，确认失败。
- [x] 实现服务端微信 API 适配；AppSecret 只从服务端配置读取。
- [x] 映射现有认证中间件的令牌格式，避免引入第二套会话校验。
- [x] 运行聚焦测试并确认通过。

## Task 4: 实现邀请生命周期和接受事务

**Files:**
- Create: `server/src/services/invitationService.ts`
- Modify: `server/src/repositories/contracts.ts`
- Modify: `server/src/repositories/memoryRepositories.ts`
- Modify: `server/src/repositories/postgresRepositories.ts`
- Modify: `server/src/http/friendshipRoutes.ts`
- Test: `server/src/services/invitationService.test.ts`

**Interfaces:**
- `createInvitation(inviterId)`：返回不可猜测的邀请凭证和过期时间。
- `getInvitation(token, viewerId?)`：返回脱敏的邀请摘要。
- `acceptInvitation(token, accepterId)`：校验并原子创建关系小窝和共享宠物。
- `declineInvitation(token, viewerId)`：记录拒绝状态。

**Steps:**
- [ ] 先写自邀、过期、重复关系、已接受和并发接受测试。
- [ ] 运行 `npm run server:test -- --run src/services/invitationService.test.ts`，确认失败。
- [ ] 实现服务端生成的随机凭证和状态转换。
- [ ] 使用数据库唯一约束处理并发重复创建，并将冲突映射为可理解错误。
- [ ] 运行聚焦测试并确认通过。

## Task 5: 替换小程序登录与启动分流

**Files:**
- Modify: `miniapp/src/services/authApi.ts`
- Create: `miniapp/src/services/launchContextApi.ts`
- Create: `miniapp/src/domain/launchState.ts`
- Modify: `miniapp/src/pages/index/index.tsx`
- Modify: `miniapp/src/app.config.ts`
- Test: `miniapp/src/domain/launchState.test.ts`
- Test: `miniapp/src/services/authApi.test.ts`

**Interfaces:**
- `authApi.loginWithWechat()`：调用 `Taro.login`，将临时凭证交给服务端并保存 Pet10 令牌。
- `launchContextApi.get(invitationToken?)`：读取启动上下文。
- `resolveLaunchState(context, invitationToken?)`：返回当前页面状态。

**Steps:**
- [ ] 先写微信登录成功、拒绝授权、网络失败和邀请参数保留测试。
- [ ] 先写四种启动入口分流测试。
- [ ] 运行 `npm test -- --run miniapp/src/domain/launchState.test.ts miniapp/src/services/authApi.test.ts`，确认失败。
- [ ] 移除小程序首页邮箱、验证码和手动房间 ID 的正式入口。
- [ ] 保留当前体验版代码所需的兼容开关，直到真实 API 验收完成。
- [ ] 运行小程序聚焦测试和构建。

## Task 6: 增加邀请确认、准备中小窝和小窝切换

**Files:**
- Create: `miniapp/src/services/invitationApi.ts`
- Create: `miniapp/src/services/roomApi.ts`
- Create: `miniapp/src/pages/invite/invite.tsx`
- Create: `miniapp/src/pages/invite/invite.scss`
- Create: `miniapp/src/pages/rooms/rooms.tsx`
- Create: `miniapp/src/pages/rooms/rooms.scss`
- Modify: `miniapp/src/pages/index/index.tsx`
- Modify: `miniapp/src/pages/room/room.tsx`
- Test: `miniapp/src/services/invitationApi.test.ts`
- Test: `miniapp/src/services/roomApi.test.ts`

**Interfaces:**
- `invitationApi.create()`、`invitationApi.get(token)`、`invitationApi.accept(token)`。
- `roomApi.list()`、`roomApi.get(roomId)`、`roomApi.setActive(roomId)`。
- `Taro.navigateTo({ url: '/pages/invite/invite?token=...' })`。

**Steps:**
- [ ] 先写邀请摘要、接受成功、重复关系和过期邀请的服务测试。
- [ ] 先写小窝列表摘要、当前小窝恢复和切换测试。
- [ ] 运行小程序聚焦测试，确认失败。
- [ ] 实现邀请确认页，登录后回跳仍保留 token。
- [ ] 实现准备中的小窝，不创建正式共享宠物。
- [ ] 实现小窝列表和当前小窝切换，切换时不影响其他小窝。
- [ ] 运行 `npm test --prefix miniapp` 和 `npm run build:weapp --prefix miniapp`。

## Task 7: 实现按入口和当前小窝加载资源

**Files:**
- Create: `miniapp/src/services/assetLoader.ts`
- Modify: `miniapp/src/pages/index/index.scss`
- Modify: `miniapp/src/pages/room/room.scss`
- Modify: `miniapp/src/app.scss`
- Test: `miniapp/src/services/assetLoader.test.ts`
- Check: `docs/assets/asset-manifest.json`

**Interfaces:**
- `assetLoader.prepareForEntry(entry, roomId?)`：只准备当前入口首屏资源。
- `assetLoader.prepareRoom(roomId)`：加载并缓存当前小窝完整资源。
- `assetLoader.getStatus(key)`：返回 `idle`、`loading`、`ready` 或 `error`。

**Steps:**
- [ ] 先写登录前不加载大型资源、入口资源选择、当前小窝缓存和失败重试测试。
- [ ] 运行聚焦测试，确认失败。
- [ ] 将基础包资源和功能资源按规格分层。
- [ ] 让数据请求和资源请求并行，但只等待首屏必需资源。
- [ ] 确保资源错误不触发登出和邀请上下文清理。
- [ ] 运行 `npm test --prefix miniapp` 和 `npm run check:assets`。

## Task 8: 完成文档、真机和发布前验证

**Files:**
- Modify: `docs/features/miniapp.md`
- Modify: `docs/features/social-and-session.md`
- Modify: `docs/features/wechat-auth-and-multi-room.md`
- Modify: `docs/features/README.md`

**Steps:**
- [ ] 将体验版邮箱登录标记为迁移前状态，并链接正式微信登录规格。
- [ ] 更新社交会话流程、失败状态和验收清单。
- [ ] 运行 `npm run check:docs`。
- [ ] 运行 `npm run test:all` 和 `npm run build:all`。
- [ ] 使用真实 HTTPS API 完成两台真机登录、邀请、接受和多小窝切换。
- [ ] 使用微信开发者工具检查首屏、邀请回跳和资源失败恢复。
- [ ] 运行 `npm run verify:full`。
- [ ] 在用户完成视觉验收前不合并到 `main` 或部署。

## 聚焦验收场景

- A 首次微信登录，无邀请、无小窝。
- A 邀请 B，B 首次登录并接受。
- A 再邀请 C，C 接受后创建第二个小窝。
- A 在 A+B 和 A+C 之间切换。
- B 重复打开 A 的邀请。
- A 和 B 并发接受同一邀请。
- A 与 B 已有小窝后再次互相邀请。
- 用户打开过期邀请。
- 登录过程中网络中断。
- 首屏图片加载失败但会话有效。
- 用户拥有多个小窝时只恢复上次小窝的完整资源。
