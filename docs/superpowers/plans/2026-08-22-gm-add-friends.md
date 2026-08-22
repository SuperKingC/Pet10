# GM 添加好友模拟 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 小程序长按「关于」弹窗版本号打开 GM 弹窗，一键为当前账号添加 1/3/5 个假好友，模拟单好友与多好友场景。

**Architecture:** 服务端新增 `gmService` 复用 `friendshipService`（创建假用户 → 发起好友请求 → 自动接受，自动生成关系+房间+宠物），通过 `POST /api/gm/friends` 暴露；小程序新增 `gmApi` 并在 `MiniappMeView` 关于弹窗中增加长按入口与 GM 弹窗。

**Tech Stack:** Express + Zod + Vitest（服务端）；Taro React + Vitest（小程序）

**前置阅读（动手前必读）：**
- `AI_RULES.md`
- `docs/features/social-and-session.md`
- 设计文档：`docs/superpowers/specs/2026-08-22-gm-add-friends-design.md`

**Git 约定：** 所有 commit message 用中文。

---

## Task 1: 服务端 gmService（TDD）

**Files:**
- Create: `server/src/services/gmService.ts`
- Test: `server/src/services/gmService.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `server/src/services/gmService.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createGmService } from './gmService.js'

function setup() {
  const repositories = createMemoryRepositories()
  const friendship = createFriendshipService(repositories)
  const gm = createGmService(repositories, friendship)
  return { repositories, gm }
}

describe('gm service', () => {
  it('adds accepted friendships with room and pet for each friend', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })

    const result = await gm.addFriends(me.id, 3)

    expect(result.added).toHaveLength(3)
    const relationships = await repositories.relationships.listAcceptedForUser(me.id)
    expect(relationships).toHaveLength(3)
    for (const relationship of relationships) {
      const room = await repositories.rooms.findByRelationshipId(relationship.id)
      expect(room).toBeDefined()
      expect(await repositories.pets.findByRoomId(room!.id)).toBeDefined()
    }
  })

  it('adds a single friend for the one-friend scenario', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })

    const result = await gm.addFriends(me.id, 1)

    expect(result.added).toHaveLength(1)
    expect(await repositories.relationships.listAcceptedForUser(me.id)).toHaveLength(1)
  })

  it('rejects count out of range', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })

    await expect(gm.addFriends(me.id, 0)).rejects.toThrow('invalid_count')
    await expect(gm.addFriends(me.id, 11)).rejects.toThrow('invalid_count')
    await expect(gm.addFriends(me.id, 1.5)).rejects.toThrow('invalid_count')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd server; npm test -- gmService`
Expected: FAIL，`Cannot find module './gmService.js'`

- [ ] **Step 3: 实现 gmService**

创建 `server/src/services/gmService.ts`：

```ts
import { randomBytes } from 'node:crypto'
import type { RepositoryBundle } from '../repositories/contracts.js'
import type { createFriendshipService } from './friendshipService.js'

const MAX_COUNT = 10

function randomSuffix() {
  return randomBytes(6).toString('hex')
}

export function createGmService(
  repositories: RepositoryBundle,
  friendship: ReturnType<typeof createFriendshipService>
) {
  async function createFakeUser(index: number) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const suffix = randomSuffix()
      const username = `gm_friend_${suffix}`
      const displayName = `测试好友${index + 1}-${suffix.slice(0, 4)}`
      try {
        return await repositories.users.create({ email: `${username}@gm.local`, username, displayName })
      } catch {
        if (attempt === 1) throw new Error('gm_user_create_failed')
      }
    }
    throw new Error('gm_user_create_failed')
  }

  return {
    async addFriends(userId: string, count: number) {
      if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
        throw new Error('invalid_count')
      }
      const added: { userId: string; displayName: string }[] = []
      for (let index = 0; index < count; index += 1) {
        const friend = await createFakeUser(index)
        const relationship = await friendship.sendRequest(userId, friend.username)
        await friendship.acceptRequest(friend.id, relationship.id)
        added.push({ userId: friend.id, displayName: friend.displayName })
      }
      return { added }
    }
  }
}
```

要点：
- `friendship.sendRequest` 返回 pending 关系（requesterId=当前用户，addresseeId=假用户），`friendship.acceptRequest(假用户.id, 关系id)` 自动接受并创建房间+宠物，与真实好友数据一致。
- 假用户 username 为 `gm_friend_<12位hex>`，冲突时重试一次。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd server; npm test -- gmService`
Expected: PASS（3 个用例）

- [ ] **Step 5: 提交**

```bash
git add server/src/services/gmService.ts server/src/services/gmService.test.ts
git commit -m "feat(server): 新增 GM 服务，支持批量添加测试好友"
```

---

## Task 2: 服务端 gmRoutes（TDD）

**Files:**
- Create: `server/src/http/gmRoutes.ts`
- Test: `server/src/http/gmRoutes.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `server/src/http/gmRoutes.test.ts`：

```ts
import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { resolveErrorResponse } from './errorResponse.js'
import { createGmRoutes } from './gmRoutes.js'

function buildApp(service: Parameters<typeof createGmRoutes>[0]) {
  const app = express()
  app.use(express.json())
  app.use((_request, _response, next) => {
    ;(_request as { userId?: string }).userId = 'user-1'
    next()
  })
  app.use(createGmRoutes(service))
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const result = resolveErrorResponse(error)
    response.status(result.status).json({ error: result.error })
  })
  return app
}

describe('gm routes', () => {
  it('adds friends for the authenticated user', async () => {
    const app = buildApp({
      addFriends: async (userId, count) => ({
        added: Array.from({ length: count }, (_, index) => ({
          userId: `${userId}-friend-${index}`,
          displayName: `测试好友${index + 1}`
        }))
      })
    })

    const response = await request(app).post('/friends').send({ count: 2 })

    expect(response.status).toBe(201)
    expect(response.body.added).toHaveLength(2)
    expect(response.body.added[0].userId).toBe('user-1-friend-0')
  })

  it('rejects invalid count with 400', async () => {
    const app = buildApp({ addFriends: async () => ({ added: [] }) })

    const response = await request(app).post('/friends').send({ count: 99 })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_count')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd server; npm test -- gmRoutes`
Expected: FAIL，`Cannot find module './gmRoutes.js'`

- [ ] **Step 3: 实现 gmRoutes**

创建 `server/src/http/gmRoutes.ts`（用 `safeParse` 保证非法 count 返回 400 `invalid_count`，而非 Zod 原始错误）：

```ts
import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'

const addFriendsSchema = z.object({ count: z.number().int().min(1).max(10) })

export function createGmRoutes(service: {
  addFriends(userId: string, count: number): Promise<unknown>
}) {
  const router = Router()
  router.post('/friends', async (request: AuthenticatedRequest, response, next) => {
    try {
      const parsed = addFriendsSchema.safeParse(request.body)
      if (!parsed.success) throw new Error('invalid_count')
      response.status(201).json(await service.addFriends(request.userId!, parsed.data.count))
    } catch (error) { next(error) }
  })
  return router
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd server; npm test -- gmRoutes`
Expected: PASS（2 个用例）

- [ ] **Step 5: 提交**

```bash
git add server/src/http/gmRoutes.ts server/src/http/gmRoutes.test.ts
git commit -m "feat(server): 新增 GM 添加好友路由"
```

---

## Task 3: 注册 GM 路由到 app.ts

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: 添加 import**

在 `server/src/app.ts` 顶部 import 区加入：

```ts
import { createGmRoutes } from './http/gmRoutes.js'
import { createGmService } from './services/gmService.js'
```

- [ ] **Step 2: 创建服务并注册路由**

在 `const friendshipService = createFriendshipService(...)`（约 102-104 行）之后加入：

```ts
const gmService = createGmService(repositories, friendshipService)
```

在 `app.use('/api/friendships', authenticate, createFriendshipRoutes(friendshipService))`（约 122 行）之后加入：

```ts
app.use('/api/gm', authenticate, createGmRoutes(gmService))
```

- [ ] **Step 3: 类型检查 + 全量服务端测试**

Run: `cd server; npx tsc -p tsconfig.json --noEmit; npm test`
Expected: 无类型错误，全部测试 PASS

- [ ] **Step 4: 提交**

```bash
git add server/src/app.ts
git commit -m "feat(server): 注册 /api/gm 路由"
```

---

## Task 4: 小程序 gmApi（TDD）

**Files:**
- Create: `miniapp/src/services/gmApi.ts`
- Test: `miniapp/src/services/gmApi.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `miniapp/src/services/gmApi.test.ts`：

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()

vi.mock('./apiClient', () => ({ apiRequest }))

describe('gm api', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('adds friends with count', async () => {
    apiRequest.mockResolvedValue({ added: [{ userId: 'friend-1', displayName: '测试好友1' }] })
    const { gmApi } = await import('./gmApi')

    const result = await gmApi.addFriends(3)

    expect(apiRequest).toHaveBeenCalledWith('/api/gm/friends', {
      method: 'POST',
      body: { count: 3 }
    })
    expect(result.added).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd miniapp; npm test -- gmApi`
Expected: FAIL，`Cannot find module './gmApi'`

- [ ] **Step 3: 实现 gmApi**

创建 `miniapp/src/services/gmApi.ts`：

```ts
import { apiRequest } from './apiClient'

export interface GmFriendSummary {
  userId: string
  displayName: string
}

export interface GmAddFriendsResult {
  added: GmFriendSummary[]
}

export const gmApi = {
  addFriends(count: number) {
    return apiRequest<GmAddFriendsResult>('/api/gm/friends', {
      method: 'POST',
      body: { count }
    })
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd miniapp; npm test -- gmApi`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add miniapp/src/services/gmApi.ts miniapp/src/services/gmApi.test.ts
git commit -m "feat(miniapp): 新增 GM 添加好友 API 封装"
```

---

## Task 5: MiniappMeView GM 入口与弹窗

**Files:**
- Modify: `miniapp/src/features/main/MiniappMeView.tsx`
- Modify: `miniapp/src/features/main/MiniappMeView.scss`

- [ ] **Step 1: 修改 MiniappMeView.tsx**

1. import 区（`socialApi` 附近）加入：

```ts
import { gmApi } from '../../services/gmApi'
```

2. state 声明区（`aboutOpen` 之后）加入：

```ts
const [gmOpen, setGmOpen] = useState(false)
const [gmCount, setGmCount] = useState(1)
const [gmBusy, setGmBusy] = useState(false)
```

3. 在 `markNotificationsRead` 等函数附近加入：

```ts
const addGmFriends = async () => {
  if (gmBusy) return
  setGmBusy(true)
  try {
    const result = await gmApi.addFriends(gmCount)
    setGmOpen(false)
    Taro.showToast({ title: `已添加 ${result.added.length} 个好友`, icon: 'success' })
  } catch {
    Taro.showToast({ title: '添加失败', icon: 'none' })
  } finally {
    setGmBusy(false)
  }
}
```

4. 版本号文本加长按（原第 210 行附近）：

```tsx
<Text className="miniapp-about__version" onLongPress={() => setGmOpen(true)}>小多利 v2.0</Text>
```

5. 在关于弹窗渲染块（`aboutOpen && ...`）之后加入 GM 弹窗：

```tsx
{gmOpen && (
  <MiniappModal onClose={() => { if (!gmBusy) setGmOpen(false) }}>
    <Text className="miniapp-gm__title">GM 工具</Text>
    <Text className="miniapp-gm__intro">为当前账号添加测试好友，用于模拟一个或多个好友的场景。</Text>
    <View className="miniapp-gm__counts">
      {[1, 3, 5].map((value) => (
        <Button
          key={value}
          className={`miniapp-gm__count${gmCount === value ? ' miniapp-gm__count--active' : ''}`}
          onClick={() => setGmCount(value)}
        >
          {value} 个
        </Button>
      ))}
    </View>
    <Button className="miniapp-gm__submit" disabled={gmBusy} onClick={addGmFriends}>
      {gmBusy ? '添加中…' : '添加好友'}
    </Button>
  </MiniappModal>
)}
```

- [ ] **Step 2: 添加样式**

在 `MiniappMeView.scss` 末尾追加（沿用 `miniapp-contact__*` 视觉语言）：

```scss
.miniapp-gm__title {
  display: block;
  padding-right: 76rpx;
  color: #382b23;
  font-size: var(--font-size-overlay-title);
  font-weight: var(--font-weight-bold);
}

.miniapp-gm__intro {
  display: block;
  margin: 20rpx 0 28rpx;
  color: #7c6a5d;
  font-size: var(--font-size-body);
  line-height: 1.6;
}

.miniapp-gm__counts {
  display: flex;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.miniapp-gm__count {
  flex: 1;
  margin: 0;
  padding: 16rpx 0;
  color: #7c6a5d;
  background: #fff;
  border: 2px solid #f0ded1;
  border-radius: 999px;
  font-size: var(--font-size-body);
}

.miniapp-gm__count--active {
  color: #fff;
  background: linear-gradient(135deg, #dc895f, #c97655);
  border-color: transparent;
  font-weight: var(--font-weight-semibold);
}

.miniapp-gm__submit {
  margin: 0;
  padding: 20rpx 0;
  color: #fff;
  background: linear-gradient(135deg, #dc895f, #c97655);
  border: 0;
  border-radius: 999px;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
}

.miniapp-gm__submit[disabled] {
  opacity: 0.6;
}
```

- [ ] **Step 3: 小程序测试与构建验证**

Run: `cd miniapp; npm test; npx tsc --noEmit`
Expected: 全部测试 PASS，无类型错误（`miniappPresentation.test.ts` 对 `miniapp-about__version` 的断言不受影响）

- [ ] **Step 4: 提交**

```bash
git add miniapp/src/features/main/MiniappMeView.tsx miniapp/src/features/main/MiniappMeView.scss
git commit -m "feat(miniapp): 关于弹窗长按版本号进入 GM 工具，支持一键添加测试好友"
```

---

## Task 6: 端到端验证

- [ ] **Step 1: 全量检查**

Run（仓库根目录）: `npm run verify:full`
Expected: 全部检查通过

- [ ] **Step 2: 手动验证（微信开发者工具）**

1. 启动服务端与小程序：`cd server; npm run dev`，另开终端 `cd miniapp; npm run dev:weapp`
2. 微信开发者工具导入 `miniapp` 产物，登录真实账号
3. 「我的」→ 关于小多利 → 长按「小多利 v2.0」→ GM 弹窗出现
4. 选 1 个 → 添加好友 → 会话列表出现 1 个新好友房间（单好友场景）
5. 再选 3 个 → 添加 → 会话列表共出现 4 个新好友房间（多好友场景）
6. 进入新好友房间确认房间与宠物正常

- [ ] **Step 3: 汇报**

按 AGENTS.md 要求汇报：执行的命令、结果、未验证区域。视觉变更需用户验收后才可合入 main。

---

## 自查记录

- 规格覆盖：gmService（Task 1）、gmRoutes+app 注册（Task 2/3）、gmApi（Task 4）、长按入口+弹窗+toast（Task 5）、1/多好友场景验收（Task 6）、测试计划全部覆盖。
- 错误处理：`invalid_count` 经 `resolveErrorResponse` 的 `invalid` 分支返回 400；用户名冲突重试一次（Task 1）。
- 类型一致：`addFriends(userId, count)` 返回 `{ added: { userId, displayName }[] }`，服务端/路由/小程序端签名一致。
