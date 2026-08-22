# 无好友小窝空状态「小多利的信」+ 初见纪念 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 无好友用户进入小窝时看到小多利的信与功能预告，好友接受邀请时自动生成「初见纪念」记忆。

**Architecture:** 小程序端新增纯展示组件 `MiniappNestLetter`，由 `miniappViewModel` 的纯函数 `getNestSceneMode` 决定空/加载/正常三种场景渲染；服务端在 `invitationService.accept` 成功路径收口处通过现有 `memories` 仓库写入纪念，不新增 API。

**Tech Stack:** Taro 4 + React 18（小程序端）、Express + vitest（服务端）、SCSS（rpx 单位）。

**规格文档:** `docs/superpowers/specs/2026-08-22-nest-empty-friend-invite-design.md`

**重要约定:**
- Git 提交信息使用中文。
- 小程序改动落在 `miniapp/`；服务端改动是本设计明确确认的例外。
- 小程序端无组件渲染测试设施（无 jsdom/@testing-library），组件层通过类型检查、构建与微信开发者工具预览验收；可测逻辑一律下沉到 view-model 纯函数做单测。

---

### Task 1: 服务端「初见纪念」写入

**Files:**
- Modify: `server/src/services/invitationService.ts`
- Test: `server/src/services/invitationService.test.ts`

- [ ] **Step 1: 写失败测试**

在 `server/src/services/invitationService.test.ts` 的 `describe('invitation service', ...)` 末尾追加：

```ts
  it('writes a first-meeting memory when the invitation is accepted', async () => {
    const repositories = createMemoryRepositories()
    const inviter = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: '小A' })
    const invitee = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: '小B' })
    const service = createInvitationService(repositories, { ttlSeconds: 3600 })
    const invitation = await service.create(inviter.id)

    const accepted = await service.accept(invitation.token, invitee.id)
    const memories = await repositories.memories.listByRoom(accepted.room.id)

    expect(memories).toHaveLength(1)
    expect(memories[0].text).toBe('小多利见证了 小B 和 小A 的初次见面，从今天起一起住在这个小窝里。')
    expect(memories[0].category).toBe('relationship')
    expect(memories[0].source).toBe('explicit')
    expect(memories[0].importance).toBe(3)
  })
```

- [ ] **Step 2: 运行测试确认失败**

Run: `Set-Location d:\Pet10\server; npx vitest run src/services/invitationService.test.ts`
Expected: FAIL，新用例断言 `memories` 长度为 0（当前 accept 不写纪念）。

- [ ] **Step 3: 实现纪念写入**

修改 `server/src/services/invitationService.ts`：

在 `createInvitationService` 函数之前新增模块级辅助函数：

```ts
async function writeFirstMeetingMemory(
  repositories: RepositoryBundle,
  roomId: string,
  inviterId: string,
  accepterId: string
) {
  const [inviter, accepter] = await Promise.all([
    repositories.users.findById(inviterId),
    repositories.users.findById(accepterId)
  ])
  const inviterName = inviter?.displayName?.trim() || '好友'
  const accepterName = accepter?.displayName?.trim() || '好友'
  await repositories.memories.create({
    roomId,
    text: `小多利见证了 ${accepterName} 和 ${inviterName} 的初次见面，从今天起一起住在这个小窝里。`,
    canMention: true,
    category: 'relationship',
    importance: 3,
    source: 'explicit'
  })
}
```

将 `accept` 方法整体替换为（两条成功路径收口后统一写纪念）：

```ts
    async accept(token: string, accepterId: string) {
      const invitation = await repositories.invitations.findByToken(token)
      if (!invitation) throw new Error('invitation_not_found')
      if (invitation.inviterId === accepterId) throw new Error('cannot_invite_self')
      if (invitation.status !== 'pending') throw new Error('invitation_unavailable')
      if (invitation.expiresAt.getTime() <= Date.now()) throw new Error('invitation_expired')
      if (await repositories.relationships.findBetweenUsers(invitation.inviterId, accepterId)) {
        throw new Error('relationship_already_exists')
      }
      const accepted = repositories.invitations.acceptPair
        ? await repositories.invitations.acceptPair(token, accepterId)
        : await (async () => {
            const relationship = await repositories.relationships.create(invitation.inviterId, accepterId)
            const room = await repositories.rooms.createForRelationship(relationship.id)
            const pet = await repositories.pets.createForRelationship(relationship.id, room.id)
            await repositories.invitations.accept(token, accepterId)
            return { invitation, relationship, room, pet }
          })()
      await writeFirstMeetingMemory(repositories, accepted.room.id, invitation.inviterId, accepterId)
      return accepted
    },
```

- [ ] **Step 4: 运行测试确认通过**

Run: `Set-Location d:\Pet10\server; npx vitest run src/services/invitationService.test.ts`
Expected: PASS（4 个用例全过）。再跑全量服务端测试确保无回归：
Run: `npx vitest run`（仍在 `server/` 目录）
Expected: 全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add server/src/services/invitationService.ts server/src/services/invitationService.test.ts
git commit -m "feat: 好友接受邀请时自动生成初见纪念"
```

---

### Task 2: 小程序 view-model 场景判定函数

**Files:**
- Modify: `miniapp/src/features/main/miniappViewModel.ts`
- Test: `miniapp/src/features/main/miniappViewModel.test.ts`

- [ ] **Step 1: 写失败测试**

在 `miniappViewModel.test.ts` 顶部现有的 `from './miniappViewModel'` 导入语句中追加 `getNestSceneMode`，并新增两个类型导入：

```ts
import type { LaunchContext } from '../../services/launchContextApi'
import type { PetState } from '../../domain/types'
```

并在 `describe` 内追加用例：

```ts
  it('derives the nest scene mode from context and pet', () => {
    const emptyContext = { rooms: [] } as unknown as LaunchContext
    const roomContext = { rooms: [{ id: 'room-1' }] } as unknown as LaunchContext
    const pet = {} as PetState

    expect(getNestSceneMode(null, null)).toBe('loading')
    expect(getNestSceneMode(emptyContext, null)).toBe('empty')
    expect(getNestSceneMode(roomContext, null)).toBe('loading')
    expect(getNestSceneMode(roomContext, pet)).toBe('active')
  })
```

- [ ] **Step 2: 运行测试确认失败**

Run: `Set-Location d:\Pet10\miniapp; npx vitest run src/features/main/miniappViewModel.test.ts`
Expected: FAIL，报 `getNestSceneMode` 未定义/未导出。

- [ ] **Step 3: 实现函数**

在 `miniapp/src/features/main/miniappViewModel.ts` 顶部追加类型导入：

```ts
import type { LaunchContext } from '../../services/launchContextApi'
import type { PetState } from '../../domain/types'
```

文件末尾追加：

```ts
export type NestSceneMode = 'loading' | 'empty' | 'active'

export function getNestSceneMode(context: LaunchContext | null, pet: PetState | null): NestSceneMode {
  if (!context) return 'loading'
  if (context.rooms.length === 0) return 'empty'
  return pet ? 'active' : 'loading'
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/features/main/miniappViewModel.test.ts`
Expected: PASS（含既有用例全部通过）。

- [ ] **Step 5: 提交**

```bash
git add miniapp/src/features/main/miniappViewModel.ts miniapp/src/features/main/miniappViewModel.test.ts
git commit -m "feat: 小窝场景模式判定函数（加载中/空状态/正常）"
```

---

### Task 3: 「小多利的信」展示组件

**Files:**
- Create: `miniapp/src/features/main/MiniappNestLetter.tsx`
- Create: `miniapp/src/features/main/MiniappNestLetter.scss`

说明：纯展示组件，无 props、无请求、无状态；文案为常量。小程序无组件渲染测试设施，本任务以类型检查与预览验收代替单测。

- [ ] **Step 1: 创建组件文件 `MiniappNestLetter.tsx`**

```tsx
import { Image, Text, View } from '@tarojs/components'
import './MiniappNestLetter.scss'

const petAvatar = require('../../assets/xiaoduoli.png')

const LETTER_PARAGRAPHS = [
  '你好呀，我是小多利。有点粘人，老实巴交，喜欢出去玩和吃东西，最擅长等重要的人回家——全年无休，从不迟到。',
  '窝已经收拾好了，阳光正好，只是还差一个空位。如果你邀请一位对你重要的人来，从那天起，你们可以一起喂我、一起玩五子棋、一起回答每日暗号。',
  '初见那天，我会把它认真记成一条纪念。'
]

export function MiniappNestLetter() {
  return (
    <View className="nest-letter">
      <Image className="nest-letter__avatar" src={petAvatar} mode="aspectFit" fadeIn={false} />
      <View className="nest-letter__card">
        <Text className="nest-letter__greeting">给还没来的家人：</Text>
        {LETTER_PARAGRAPHS.map((paragraph) => (
          <Text key={paragraph} className="nest-letter__paragraph">{paragraph}</Text>
        ))}
        <Text className="nest-letter__sign">—— 小多利</Text>
      </View>
      <Text className="nest-letter__preview">成为好友后：共享聊天 · 每日暗号 · 初见纪念</Text>
    </View>
  )
}
```

- [ ] **Step 2: 创建样式文件 `MiniappNestLetter.scss`**

```scss
.nest-letter {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 8rpx;

  &__avatar {
    width: 128rpx;
    height: 128rpx;
    margin-bottom: 16rpx;
  }

  &__card {
    width: 100%;
    background: #fffaf6;
    border-radius: 28rpx;
    padding: 40rpx 36rpx;
    box-shadow: 0 8rpx 24rpx rgba(122, 96, 68, 0.08);
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__greeting {
    font-size: 30rpx;
    font-weight: 600;
    color: #5b4632;
  }

  &__paragraph {
    font-size: 28rpx;
    line-height: 1.8;
    color: #6b5b4a;
  }

  &__sign {
    align-self: flex-end;
    font-size: 26rpx;
    color: #a08c74;
  }

  &__preview {
    margin-top: 24rpx;
    font-size: 24rpx;
    color: #a08c74;
  }
}
```

- [ ] **Step 3: 类型检查**

Run: `Set-Location d:\Pet10\miniapp; npx tsc --noEmit -p tsconfig.json`
Expected: 无错误输出。

- [ ] **Step 4: 提交**

```bash
git add miniapp/src/features/main/MiniappNestLetter.tsx miniapp/src/features/main/MiniappNestLetter.scss
git commit -m "feat: 新增小多利的信空状态展示组件"
```

---

### Task 4: MiniappNestView 接入空状态渲染

**Files:**
- Modify: `miniapp/src/features/main/MiniappNestView.tsx`

- [ ] **Step 1: 增加 import**

在现有 import 区追加：

```ts
import { MiniappNestLetter } from './MiniappNestLetter'
import { getNestSceneMode } from './miniappViewModel'
```

- [ ] **Step 2: 计算场景模式**

在组件 `return (` 之前追加：

```ts
  const sceneMode = getNestSceneMode(context, pet)
```

- [ ] **Step 3: 替换场景区渲染**

将原场景区：

```tsx
      <View className="miniapp-nest__scene">
        {pet
          ? <PetStatusCard pet={pet} onOpenMemories={onOpenMemories} />
          : <Image className="miniapp-nest__empty" src={roomBackground} mode="aspectFill" fadeIn={false} />}

        <View className="miniapp-nest__shortcuts">
          <View className="miniapp-nest__shortcut">
            <Image src={wardrobe} mode="aspectFit" />
          </View>
          <View className="miniapp-nest__shortcut">
            <Image src={photoWall} mode="aspectFit" />
          </View>
          <View className="miniapp-nest__shortcut">
            <Image src={tasks} mode="aspectFit" />
          </View>
        </View>
      </View>
```

替换为：

```tsx
      <View className="miniapp-nest__scene">
        {sceneMode === 'active' && pet
          ? <PetStatusCard pet={pet} onOpenMemories={onOpenMemories} />
          : sceneMode === 'empty'
            ? <MiniappNestLetter />
            : <Image className="miniapp-nest__empty" src={roomBackground} mode="aspectFill" fadeIn={false} />}

        {sceneMode === 'active' && (
          <View className="miniapp-nest__shortcuts">
            <View className="miniapp-nest__shortcut">
              <Image src={wardrobe} mode="aspectFit" />
            </View>
            <View className="miniapp-nest__shortcut">
              <Image src={photoWall} mode="aspectFit" />
            </View>
            <View className="miniapp-nest__shortcut">
              <Image src={tasks} mode="aspectFit" />
            </View>
          </View>
        )}
      </View>
```

- [ ] **Step 4: 类型检查与单测回归**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无错误。
Run: `npx vitest run`
Expected: 全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add miniapp/src/features/main/MiniappNestView.tsx
git commit -m "feat: 无好友时小窝展示小多利的信并隐藏快捷入口"
```

---

### Task 5: 清缓存重新编译并预览验收

- [ ] **Step 1: 删除旧构建产物并重新编译**

Run（PowerShell）:
```powershell
Set-Location d:\Pet10\miniapp
if (Test-Path dist) { Remove-Item dist -Recurse -Force }
if (Test-Path node_modules\.cache) { Remove-Item node_modules\.cache -Recurse -Force }
npm run build:weapp
```
Expected: Taro 编译成功，`miniapp/dist` 生成最新产物。

- [ ] **Step 2: 微信开发者工具预览（用户验收）**

在微信开发者工具中打开项目，执行「清缓存 → 清除全部缓存」后重新编译。验收点：
1. 无好友账号进入小窝：显示小多利头像 + 信件卡片 + 预告行，无衣柜/照片墙/任务图标。
2. 底部按钮文案为「邀请好友一起养一只小多利吧~」。
3. 通过 GM 工具添加测试好友后：小窝恢复正常场景（状态卡 + 快捷图标）。
4. 接受邀请流程后打开记忆面板：能看到「初见纪念」条目。
Expected: 用户确认视觉与流程符合预期（视觉变更须用户验收）。

---

### Task 6: 文档同步与最终验证

**Files:**
- Modify: `docs/features/wechat-auth-and-multi-room.md`

- [ ] **Step 1: 更新功能文档**

在 `docs/features/wechat-auth-and-multi-room.md` 的「无邀请进入」一节的页面文案示例之后追加一段：

```markdown
当前实现中，准备中的小窝以小多利的一封信作为空状态主体（头像 + 信件卡片 + 「成为好友后：共享聊天 · 每日暗号 · 初见纪念」预告行），空状态下隐藏衣柜、照片墙与任务快捷入口。邀请被接受时，服务端会为新房间自动写入一条「初见纪念」记忆（category 为 relationship、importance 最高），双方在记忆面板可见。
```

- [ ] **Step 2: 全量验证**

Run: `Set-Location d:\Pet10; npm run verify:full`
Expected: 全部检查通过。

- [ ] **Step 3: 提交**

```bash
git add docs/features/wechat-auth-and-multi-room.md
git commit -m "docs: 补充准备中的小窝信件空状态与初见纪念说明"
```
