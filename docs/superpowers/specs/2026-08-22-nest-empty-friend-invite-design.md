# 无好友小窝空状态「小多利的信」+ 初见纪念 设计

日期：2026-08-22
状态：已确认（brainstorming 结论）

## 背景与目标

当前无好友用户进入小窝页时，只看到一张空房间背景图、三个不可用的快捷图标和底部的邀请分享按钮，页面没有传达"添加好友之后会得到什么"，邀请动机弱。

目标：用情感叙事 + 明确回报提升用户邀请好友的意愿。

策略（brainstorming 中确认）：

- 方向：A 情感陪伴型 + D 目标激励型结合。
- 版式：选定「一封信」——小多利口吻的信件作为空状态页面主体（对比过场景叙事卡、三步引导卡）。
- 激励形式：选定「初见纪念」——好友接受邀请当天，双方小窝自动生成一条纪念记录，复用现有记忆（pet_memories）能力，不引入新数据模型。
- 信件下方补一行轻量功能预告，弥补信息密度低的问题。

## 范围

### 目标（Goals）

1. 小程序端（miniapp/）：无好友小窝空状态替换为「小多利的信」卡片 + 功能预告行。
2. 服务端（server/）：邀请被接受时自动写入「初见纪念」记忆。
3. 按钮文案：空状态分享按钮使用「邀请好友一起养一只小多利吧~」（已先行完成，见 `miniappViewModel.ts`）。

### 非目标（Non-goals）

- Web 端（src/）无好友状态本次不改。
- 不做宠物属性加成、装扮/徽章奖励。
- 不做「邀请已发出、等待对方回应」的中间状态提示（留作后续）。
- 不实现规格文档中的「先和小多利玩一会儿」试玩（留作后续）。

## 详细设计

### 1. 小程序端空状态（miniapp/）

改动文件：

- 新增 `miniapp/src/features/main/MiniappNestLetter.tsx` 与 `MiniappNestLetter.scss`。
- 修改 `miniapp/src/features/main/MiniappNestView.tsx`。

渲染规则（MiniappNestView）：

| 状态 | 场景区内容 | 快捷图标区（衣柜/照片墙/任务） |
| --- | --- | --- |
| `context` 加载中（null） | 现有背景图占位 | 隐藏 |
| `context.rooms.length === 0` | `MiniappNestLetter` 信件卡片 | 隐藏（当前渲染但不可点，属死区） |
| 有房间且有宠物 | 现有 `PetStatusCard` | 保持现状 |

MiniappNestLetter 组件：

- 奶油白卡片：背景 `#fffaf6`、圆角 28rpx，与小程序端统一弹窗视觉规范一致。
- 顶部：小多利头像（复用现有 xiaoduoli 素材）。
- 正文：信件文案（固定一段，不做轮换）：

> 给还没来的家人：
> 你好呀，我是小多利。有点粘人，老实巴交，喜欢出去玩和吃东西，最擅长等重要的人回家——全年无休，从不迟到。
> 窝已经收拾好了，阳光正好，只是还差一个空位。如果你邀请一位对你重要的人来，从那天起，你们可以一起喂我、一起玩五子棋、一起回答每日暗号。
> 初见那天，我会把它认真记成一条纪念。
> —— 小多利

- 信件下方预告行（小字、次要色）：「成为好友后：共享聊天 · 每日暗号 · 初见纪念」。
- 组件不持有网络请求与状态，纯展示；文案常量与组件同文件。

不新增邀请按钮：沿用 `pages/index/index.tsx` 中已有的分享按钮（`getInvitationButtonState`，文案已改为「邀请好友一起养一只小多利吧~」）。

### 2. 服务端初见纪念（server/）

改动文件：`server/src/services/invitationService.ts`。

在 `accept()` 两条成功路径（`repositories.invitations.acceptPair` 事务路径与逐条创建路径）统一收口后，调用现有 `repositories.memories.create` 写入：

- `roomId`：新建房间 id。
- `text`：`小多利见证了 {接受者昵称} 和 {邀请者昵称} 的初次见面，从今天起一起住在这个小窝里。`
- 昵称来源：通过 `repositories.users.findById` 分别取邀请者与接受者的 `displayName`，缺省回退为「好友」。
- `category: 'relationship'`、`source: 'explicit'`、`importance: 3`、`canMention: true`。

不新增 API：双方通过现有 `GET /api/rooms/:roomId/memories` 与记忆面板即可看到该纪念。

### 3. 测试计划

- 服务端：`invitationService.test.ts` 新增用例——接受邀请后，新房间内存在一条初见纪念（断言文案含双方昵称、category/importance）。
- 小程序：为 `MiniappNestLetter` 增加渲染测试（信件文案与预告行存在）；`MiniappNestView` 空状态分支测试（无房间时渲染信件卡片、不渲染快捷图标区）。
- 交付前：miniapp 清缓存重新编译（删除 dist 与构建缓存后 `npm run build:weapp`），微信开发者工具清全部缓存预览；合并前运行 `npm run verify:full`。
- 视觉变更需用户验收后才合入 main。

## 架构边界说明

- 新组件只做展示与文案，不含领域算法、不发请求（UI 层职责）。
- 纪念写入在服务端 service 层完成，HTTP 层不感知（符合 routes → services → repositories 方向）。
- 小程序改动以 miniapp/ 为主；服务端改动是用户在本设计中明确确认的例外。
