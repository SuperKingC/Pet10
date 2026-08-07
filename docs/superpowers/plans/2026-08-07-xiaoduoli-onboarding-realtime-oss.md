# 小多利登录、实时聊天与 OSS 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成从内部邀请码登录、添加/接受好友到进入真实共享聊天室的完整前端流程，并增加 Socket.IO 实时同步与阿里云 OSS 图片直传。

**Architecture:** 前端使用明确的应用状态机管理 `login → waiting-friend → chat` 三个阶段，API 客户端负责保存令牌和转换服务端模型；聊天组件改为接收远程快照和回调，不再依赖固定 mock store。服务端增加会话首页、好友请求列表、用户名更新和 OSS V4 预签名 URL，Socket.IO 连接在登录后按房间加入。

**Tech Stack:** React, TypeScript, Express, PostgreSQL, Socket.IO Client, ali-oss, Vitest

## Global Constraints

- Mock 模式必须继续无需服务器即可演示。
- 真实模式必须从登录令牌恢复会话，而不是要求每次重新登录。
- 首版只允许一段待确认或已接受好友关系。
- 接收好友请求的一方必须能在界面中明确接受。
- 房间 ID 必须由服务端会话首页返回，不能写死在构建环境。
- OSS 访问密钥只存在服务端；前端只能获取短时效预签名 PUT URL。
- 上传请求的 `Content-Type` 必须与签名参数一致。
- Socket.IO 事件只用于增量同步，初始状态仍通过 REST 获取。

---

### Task 1: Add session and friendship state APIs

**Files:**
- Modify: `server/src/repositories/contracts.ts`
- Modify: `server/src/repositories/memoryRepositories.ts`
- Modify: `server/src/repositories/postgresRepositories.ts`
- Modify: `server/src/services/friendshipService.ts`
- Create: `server/src/services/sessionService.ts`
- Create: `server/src/services/sessionService.test.ts`
- Create: `server/src/http/sessionRoutes.ts`
- Modify: `server/src/app.ts`

- [ ] Test session states for unbound, pending incoming, pending outgoing, and accepted.
- [ ] Return current user, relationship, friend, room, pet, messages, and memories as appropriate.
- [ ] Add incoming request listing and username update endpoint.

### Task 2: Add OSS upload signing

**Files:**
- Modify: `server/src/config.ts`
- Modify: `server/src/config.test.ts`
- Create: `server/src/services/uploadService.ts`
- Create: `server/src/http/uploadRoutes.ts`
- Modify: `.env.example`
- Modify: `server/package.json`

- [ ] Validate OSS configuration without requiring it in development.
- [ ] Generate sanitized relationship-scoped object keys.
- [ ] Generate five-minute V4 signed PUT URLs.
- [ ] Reject unsupported MIME types and oversized declared uploads.

### Task 3: Build frontend onboarding

**Files:**
- Create: `src/components/LoginScreen.tsx`
- Create: `src/components/FriendSetupScreen.tsx`
- Create: `src/services/sessionApi.ts`
- Create: `src/services/friendshipApi.ts`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`

- [ ] Add invite code + email code login.
- [ ] Add username display and friend search/request.
- [ ] Show incoming/outgoing pending state and accept action.
- [ ] Restore authenticated state from localStorage on reload.

### Task 4: Make chat remote and realtime

**Files:**
- Modify: `src/components/ChatScreen.tsx`
- Modify: `src/services/chatApi.ts`
- Modify: `src/services/memoryService.ts`
- Create: `src/services/realtimeClient.ts`
- Create: `src/services/uploadApi.ts`
- Modify: `package.json`

- [ ] Pass room snapshot into ChatScreen.
- [ ] Use server pet actions and memory deletion in real mode.
- [ ] Subscribe to `message.created`, `pet.updated`, and `memory.deleted`.
- [ ] Upload images through an OSS signed PUT URL.

### Task 5: Verify and publish

- [ ] Run all frontend and backend tests.
- [ ] Run all production builds.
- [ ] Start mock frontend and inspect login/chat state transitions.
- [ ] Start API health check without database access.
- [ ] Commit and push `main`.
