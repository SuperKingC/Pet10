# 小多利阿里云后端基础实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为小多利 PWA 增加一个可部署到阿里云的 Node.js 后端基础，支持邀请码邮箱登录、单好友绑定、共享聊天室、消息、宠物养成、共同记忆和 OpenAI 兼容 AI 调用。

**Architecture:** 后端使用 Express + TypeScript，PostgreSQL 保存业务数据，Redis 保存短期验证码与后续队列状态，Socket.IO 提供实时消息。业务规则放在纯 TypeScript 服务中并通过仓储接口访问数据，使单元测试不依赖数据库；生产仓储通过 `pg` 连接 PostgreSQL。前端通过环境变量在 mock 与真实 API 适配器之间切换。

**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL, Redis, Socket.IO, JWT, Zod, Vitest, Docker Compose

## Global Constraints

- API Key、JWT Secret、数据库密码和邮件凭据只能来自服务端环境变量。
- 首版每个用户最多拥有一段已接受好友关系。
- 每段好友关系自动创建一个聊天室和一只名为“小多利”的共享宠物。
- 数据模型从第一天支持未来一个用户与不同好友分别拥有宠物。
- 宠物数值只能由服务端规则修改。
- 图片文件最终存入 OSS；当前接口只接收后端签发后的图片 URL。
- AI 服务使用 OpenAI-compatible HTTP API，允许配置自定义 Base URL 与模型名。
- 邮件发送器必须可替换；开发环境可以选择把验证码打印到日志。

---

### Task 1: Create the server workspace

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/config.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `createApp(dependencies): Express`
- Produces: validated `config` object from environment variables.

- [ ] Add server dependencies and root workspace scripts.
- [ ] Write configuration validation tests first.
- [ ] Implement environment parsing with safe development defaults.
- [ ] Add `/health` and JSON error handling.

### Task 2: Define database schema and repositories

**Files:**
- Create: `server/sql/001_initial.sql`
- Create: `server/src/db/pool.ts`
- Create: `server/src/domain/models.ts`
- Create: `server/src/repositories/contracts.ts`
- Create: `server/src/repositories/postgresRepositories.ts`
- Create: `docker-compose.yml`
- Create: `.env.example`

**Interfaces:**
- Produces: repository contracts for users, invitations, relationships, rooms, pets, messages, and memories.
- Produces: PostgreSQL schema with UUID primary keys and relationship-scoped isolation.

- [ ] Add users, login codes, invite codes, friendships, rooms, room members, pets, messages, summaries, memories, and pet events.
- [ ] Add unique constraints enforcing one room and one pet per relationship.
- [ ] Add indexes for room message history and memory lookup.
- [ ] Add PostgreSQL and Redis local containers.

### Task 3: Implement authentication and friend binding

**Files:**
- Create: `server/src/services/authService.ts`
- Create: `server/src/services/authService.test.ts`
- Create: `server/src/services/friendshipService.ts`
- Create: `server/src/services/friendshipService.test.ts`
- Create: `server/src/http/authRoutes.ts`
- Create: `server/src/http/friendshipRoutes.ts`
- Create: `server/src/http/authMiddleware.ts`

**Interfaces:**
- Produces: `requestLoginCode(email, inviteCode)`
- Produces: `verifyLoginCode(email, code)`
- Produces: `sendFriendRequest(userId, username)`
- Produces: `acceptFriendRequest(userId, relationshipId)`

- [ ] Test invite validation, code expiry, token issuance, self-friending, duplicate relationships, and first-version one-friend limit.
- [ ] Store hashed verification codes with expiration.
- [ ] Issue JWT access tokens after successful verification.
- [ ] Create room and 小多利 atomically when a request is accepted.

### Task 4: Implement chat, pet, memory, and AI services

**Files:**
- Create: `server/src/services/petService.ts`
- Create: `server/src/services/petService.test.ts`
- Create: `server/src/services/aiService.ts`
- Create: `server/src/services/memoryService.ts`
- Create: `server/src/http/roomRoutes.ts`
- Create: `server/src/realtime/socketServer.ts`

**Interfaces:**
- Produces: room bootstrap, send message, request pet reply, apply pet action, list/delete memory.
- Emits: `message.created`, `pet.updated`, and `memory.deleted` Socket.IO events.

- [ ] Reuse deterministic pet rules on the server and test all state mutations.
- [ ] Verify room membership before every operation.
- [ ] Build AI context from recent messages, summary, memories, and pet state.
- [ ] Call the configured OpenAI-compatible chat completions endpoint.
- [ ] Fall back to a friendly unavailable response without losing user messages.

### Task 5: Connect the PWA adapter

**Files:**
- Modify: `src/services/chatApi.ts`
- Create: `src/services/httpClient.ts`
- Create: `src/services/runtimeConfig.ts`
- Create: `src/services/authApi.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `VITE_API_BASE_URL` and `VITE_USE_MOCK_API`.
- Produces: the same `ChatApi` interface for mock and real modes.

- [ ] Keep mock mode as the default local experience.
- [ ] Add bearer-token HTTP requests for room messages and pet replies.
- [ ] Document server startup, migrations, environment variables, and Aliyun deployment layout.

### Task 6: Verify and publish

- [ ] Run frontend and server unit tests.
- [ ] Run frontend and server TypeScript builds.
- [ ] Validate Docker Compose configuration.
- [ ] Commit the second-stage backend foundation.
- [ ] Push `main` to `origin`.
