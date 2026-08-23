# 心情图标放大与纪念日功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 放大日历心情图标，并为「小记」页新增房间共享的纪念日功能（5 种图标、说明、日历徽标、「日历｜纪念日」分页与倒计时）。

**Architecture:** 服务端沿用 moods 的房间共享模式：`anniversaries` 表 + 仓库层（memory/postgres）+ socialService 方法 + socialRoutes 4 个 REST 接口。小程序端在 `MiniappCalendarView` 内新增分段分页、日期弹窗（心情+纪念日）与纪念日列表，倒计时为纯函数模块 `anniversaryModel.ts`（TDD）。

**Tech Stack:** Node/Express/Zod/Vitest（server）、Taro React/Vitest（miniapp）、Postgres 迁移、ImageGen 图标资源。

**Spec:** `docs/superpowers/specs/2026-08-23-anniversary-feature-design.md`

**全局约定：**
- PowerShell 不支持 `&&`，命令间用 `;` 分隔。
- Git 提交信息用中文。
- 工作区有其他无关未提交改动，每次 commit 只 `git add` 本任务列出的文件。
- 服务端日期字段：pg OID 1082 已配置返回 `'YYYY-MM-DD'` 字符串（见 `server/src/db/pgTypes.ts`），数据库列名用 `repeat_rule`（camel 后为 `repeatRule`，避免与关键字 `repeat` 纠缠）。

---

### Task 1: 服务端数据模型与迁移

**Files:**
- Modify: `server/src/domain/models.ts`（在 `MoodEntry` 接口后新增）
- Create: `server/sql/007_anniversaries.sql`
- Modify: `server/src/db/migrations.ts`（运行时迁移 SQL 字符串末尾追加）
- Test: `server/src/db/migrations.test.ts`

- [ ] **Step 1: 更新迁移测试（先失败）**

在 `migrations.test.ts` 的 `expect` 序列末尾追加：

```ts
    expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS anniversaries')
    expect(executedSql).toContain('CREATE INDEX IF NOT EXISTS anniversaries_room_idx')
```

Run: `cd d:\Pet10\server; npm test -- migrations`
Expected: FAIL（断言未命中）

- [ ] **Step 2: domain 类型**

`server/src/domain/models.ts`，紧跟 `MoodEntry` 之后：

```ts
export interface Anniversary {
  id: Id
  roomId: Id
  userId: Id
  name: string
  icon: string
  note: string
  day: string
  repeatRule: 'yearly' | 'none'
  createdAt: Date
  updatedAt: Date
}
```

- [ ] **Step 3: SQL 迁移文件**

创建 `server/sql/007_anniversaries.sql`：

```sql
-- 007_anniversaries.sql：纪念日（房间共享，支持每年重复）
-- 注意：docker-entrypoint-initdb.d 只对全新数据卷生效；已部署环境由服务端运行时迁移自动执行。

CREATE TABLE IF NOT EXISTS anniversaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL,
  note text NOT NULL DEFAULT '',
  day date NOT NULL,
  repeat_rule text NOT NULL DEFAULT 'yearly' CHECK (repeat_rule IN ('yearly', 'none')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, name, day)
);

CREATE INDEX IF NOT EXISTS anniversaries_room_idx ON anniversaries (room_id, created_at);
```

- [ ] **Step 4: 运行时迁移**

`server/src/db/migrations.ts` 中 `ensureRuntimeMigrations` 的模板字符串内、最后一条 `CREATE INDEX IF NOT EXISTS invitations_pending_expiry_idx ... ;` 之后追加：

```sql
    CREATE TABLE IF NOT EXISTS anniversaries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      icon text NOT NULL,
      note text NOT NULL DEFAULT '',
      day date NOT NULL,
      repeat_rule text NOT NULL DEFAULT 'yearly' CHECK (repeat_rule IN ('yearly', 'none')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (room_id, name, day)
    );

    CREATE INDEX IF NOT EXISTS anniversaries_room_idx
      ON anniversaries (room_id, created_at);
```

- [ ] **Step 5: 验证**

Run: `cd d:\Pet10\server; npm test -- migrations`
Expected: PASS

- [ ] **Step 6: Commit**

```powershell
git add server/src/domain/models.ts server/sql/007_anniversaries.sql server/src/db/migrations.ts server/src/db/migrations.test.ts; git commit -m "feat: 新增纪念日数据模型与数据库迁移"
```

---

### Task 2: 服务端仓库层（contracts + memory + postgres）

**Files:**
- Modify: `server/src/repositories/contracts.ts`
- Modify: `server/src/repositories/memoryRepositories.ts`
- Modify: `server/src/repositories/postgresRepositories.ts`

- [ ] **Step 1: contracts**

`contracts.ts`：import 列表加入 `Anniversary`；在 `MoodRepository` 之后新增：

```ts
export interface AnniversaryRepository {
  create(input: Pick<Anniversary, 'roomId' | 'userId' | 'name' | 'icon' | 'note' | 'day' | 'repeatRule'>): Promise<Anniversary>
  update(id: string, patch: { name?: string; icon?: string; note?: string; repeatRule?: Anniversary['repeatRule'] }): Promise<Anniversary | undefined>
  deleteById(roomId: string, id: string): Promise<void>
  listByRoom(roomId: string): Promise<Anniversary[]>
}
```

`RepositoryBundle` 中 `moods: MoodRepository` 之后加：`anniversaries: AnniversaryRepository`

- [ ] **Step 2: memory 实现**

`memoryRepositories.ts`：import 加入 `Anniversary`；在 `const moods = ...` 附近加 `const anniversaries = new Map<string, Anniversary>()`；在 `moodRepo` 之后加：

```ts
  const anniversaryRepo = {
    async create(input: Pick<Anniversary, 'roomId' | 'userId' | 'name' | 'icon' | 'note' | 'day' | 'repeatRule'>) {
      const item: Anniversary = { id: randomUUID(), ...input, createdAt: now(), updatedAt: now() }
      anniversaries.set(item.id, item)
      return item
    },
    async update(id: string, patch: { name?: string; icon?: string; note?: string; repeatRule?: Anniversary['repeatRule'] }) {
      const item = anniversaries.get(id)
      if (!item) return undefined
      const updated: Anniversary = {
        ...item,
        name: patch.name ?? item.name,
        icon: patch.icon ?? item.icon,
        note: patch.note ?? item.note,
        repeatRule: patch.repeatRule ?? item.repeatRule,
        updatedAt: now()
      }
      anniversaries.set(id, updated)
      return updated
    },
    async deleteById(roomId: string, id: string) {
      const item = anniversaries.get(id)
      if (item?.roomId === roomId) anniversaries.delete(id)
    },
    async listByRoom(roomId: string) {
      return [...anniversaries.values()]
        .filter((item) => item.roomId === roomId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }
  }
```

返回的 bundle 中 `moods: moodRepo` 之后加：`anniversaries: anniversaryRepo`

- [ ] **Step 3: postgres 实现**

`postgresRepositories.ts` 中 `moods: { ... }` 之后加：

```ts
    anniversaries: {
      create: (input) => one(
        `INSERT INTO anniversaries(room_id,user_id,name,icon,note,day,repeat_rule)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [input.roomId, input.userId, input.name, input.icon, input.note, input.day, input.repeatRule]
      ),
      update: (id, patch) => one(
        `UPDATE anniversaries SET
           name = CASE WHEN $2 THEN $3 ELSE name END,
           icon = CASE WHEN $4 THEN $5 ELSE icon END,
           note = CASE WHEN $6 THEN $7 ELSE note END,
           repeat_rule = CASE WHEN $8 THEN $9 ELSE repeat_rule END,
           updated_at = now()
         WHERE id=$1 RETURNING *`,
        [id, patch.name !== undefined, patch.name, patch.icon !== undefined, patch.icon, patch.note !== undefined, patch.note, patch.repeatRule !== undefined, patch.repeatRule]
      ),
      async deleteById(roomId, id) {
        await database.query('DELETE FROM anniversaries WHERE room_id=$1 AND id=$2', [roomId, id])
      },
      listByRoom: (roomId) => many('SELECT * FROM anniversaries WHERE room_id=$1 ORDER BY created_at', [roomId])
    },
```

- [ ] **Step 4: 类型检查与提交**

Run: `cd d:\Pet10\server; npx tsc --noEmit -p tsconfig.json`
Expected: 无错误（此时 RepositoryBundle 要求 anniversaries，两个实现均已补齐）

```powershell
git add server/src/repositories; git commit -m "feat: 新增纪念日仓库层（memory 与 postgres 实现）"
```

---

### Task 3: socialService 纪念日方法（TDD）

**Files:**
- Modify: `server/src/services/socialService.ts`
- Test: `server/src/services/socialService.test.ts`

- [ ] **Step 1: 写失败测试**

`socialService.test.ts` 末尾追加：

```ts
describe('room anniversaries', () => {
  async function createPairRoom(repositories: ReturnType<typeof createMemoryRepositories>) {
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })
    const friend = await repositories.users.create({ email: 'friend@example.com', username: 'friend', displayName: '好友' })
    const relationship = await repositories.relationships.create(me.id, friend.id)
    await repositories.relationships.accept(relationship.id)
    const room = await repositories.rooms.createForRelationship(relationship.id)
    return { me, friend, room }
  }

  const input = { name: '恋爱纪念日', icon: 'heart', note: '在一起', day: '2025-02-14', repeatRule: 'yearly' as const }

  it('creates and lists anniversaries for room members', async () => {
    const { repositories, social } = createService()
    const { me, room } = await createPairRoom(repositories)

    const created = await social.createAnniversary(room.id, me.id, input)
    const list = await social.listAnniversaries(room.id, me.id)

    expect(created.name).toBe('恋爱纪念日')
    expect(created.repeatRule).toBe('yearly')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(created.id)
  })

  it('updates an anniversary', async () => {
    const { repositories, social } = createService()
    const { me, room } = await createPairRoom(repositories)
    const created = await social.createAnniversary(room.id, me.id, input)

    const updated = await social.updateAnniversary(room.id, me.id, created.id, { icon: 'star', note: '' })

    expect(updated?.icon).toBe('star')
    expect(updated?.note).toBe('')
    expect(updated?.name).toBe('恋爱纪念日')
  })

  it('deletes an anniversary', async () => {
    const { repositories, social } = createService()
    const { me, room } = await createPairRoom(repositories)
    const created = await social.createAnniversary(room.id, me.id, input)

    await social.deleteAnniversary(room.id, me.id, created.id)

    expect(await social.listAnniversaries(room.id, me.id)).toHaveLength(0)
  })

  it('rejects users outside the room', async () => {
    const { repositories, social } = createService()
    const { room } = await createPairRoom(repositories)
    const stranger = await repositories.users.create({ email: 'x@example.com', username: 'x', displayName: 'X' })

    await expect(social.createAnniversary(room.id, stranger.id, input)).rejects.toThrow('room_forbidden')
    await expect(social.listAnniversaries(room.id, stranger.id)).rejects.toThrow('room_forbidden')
  })
})
```

Run: `cd d:\Pet10\server; npm test -- socialService`
Expected: FAIL（方法不存在）

- [ ] **Step 2: 实现 service 方法**

`socialService.ts` 顶部 import 加 `Anniversary`（`import type { Anniversary, ChatMessage, User } from '../domain/models.js'`）。在 `listMoods` 方法之后、`// ---------- 动态` 之前插入：

```ts
    // ---------- 纪念日 ----------
    async listAnniversaries(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      return repositories.anniversaries.listByRoom(roomId)
    },

    async createAnniversary(
      roomId: string,
      userId: string,
      input: Pick<Anniversary, 'name' | 'icon' | 'note' | 'day' | 'repeatRule'>
    ) {
      await assertMember(roomId, userId)
      return repositories.anniversaries.create({ ...input, roomId, userId })
    },

    async updateAnniversary(
      roomId: string,
      userId: string,
      id: string,
      patch: { name?: string; icon?: string; note?: string; repeatRule?: Anniversary['repeatRule'] }
    ) {
      await assertMember(roomId, userId)
      const updated = await repositories.anniversaries.update(id, patch)
      if (!updated) throw new Error('anniversary_not_found')
      return updated
    },

    async deleteAnniversary(roomId: string, userId: string, id: string) {
      await assertMember(roomId, userId)
      await repositories.anniversaries.deleteById(roomId, id)
      return { ok: true }
    },
```

- [ ] **Step 3: 验证**

Run: `cd d:\Pet10\server; npm test -- socialService`
Expected: PASS

- [ ] **Step 4: Commit**

```powershell
git add server/src/services/socialService.ts server/src/services/socialService.test.ts; git commit -m "feat: 纪念日服务层增删改查与房间鉴权"
```

---

### Task 4: HTTP 路由（TDD）

**Files:**
- Modify: `server/src/http/socialRoutes.ts`
- Test: `server/src/http/socialRoutes.test.ts`（新建）

- [ ] **Step 1: 写失败测试**

创建 `server/src/http/socialRoutes.test.ts`：

```ts
import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createSocialRoutes } from './socialRoutes.js'

function createApp(social: Record<string, unknown>) {
  const app = express()
  app.use(express.json())
  app.use((_request, _response, next) => {
    ;(_request as { userId?: string }).userId = 'user-1'
    next()
  })
  app.use(createSocialRoutes({ social: social as never, pets: {} as never }))
  return app
}

const stored = {
  id: 'anniv-1', roomId: 'room-1', userId: 'user-1', name: '恋爱纪念日',
  icon: 'heart', note: '在一起', day: '2025-02-14', repeatRule: 'yearly'
}

describe('anniversary routes', () => {
  it('lists anniversaries for a room', async () => {
    const listAnniversaries = vi.fn(async () => [stored])
    const response = await request(createApp({ listAnniversaries })).get('/rooms/room-1/anniversaries')
    expect(response.status).toBe(200)
    expect(listAnniversaries).toHaveBeenCalledWith('room-1', 'user-1')
    expect(response.body).toHaveLength(1)
  })

  it('creates an anniversary with validated input', async () => {
    const createAnniversary = vi.fn(async () => stored)
    const response = await request(createApp({ createAnniversary }))
      .post('/rooms/room-1/anniversaries')
      .send({ name: '恋爱纪念日', icon: 'heart', note: '在一起', day: '2025-02-14', repeatRule: 'yearly' })
    expect(response.status).toBe(201)
    expect(createAnniversary).toHaveBeenCalledWith('room-1', 'user-1', expect.objectContaining({ name: '恋爱纪念日', icon: 'heart', note: '在一起', day: '2025-02-14', repeatRule: 'yearly' }))
  })

  it('rejects unknown icons', async () => {
    const response = await request(createApp({}))
      .post('/rooms/room-1/anniversaries')
      .send({ name: 'x', icon: 'rocket', day: '2025-02-14' })
    expect(response.status).toBe(400)
  })

  it('updates an anniversary', async () => {
    const updateAnniversary = vi.fn(async () => ({ ...stored, icon: 'star' }))
    const response = await request(createApp({ updateAnniversary }))
      .put('/rooms/room-1/anniversaries/anniv-1')
      .send({ icon: 'star' })
    expect(response.status).toBe(200)
    expect(updateAnniversary).toHaveBeenCalledWith('room-1', 'user-1', 'anniv-1', { icon: 'star' })
  })

  it('deletes an anniversary', async () => {
    const deleteAnniversary = vi.fn(async () => ({ ok: true }))
    const response = await request(createApp({ deleteAnniversary })).delete('/rooms/room-1/anniversaries/anniv-1')
    expect(response.status).toBe(200)
    expect(deleteAnniversary).toHaveBeenCalledWith('room-1', 'user-1', 'anniv-1')
  })
})
```

Run: `cd d:\Pet10\server; npm test -- socialRoutes`
Expected: FAIL（路由 404）

- [ ] **Step 2: 实现路由**

`socialRoutes.ts` 中 moods 两个路由之后插入（`ANNIVERSARY_ICONS` 常量放在 `routeParam` 之后）：

```ts
const ANNIVERSARY_ICONS = ['heart', 'star', 'cake', 'paw', 'balloon'] as const

  // 纪念日
  router.get('/rooms/:roomId/anniversaries', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.listAnniversaries(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.post('/rooms/:roomId/anniversaries', async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({
        name: z.string().trim().min(1).max(20),
        icon: z.enum(ANNIVERSARY_ICONS),
        note: z.string().max(50).default(''),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        repeatRule: z.enum(['yearly', 'none']).default('yearly')
      }).parse(request.body)
      const anniversary = await dependencies.social.createAnniversary(routeParam(request.params.roomId), request.userId!, input)
      response.status(201).json(anniversary)
    } catch (error) { next(error) }
  })
  router.put('/rooms/:roomId/anniversaries/:anniversaryId', async (request: AuthenticatedRequest, response, next) => {
    try {
      const patch = z.object({
        name: z.string().trim().min(1).max(20),
        icon: z.enum(ANNIVERSARY_ICONS),
        note: z.string().max(50),
        repeatRule: z.enum(['yearly', 'none'])
      }).partial().parse(request.body)
      const anniversary = await dependencies.social.updateAnniversary(routeParam(request.params.roomId), request.userId!, routeParam(request.params.anniversaryId), patch)
      response.json(anniversary)
    } catch (error) { next(error) }
  })
  router.delete('/rooms/:roomId/anniversaries/:anniversaryId', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.deleteAnniversary(routeParam(request.params.roomId), request.userId!, routeParam(request.params.anniversaryId))) } catch (error) { next(error) }
  })
```

注意：zod 校验失败需返回 400 —— 检查 `server/src/http/errorResponse.ts` 是否已把 ZodError 映射为 400；若未映射，在其中补充 `if (error instanceof ZodError) return { status: 400, error: 'invalid_input' }`（从 'zod' import ZodError），并同步其测试 `errorResponse.test.ts`。

- [ ] **Step 3: 验证**

Run: `cd d:\Pet10\server; npm test`
Expected: 全部 PASS

- [ ] **Step 4: Commit**

```powershell
git add server/src/http server; git commit -m "feat: 纪念日 REST 接口与参数校验"
```

---

### Task 5: 小程序 anniversaryModel 纯函数（TDD）

**Files:**
- Create: `miniapp/src/features/main/anniversaryModel.ts`
- Test: `miniapp/src/features/main/anniversaryModel.test.ts`
- Modify: `miniapp/src/services/socialApi.ts`

- [ ] **Step 1: 写失败测试**

创建 `anniversaryModel.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { anniversaryStats, matchesDay, nextOccurrence, sortAnniversaries, statsLines } from './anniversaryModel'

const yearly = { id: '1', name: '恋爱纪念日', icon: 'heart', note: '', day: '2025-02-14', repeatRule: 'yearly' as const, createdAt: '' }
const once = { id: '2', name: '演唱会', icon: 'star', note: '', day: '2026-10-01', repeatRule: 'none' as const, createdAt: '' }

describe('matchesDay', () => {
  it('yearly matches month-day in any year', () => {
    expect(matchesDay(yearly, '2026-02-14')).toBe(true)
    expect(matchesDay(yearly, '2026-02-15')).toBe(false)
  })
  it('none matches exact day only', () => {
    expect(matchesDay(once, '2026-10-01')).toBe(true)
    expect(matchesDay(once, '2027-10-01')).toBe(false)
  })
})

describe('nextOccurrence', () => {
  it('yearly rolls to next year after passing', () => {
    expect(nextOccurrence(yearly, new Date(2026, 7, 23))?.getFullYear()).toBe(2027)
  })
  it('yearly keeps this year before the date', () => {
    expect(nextOccurrence(yearly, new Date(2026, 0, 1))?.getFullYear()).toBe(2026)
  })
  it('leap day falls back to Feb 28 in non-leap years', () => {
    const leap = { ...yearly, day: '2024-02-29' }
    const next = nextOccurrence(leap, new Date(2026, 6, 1))
    expect(next?.getMonth()).toBe(1)
    expect(next?.getDate()).toBe(28)
  })
})

describe('anniversaryStats', () => {
  it('counts days since and countdown to next year', () => {
    const stats = anniversaryStats(yearly, new Date(2026, 7, 23))
    expect(stats.daysSince).toBe(555)
    expect(stats.daysUntilNext).toBe(205)
    expect(stats.nextAnniversaryYear).toBe(2)
    expect(stats.isAnniversaryToday).toBe(false)
  })
  it('flags the anniversary day itself', () => {
    const stats = anniversaryStats(yearly, new Date(2026, 1, 14))
    expect(stats.isAnniversaryToday).toBe(true)
    expect(stats.nextAnniversaryYear).toBe(1)
  })
  it('handles yearly before the first date', () => {
    const future = { ...yearly, day: '2026-09-01' }
    const stats = anniversaryStats(future, new Date(2026, 7, 23))
    expect(stats.daysSince).toBeLessThan(0)
    expect(stats.daysUntilNext).toBe(9)
  })
})

describe('statsLines', () => {
  it('yearly shows elapsed days plus countdown', () => {
    expect(statsLines(yearly, new Date(2026, 7, 23))).toEqual(['已经走过 555 天', '距第 2 周年还有 205 天'])
  })
  it('yearly celebrates today', () => {
    expect(statsLines(yearly, new Date(2026, 1, 14))[1]).toContain('周年')
  })
  it('one-off future shows countdown only', () => {
    expect(statsLines(once, new Date(2026, 7, 23))).toEqual(['还有 39 天'])
  })
  it('one-off past shows elapsed days', () => {
    const past = { ...once, day: '2026-08-01' }
    expect(statsLines(past, new Date(2026, 7, 23))).toEqual(['已经过去 22 天'])
  })
})

describe('sortAnniversaries', () => {
  it('sorts upcoming first by closeness, past one-off last', () => {
    const past = { ...once, id: 'past', day: '2026-01-01' }
    const near = { ...once, id: 'near', day: '2026-09-01' }
    const far = { ...yearly, id: 'far' }
    const sorted = sortAnniversaries([past, far, near], new Date(2026, 7, 23))
    expect(sorted.map((item) => item.id)).toEqual(['near', 'far', 'past'])
  })
})
```

Run: `cd d:\Pet10\miniapp; npm test -- anniversaryModel`
Expected: FAIL（模块不存在）

- [ ] **Step 2: 实现 anniversaryModel**

创建 `miniapp/src/features/main/anniversaryModel.ts`：

```ts
export type AnniversaryRepeat = 'yearly' | 'none'

export interface AnniversaryRecord {
  id: string
  name: string
  icon: string
  note: string
  day: string
  repeatRule: AnniversaryRepeat
  createdAt: string
}

export function parseDay(day: string): Date {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)))
}

function midnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysBetween(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((toUtc - fromUtc) / 86400000)
}

export function matchesDay(record: Pick<AnniversaryRecord, 'day' | 'repeatRule'>, dayKey: string): boolean {
  if (record.repeatRule === 'none') return record.day === dayKey
  return record.day.slice(5) === dayKey.slice(5)
}

function safeDate(year: number, month: number, dayNumber: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(dayNumber, lastDay))
}

export function nextOccurrence(record: Pick<AnniversaryRecord, 'day' | 'repeatRule'>, today: Date): Date | null {
  if (record.repeatRule === 'none') return parseDay(record.day)
  const month = Number(record.day.slice(5, 7)) - 1
  const dayNumber = Number(record.day.slice(8, 10))
  const candidate = safeDate(today.getFullYear(), month, dayNumber)
  if (candidate.getTime() < midnight(today).getTime()) return safeDate(today.getFullYear() + 1, month, dayNumber)
  return candidate
}

export interface AnniversaryStats {
  daysSince: number
  daysUntilNext: number
  nextAnniversaryYear: number
  isAnniversaryToday: boolean
}

export function anniversaryStats(record: AnniversaryRecord, today: Date): AnniversaryStats {
  const start = parseDay(record.day)
  const daysSince = daysBetween(start, today)
  const next = nextOccurrence(record, today) as Date
  const daysUntilNext = daysBetween(today, next)
  const isAnniversaryToday = daysUntilNext === 0 && daysSince >= 0
  const nextAnniversaryYear = Math.max(1, next.getFullYear() - start.getFullYear())
  return { daysSince, daysUntilNext, nextAnniversaryYear, isAnniversaryToday }
}

export function statsLines(record: AnniversaryRecord, today: Date): string[] {
  const stats = anniversaryStats(record, today)
  if (record.repeatRule === 'yearly') {
    if (stats.daysSince < 0) return [`还有 ${stats.daysUntilNext} 天`]
    if (stats.isAnniversaryToday) return [`已经走过 ${stats.daysSince} 天`, `今天是第 ${stats.nextAnniversaryYear} 周年 🎉`]
    return [`已经走过 ${stats.daysSince} 天`, `距第 ${stats.nextAnniversaryYear} 周年还有 ${stats.daysUntilNext} 天`]
  }
  if (stats.daysSince === 0) return ['就是今天 🎉']
  return stats.daysSince > 0 ? [`已经过去 ${stats.daysSince} 天`] : [`还有 ${stats.daysUntilNext} 天`]
}

export function sortAnniversaries<T extends Pick<AnniversaryRecord, 'day' | 'repeatRule'>>(list: T[], today: Date): T[] {
  return [...list].sort((a, b) => {
    const aNext = nextOccurrence(a, today) as Date
    const bNext = nextOccurrence(b, today) as Date
    const aPast = a.repeatRule === 'none' && daysBetween(aNext, today) > 0
    const bPast = b.repeatRule === 'none' && daysBetween(bNext, today) > 0
    if (aPast !== bPast) return aPast ? 1 : -1
    if (!aPast) return daysBetween(today, aNext) - daysBetween(today, bNext)
    return daysBetween(bNext, today) - daysBetween(aNext, today)
  })
}
```

- [ ] **Step 3: 验证测试**

Run: `cd d:\Pet10\miniapp; npm test -- anniversaryModel`
Expected: PASS

- [ ] **Step 4: socialApi 扩展**

`miniapp/src/services/socialApi.ts`：`MiniappMood` 接口后新增类型，`socialApi` 对象内 `setMood` 后新增 4 个方法：

```ts
export type AnniversaryRepeat = 'yearly' | 'none'

export interface MiniappAnniversary {
  id: string
  roomId: string
  userId: string
  name: string
  icon: string
  note: string
  day: string
  repeatRule: AnniversaryRepeat
  createdAt: string
  updatedAt: string
}

export interface AnniversaryInput {
  name: string
  icon: string
  note: string
  day: string
  repeatRule: AnniversaryRepeat
}
```

```ts
  listAnniversaries(roomId: string) {
    return apiRequest<MiniappAnniversary[]>(`/api/social/rooms/${encodeURIComponent(roomId)}/anniversaries`)
  },
  createAnniversary(roomId: string, input: AnniversaryInput) {
    return apiRequest<MiniappAnniversary>(`/api/social/rooms/${encodeURIComponent(roomId)}/anniversaries`, { method: 'POST', body: input })
  },
  updateAnniversary(roomId: string, id: string, patch: Partial<AnniversaryInput>) {
    return apiRequest<MiniappAnniversary>(`/api/social/rooms/${encodeURIComponent(roomId)}/anniversaries/${encodeURIComponent(id)}`, { method: 'PUT', body: patch })
  },
  deleteAnniversary(roomId: string, id: string) {
    return apiRequest<{ ok: boolean }>(`/api/social/rooms/${encodeURIComponent(roomId)}/anniversaries/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
```

- [ ] **Step 5: Commit**

```powershell
git add miniapp/src/features/main/anniversaryModel.ts miniapp/src/features/main/anniversaryModel.test.ts miniapp/src/services/socialApi.ts; git commit -m "feat: 小程序纪念日倒计时纯函数与 API 封装"
```

---

### Task 6: 纪念日图标资源（5 个）

**Files:**
- Create: `miniapp/src/assets/anniversaries/anniv-heart.png`、`anniv-star.png`、`anniv-cake.png`、`anniv-paw.png`、`anniv-balloon.png`

- [ ] **Step 1: 生成图标**

用 ImageGen 逐个生成（1024x1024），提示词基调：手绘水彩贴纸风格，温暖奶油底色（#fdf6ec）、柔和棕橙色描边，与小程序 mood 图标风格一致；主体分别为红色爱心、金色五角星、奶油小蛋糕、棕色小狗爪印、粉色气球；圆形贴纸构图、无文字。

- [ ] **Step 2: 缩放为 256px**

仿照 `tmp/resize-icons.ps1` 写临时脚本（System.Drawing，HighQualityBicubic），输出到 `miniapp/src/assets/anniversaries/` 对应文件名。

- [ ] **Step 3: 验证体积预算**

Run: `cd d:\Pet10\miniapp; npm test -- assetBudget`
Expected: PASS（每个文件 < 180KB；mood 图标约 47KB 可参考）

- [ ] **Step 4: Commit**

```powershell
git add miniapp/src/assets/anniversaries; git commit -m "feat: 新增纪念日五种手绘图标资源"
```

---

### Task 7: 心情图标放大（纯样式）

**Files:**
- Modify: `miniapp/src/features/main/MiniappCalendarView.scss`

- [ ] **Step 1: 修改尺寸**

```
.miniapp-calendar__slot       width/height: 68rpx → 84rpx
.miniapp-calendar__mood-icon  width/height: 68rpx → 84rpx
.mood-modal__icon             width/height: 96rpx → 128rpx
.mood-modal__row-icon         width/height: 84rpx → 112rpx
```

- [ ] **Step 2: Commit**

```powershell
git add miniapp/src/features/main/MiniappCalendarView.scss; git commit -m "style: 放大日历与弹窗中的心情图标"
```

---

### Task 8: 纪念日资源映射与表单组件

**Files:**
- Create: `miniapp/src/features/main/anniversaryAssets.ts`
- Create: `miniapp/src/features/main/AnniversaryForm.tsx`
- Modify: `miniapp/src/features/main/MiniappCalendarView.scss`（表单样式）

- [ ] **Step 1: anniversaryAssets**

```ts
export const anniversaryIconKeys = ['heart', 'star', 'cake', 'paw', 'balloon'] as const
export type AnniversaryIconKey = typeof anniversaryIconKeys[number]

export const anniversaryIcons: Record<AnniversaryIconKey, string> = {
  heart: require('../assets/anniversaries/anniv-heart.png'),
  star: require('../assets/anniversaries/anniv-star.png'),
  cake: require('../assets/anniversaries/anniv-cake.png'),
  paw: require('../assets/anniversaries/anniv-paw.png'),
  balloon: require('../assets/anniversaries/anniv-balloon.png'),
}

export const anniversaryIconLabels: Record<AnniversaryIconKey, string> = {
  heart: '爱心', star: '星星', cake: '蛋糕', paw: '爪印', balloon: '气球',
}
```

- [ ] **Step 2: AnniversaryForm**

`AnniversaryForm.tsx`（使用 `@tarojs/components` 的 View/Text/Input/Picker/Button/Image）：

```tsx
import { useState } from 'react'
import { Button, Image, Input, Picker, Text, View } from '@tarojs/components'
import type { AnniversaryInput, AnniversaryRepeat } from '../../services/socialApi'
import { anniversaryIconKeys, anniversaryIconLabels, anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import './MiniappCalendarView.scss'

interface AnniversaryFormProps {
  defaultDay: string
  withDatePicker?: boolean
  initial?: AnniversaryInput
  saving: boolean
  onSubmit(input: AnniversaryInput): void
  onCancel(): void
  onDelete?: () => void
}

export function AnniversaryForm({ defaultDay, withDatePicker, initial, saving, onSubmit, onCancel, onDelete }: AnniversaryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState<AnniversaryIconKey>((initial?.icon as AnniversaryIconKey) ?? 'heart')
  const [note, setNote] = useState(initial?.note ?? '')
  const [day, setDay] = useState(initial?.day ?? defaultDay)
  const [repeatRule, setRepeatRule] = useState<AnniversaryRepeat>(initial?.repeatRule ?? 'yearly')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({ name: trimmed.slice(0, 20), icon, note: note.trim().slice(0, 50), day, repeatRule })
  }

  return (
    <View className="anniv-form">
      <Text className="anniv-form__title">{initial ? '编辑纪念日' : '设置纪念日'}</Text>
      {withDatePicker && (
        <Picker mode="date" value={day} onChange={(event) => setDay(event.detail.value)}>
          <View className="anniv-form__field"><Text className="anniv-form__label">日期</Text><Text className="anniv-form__value">{day}</Text></View>
        </Picker>
      )}
      {!withDatePicker && <View className="anniv-form__field"><Text className="anniv-form__label">日期</Text><Text className="anniv-form__value">{defaultDay}</Text></View>}
      <View className="anniv-form__field">
        <Text className="anniv-form__label">名称</Text>
        <Input className="anniv-form__input" value={name} maxlength={20} placeholder="例如：恋爱纪念日" onInput={(event) => setName(event.detail.value)} />
      </View>
      <View className="anniv-form__icons">
        {anniversaryIconKeys.map((key) => (
          <Button key={key} className={`anniv-form__icon-item${icon === key ? ' anniv-form__icon-item--active' : ''}`} onClick={() => setIcon(key)}>
            <Image className="anniv-form__icon-img" src={anniversaryIcons[key]} mode="aspectFit" />
            <Text className="anniv-form__icon-label">{anniversaryIconLabels[key]}</Text>
          </Button>
        ))}
      </View>
      <View className="anniv-form__field">
        <Text className="anniv-form__label">说明（可选）</Text>
        <Input className="anniv-form__input" value={note} maxlength={50} placeholder="写点什么…" onInput={(event) => setNote(event.detail.value)} />
      </View>
      <View className="anniv-form__repeat">
        <Button className={repeatRule === 'yearly' ? 'anniv-form__repeat-item--active' : 'anniv-form__repeat-item'} onClick={() => setRepeatRule('yearly')}>每年重复</Button>
        <Button className={repeatRule === 'none' ? 'anniv-form__repeat-item--active' : 'anniv-form__repeat-item'} onClick={() => setRepeatRule('none')}>不重复</Button>
      </View>
      <View className="anniv-form__actions">
        <Button className="anniv-form__btn anniv-form__btn--ghost" onClick={onCancel}>取消</Button>
        {onDelete && <Button className="anniv-form__btn anniv-form__btn--danger" disabled={saving} onClick={onDelete}>删除</Button>}
        <Button className="anniv-form__btn anniv-form__btn--primary" disabled={saving || !name.trim()} onClick={submit}>{saving ? '保存中…' : '保存'}</Button>
      </View>
    </View>
  )
}
```

注意：编辑态传入的 `initial` 为完整 `AnniversaryInput`（含 day），表单内 `day` 初始值用 `initial?.day ?? defaultDay`；日期弹窗入口创建时 `withDatePicker` 为 false（日期固定），纪念日分页添加入口为 true。

- [ ] **Step 3: 表单样式**

`MiniappCalendarView.scss` 末尾追加（风格对齐 `.mood-modal`）：

```scss
.anniv-form { display: flex; flex-direction: column; gap: 20rpx; padding-top: 8rpx; }
.anniv-form__title { text-align: center; color: #382b23; font-size: var(--font-size-overlay-title); font-weight: var(--font-weight-bold); }
.anniv-form__field { display: flex; flex-direction: column; gap: 8rpx; padding: 12rpx 20rpx; background: #fff; border: 1px solid #ead5c2; border-radius: 16rpx; }
.anniv-form__label { color: #b18c79; font-size: var(--font-size-aux); }
.anniv-form__value { color: #5e3b1d; font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); }
.anniv-form__input { color: #5e3b1d; font-size: var(--font-size-body); }
.anniv-form__icons { display: flex; justify-content: space-between; gap: 8rpx; }
.anniv-form__icon-item { display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 12rpx 0; background: transparent; border: 0; border-radius: 16rpx; }
.anniv-form__icon-item::after { border: 0; }
.anniv-form__icon-item--active { background: #fbeadd; }
.anniv-form__icon-img { width: 72rpx; height: 72rpx; }
.anniv-form__icon-label { color: #8e776a; font-size: var(--font-size-aux); }
.anniv-form__repeat { display: flex; gap: 16rpx; }
.anniv-form__repeat-item, .anniv-form__repeat-item--active { flex: 1; margin: 0; padding: 12rpx 0; color: #8e776a; background: #fff; border: 1px solid #ead5c2; border-radius: 999rpx; font-size: var(--font-size-secondary); }
.anniv-form__repeat-item--active { color: #8a4f37; background: #fbeadd; border-color: #d9b896; font-weight: var(--font-weight-semibold); }
.anniv-form__actions { display: flex; gap: 16rpx; }
.anniv-form__btn { flex: 1; margin: 0; padding: 14rpx 0; border-radius: 999rpx; font-size: var(--font-size-body); }
.anniv-form__btn--primary { color: #fff; background: #d9845d; border: 0; }
.anniv-form__btn--ghost { color: #8e776a; background: #fff; border: 1px solid #ead5c2; }
.anniv-form__btn--danger { color: #c0564f; background: #fff; border: 1px solid #e8c0bc; }
```

- [ ] **Step 4: Commit**

```powershell
git add miniapp/src/features/main/anniversaryAssets.ts miniapp/src/features/main/AnniversaryForm.tsx miniapp/src/features/main/MiniappCalendarView.scss; git commit -m "feat: 纪念日图标资源映射与新建编辑表单组件"
```

---

### Task 9: 日期弹窗（心情 + 纪念日）与日历徽标

**Files:**
- Create: `miniapp/src/features/main/DayModal.tsx`
- Modify: `miniapp/src/features/main/MiniappCalendarView.tsx`
- Modify: `miniapp/src/features/main/MiniappCalendarView.scss`

- [ ] **Step 1: DayModal 组件**

`DayModal.tsx`：接收 props 渲染 `MiniappModal`，内含心情区（今天选择 / 过去查看 / 未来不显示）与纪念日区（列表 + 新建入口）：

```tsx
import { Button, Image, Text, View } from '@tarojs/components'
import { MiniappModal } from '../../components/MiniappModal'
import type { MiniappAnniversary } from '../../services/socialApi'
import { anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import type { DayMoods } from './calendarModel'
import './MiniappCalendarView.scss'

const moodIcons = [
  require('../assets/moods/mood-1.png'),
  require('../assets/moods/mood-2.png'),
  require('../assets/moods/mood-3.png'),
  require('../assets/moods/mood-4.png'),
]
const moodLabels = ['低落', '一般', '不错', '特别好']

interface DayModalProps {
  day: string
  phase: 'today' | 'past' | 'future'
  dayMoods?: DayMoods
  friendName: string
  anniversaries: MiniappAnniversary[]
  saving: boolean
  onPickMood(level: number): void
  onCreateAnniversary(): void
  onEditAnniversary(item: MiniappAnniversary): void
  onClose(): void
}

export function DayModal({ day, phase, dayMoods, friendName, anniversaries, saving, onPickMood, onCreateAnniversary, onEditAnniversary, onClose }: DayModalProps) {
  const title = phase === 'today' ? '今天' : `${Number(day.slice(5, 7))}月${Number(day.slice(8, 10))}日`
  return (
    <MiniappModal onClose={onClose}>
      <View className="mood-modal">
        <Text className="mood-modal__title">{title}</Text>
        {phase === 'today' && (
          <View className="mood-modal__grid">
            {moodLabels.map((label, index) => (
              <Button key={label} className="mood-modal__item" disabled={saving} onClick={() => onPickMood(index + 1)}>
                <Image className="mood-modal__icon" src={moodIcons[index]} mode="aspectFill" />
                <Text className="mood-modal__label">{label}</Text>
              </Button>
            ))}
          </View>
        )}
        {phase === 'past' && (
          <View className="mood-modal__rows">
            <View className="mood-modal__row">
              <Text className="mood-modal__who">我</Text>
              {dayMoods?.mine
                ? <><Image className="mood-modal__row-icon" src={moodIcons[dayMoods.mine.level - 1]} mode="aspectFill" /><Text className="mood-modal__row-label">{moodLabels[dayMoods.mine.level - 1]}</Text></>
                : <Text className="mood-modal__row-label mood-modal__row-label--none">未记录</Text>}
            </View>
            <View className="mood-modal__row">
              <Text className="mood-modal__who">{friendName || '好友'}</Text>
              {dayMoods?.friend
                ? <><Image className="mood-modal__row-icon" src={moodIcons[dayMoods.friend.level - 1]} mode="aspectFill" /><Text className="mood-modal__row-label">{moodLabels[dayMoods.friend.level - 1]}</Text></>
                : <Text className="mood-modal__row-label mood-modal__row-label--none">未记录</Text>}
            </View>
          </View>
        )}
        {phase === 'today' && <Text className="mood-modal__tip">记录后，{friendName || '好友'}也能在日历上看到你的心情</Text>}

        <View className="day-modal__anniv">
          <Text className="day-modal__anniv-title">纪念日</Text>
          {anniversaries.length === 0
            ? <Button className="day-modal__anniv-add" onClick={onCreateAnniversary}>为这一天设置纪念日</Button>
            : anniversaries.map((item) => (
              <View key={item.id} className="day-modal__anniv-row" onClick={() => onEditAnniversary(item)}>
                <Image className="day-modal__anniv-icon" src={anniversaryIcons[item.icon as AnniversaryIconKey] ?? anniversaryIcons.heart} mode="aspectFit" />
                <View className="day-modal__anniv-text">
                  <Text className="day-modal__anniv-name">{item.name}</Text>
                  {item.note ? <Text className="day-modal__anniv-note">{item.note}</Text> : null}
                </View>
              </View>
            ))}
          {anniversaries.length > 0 && <Button className="day-modal__anniv-add day-modal__anniv-add--ghost" onClick={onCreateAnniversary}>再加一个</Button>}
        </View>
      </View>
    </MiniappModal>
  )
}
```

样式追加到 `MiniappCalendarView.scss`：

```scss
.day-modal__anniv { display: flex; flex-direction: column; gap: 16rpx; width: 100%; margin-top: 12rpx; padding-top: 20rpx; border-top: 1px dashed #ead5c2; }
.day-modal__anniv-title { color: #b18c79; font-size: var(--font-size-aux); }
.day-modal__anniv-row { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 16rpx; background: #fff; border: 1px solid #ead5c2; border-radius: 16rpx; }
.day-modal__anniv-icon { width: 64rpx; height: 64rpx; }
.day-modal__anniv-text { display: flex; flex-direction: column; gap: 4rpx; }
.day-modal__anniv-name { color: #5e3b1d; font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); }
.day-modal__anniv-note { color: #a89489; font-size: var(--font-size-aux); }
.day-modal__anniv-add { margin: 0; padding: 14rpx 0; color: #fff; background: #d9845d; border: 0; border-radius: 999rpx; font-size: var(--font-size-body); }
.day-modal__anniv-add--ghost { color: #8a4f37; background: #fff; border: 1px solid #ead5c2; }
```

- [ ] **Step 2: CalendarView 接入纪念日数据与弹窗**

`MiniappCalendarView.tsx` 修改要点（保持现有心情/运势逻辑不动）：

1. import：`socialApi` 类型加 `MiniappAnniversary, AnniversaryInput`；引入 `matchesDay` from `./anniversaryModel`；引入 `DayModal`、`AnniversaryForm`、`anniversaryIcons/AnniversaryIconKey`。删除文件内 `MoodDayRows` 与 `MoodModalState`（迁移至 DayModal）。
2. 新增 state：

```ts
const [anniversaries, setAnniversaries] = useState<MiniappAnniversary[]>([])
const [dayModal, setDayModal] = useState<string | null>(null)
const [annivForm, setAnnivForm] = useState<{ day: string; edit?: MiniappAnniversary } | null>(null)
```

3. `moodRoomId` 变化时加载纪念日（与 moods 并列的 useEffect）：

```ts
useEffect(() => {
  if (!moodRoomId) { setAnniversaries([]); return }
  void socialApi.listAnniversaries(moodRoomId).then(setAnniversaries).catch(() => setAnniversaries([]))
}, [moodRoomId])
```

4. `openDay` 放开：`const openDay = (key: string) => setDayModal(key)`。
5. 纪念日 CRUD：

```ts
const submitAnniversary = async (input: AnniversaryInput) => {
  if (!moodRoomId || saving) return
  setSaving(true)
  try {
    if (annivForm?.edit) {
      const updated = await socialApi.updateAnniversary(moodRoomId, annivForm.edit.id, input)
      setAnniversaries((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } else {
      const created = await socialApi.createAnniversary(moodRoomId, input)
      setAnniversaries((current) => [...current, created])
    }
    setAnnivForm(null)
  } catch (error) {
    Taro.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' })
  } finally { setSaving(false) }
}

const removeAnniversary = async () => {
  if (!moodRoomId || !annivForm?.edit || saving) return
  setSaving(true)
  try {
    await socialApi.deleteAnniversary(moodRoomId, annivForm.edit.id)
    setAnniversaries((current) => current.filter((item) => item.id !== annivForm.edit?.id))
    setAnnivForm(null)
  } catch (error) {
    Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
  } finally { setSaving(false) }
}
```

6. 日历徽标：格子里日期数字包一层相对定位容器，叠加第一个匹配的纪念日图标：

```tsx
const dayAnniversary = anniversaries.find((item) => matchesDay(item, key))
...
<View className="miniapp-calendar__num-wrap">
  {isToday
    ? <Text className="miniapp-calendar__num miniapp-calendar__num--today">今天</Text>
    : <Text className="miniapp-calendar__num">{day}</Text>}
  {dayAnniversary && <Image className="miniapp-calendar__anniv-badge" src={anniversaryIcons[dayAnniversary.icon as AnniversaryIconKey] ?? anniversaryIcons.heart} mode="aspectFit" />}
</View>
```

样式：

```scss
.miniapp-calendar__num-wrap { position: relative; display: flex; justify-content: center; }
.miniapp-calendar__anniv-badge { position: absolute; top: -12rpx; right: -24rpx; width: 32rpx; height: 32rpx; }
```

7. 渲染弹窗：`dayModal` 存在时渲染 `DayModal`（`phase`：`dayModal === currentDay ? 'today' : dayModal < currentDay ? 'past' : 'future'`；`anniversaries` 过滤 `matchesDay(item, dayModal)`；`onPickMood` 复用 `saveMood`）；`annivForm` 存在时渲染 `MiniappModal` 包 `AnniversaryForm`（`defaultDay={annivForm.day}`，`initial={annivForm.edit}`，编辑态传 `onDelete={removeAnniversary}`）。两个弹窗互斥：打开表单时先关日期弹窗。

- [ ] **Step 3: 编译检查**

Run: `cd d:\Pet10\miniapp; npm test; npx tsc --noEmit -p tsconfig.json`
Expected: PASS、无类型错误

- [ ] **Step 4: Commit**

```powershell
git add miniapp/src/features/main; git commit -m "feat: 日期弹窗支持纪念日设置查看并添加日历徽标"
```

---

### Task 10: 小记分页「日历｜纪念日」

**Files:**
- Create: `miniapp/src/features/main/AnniversaryListView.tsx`
- Modify: `miniapp/src/features/main/MiniappCalendarView.tsx`
- Modify: `miniapp/src/features/main/MiniappCalendarView.scss`

- [ ] **Step 1: AnniversaryListView**

```tsx
import { Button, Image, Text, View } from '@tarojs/components'
import type { MiniappAnniversary } from '../../services/socialApi'
import { anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import { sortAnniversaries, statsLines } from './anniversaryModel'
import './MiniappCalendarView.scss'

interface AnniversaryListViewProps {
  items: MiniappAnniversary[]
  today: Date
  onAdd(): void
  onEdit(id: string): void
}

export function AnniversaryListView({ items, today, onAdd, onEdit }: AnniversaryListViewProps) {
  const sorted = sortAnniversaries(items, today)
  return (
    <View className="anniv-list">
      {sorted.length === 0 && (
        <View className="anniv-list__empty">
          <Text>还没有纪念日，把重要的日子记下来吧。</Text>
        </View>
      )}
      {sorted.map((item) => (
        <View key={item.id} className="anniv-list__card" onClick={() => onEdit(item.id)}>
          <Image className="anniv-list__icon" src={anniversaryIcons[item.icon as AnniversaryIconKey] ?? anniversaryIcons.heart} mode="aspectFit" />
          <View className="anniv-list__body">
            <View className="anniv-list__head">
              <Text className="anniv-list__name">{item.name}</Text>
              <Text className="anniv-list__day">{item.day}</Text>
            </View>
            {item.note ? <Text className="anniv-list__note">{item.note}</Text> : null}
            {statsLines(item, today).map((line) => (
              <Text key={line} className="anniv-list__stats">{line}</Text>
            ))}
          </View>
        </View>
      ))}
      <Button className="anniv-list__add" onClick={onAdd}>+ 添加纪念日</Button>
    </View>
  )
}
```

样式：

```scss
.anniv-list { display: flex; flex-direction: column; gap: 20rpx; padding-top: 8rpx; }
.anniv-list__empty { padding: 60rpx 0; color: #a89489; font-size: var(--font-size-secondary); text-align: center; }
.anniv-list__card { display: flex; gap: 20rpx; padding: 24rpx; background: #fff; border: 1px solid #ead5c2; border-radius: 20rpx; box-shadow: 0 7px 20px rgba(70, 48, 37, .05); }
.anniv-list__icon { width: 88rpx; height: 88rpx; }
.anniv-list__body { display: flex; flex: 1; flex-direction: column; gap: 6rpx; }
.anniv-list__head { display: flex; align-items: baseline; justify-content: space-between; }
.anniv-list__name { color: #5e3b1d; font-size: var(--font-size-card-title); font-weight: var(--font-weight-bold); }
.anniv-list__day { color: #b49a8d; font-size: var(--font-size-aux); }
.anniv-list__note { color: #a89489; font-size: var(--font-size-aux); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anniv-list__stats { color: #d9845d; font-size: var(--font-size-secondary); font-weight: var(--font-weight-medium); }
.anniv-list__add { margin-top: 8rpx; padding: 16rpx 0; color: #fff; background: #d9845d; border: 0; border-radius: 999rpx; font-size: var(--font-size-body); }
```

- [ ] **Step 2: CalendarView 分段分页**

`MiniappCalendarView.tsx`：

1. 新增 state：`const [tab, setTab] = useState<'calendar' | 'anniversary'>('calendar')`。
2. header 之后插入分段控件：

```tsx
<View className="miniapp-calendar__tabs">
  <Button className={tab === 'calendar' ? 'miniapp-calendar__tab miniapp-calendar__tab--active' : 'miniapp-calendar__tab'} onClick={() => setTab('calendar')}>日历</Button>
  <Button className={tab === 'anniversary' ? 'miniapp-calendar__tab miniapp-calendar__tab--active' : 'miniapp-calendar__tab'} onClick={() => setTab('anniversary')}>纪念日</Button>
</View>
```

3. `tab === 'calendar'` 时渲染现有月份栏/星期栏/格子/图例/今日运势；`tab === 'anniversary'` 时渲染：

```tsx
<AnniversaryListView
  items={anniversaries}
  today={today}
  onAdd={() => setAnnivForm({ day: currentDay })}
  onEdit={(id) => {
    const item = anniversaries.find((entry) => entry.id === id)
    if (item) setAnnivForm({ day: item.day, edit: item })
  }}
/>
```

注意：添加入口的 `AnniversaryForm` 需要 `withDatePicker`，`annivForm` state 增加 `pickDay?: boolean` 标记：列表页「+ 添加」走 `setAnnivForm({ day: currentDay, pickDay: true })`；渲染表单时传 `withDatePicker={annivForm.pickDay}`。日期弹窗的「设置纪念日」不带选择器（日期固定）。

4. 样式：

```scss
.miniapp-calendar__tabs { display: flex; gap: 16rpx; justify-content: center; padding: 0 0 20rpx; }
.miniapp-calendar__tab { min-width: 160rpx; margin: 0; padding: 10rpx 0; color: #8e776a; background: #fff; border: 1px solid #ead5c2; border-radius: 999rpx; font-size: var(--font-size-body); }
.miniapp-calendar__tab::after { border: 0; }
.miniapp-calendar__tab--active { color: #fff; background: #d9845d; border-color: #d9845d; font-weight: var(--font-weight-semibold); }
```

- [ ] **Step 3: 验证**

Run: `cd d:\Pet10\miniapp; npm test; npx tsc --noEmit -p tsconfig.json`
Expected: PASS

- [ ] **Step 4: Commit**

```powershell
git add miniapp/src/features/main; git commit -m "feat: 小记新增日历与纪念日分页及倒计时列表"
```

---

### Task 11: 全链路验证与重编译

- [ ] **Step 1: 服务端全量测试**

Run: `cd d:\Pet10\server; npm test`
Expected: 全部 PASS

- [ ] **Step 2: 小程序全量测试**

Run: `cd d:\Pet10\miniapp; npm test`
Expected: 全部 PASS

- [ ] **Step 3: 清缓存 + 重新编译（miniapp 变更规则）**

```powershell
Remove-Item -Recurse -Force d:\Pet10\miniapp\dist -ErrorAction SilentlyContinue; cd d:\Pet10\miniapp; npm run build:weapp
& "D:\Tecent\微信web开发者工具\cli.bat" cache --clean all --project "d:\Pet10\miniapp" --lang zh
& "D:\Tecent\微信web开发者工具\cli.bat" close --project "d:\Pet10\miniapp"
& "D:\Tecent\微信web开发者工具\cli.bat" open --project "d:\Pet10\miniapp"
```

Expected: 编译成功，`miniapp/dist` 包含 `assets/anniversaries` 五个图标；开发者工具重新打开并自动编译。

- [ ] **Step 4: 根目录 verify:full**

Run: `cd d:\Pet10; npm run verify:full`
Expected: PASS（若 asset-manifest 相关检查报新图标未登记，按其提示更新 `docs/assets/asset-manifest.json/md`——仅当检查覆盖 miniapp 资源时）

- [ ] **Step 5: 报告**

向用户报告：执行的命令与结果、预览方式（微信开发者工具）、未验证项（如生产数据库迁移需服务端重启时自动执行）、请求视觉验收。

---

## Self-Review 结论

- Spec 覆盖：图标放大（Task 7）、弹窗升级（Task 9）、徽标（Task 9）、分页与倒计时（Task 10）、服务端表/接口（Task 1-4）、图标资源（Task 6）、测试（各 TDD 步骤）——全部有对应任务。
- 类型一致性：服务端 `Anniversary.repeatRule` ↔ 路由 zod `repeatRule` ↔ 小程序 `MiniappAnniversary.repeatRule` / `AnniversaryRecord.repeatRule` 全链路统一。
- 已知简化：纪念日变更不做 WebSocket 实时推送（另一端下次进入小记时刷新），符合 spec 非目标。
