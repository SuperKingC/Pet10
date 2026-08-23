# 小多利共养名额限制设计（一人一友共养一只）

日期：2026-08-23
状态：已确认

## 背景与目标

当前系统中，每接受一段好友关系（小程序邀请或 Web 好友请求）都会自动创建聊天房间和一只小多利，用户可以与多个好友分别共养多只小多利。

产品设定调整：**小多利只能和一位好友共养一只**。每个用户最多与一位好友共养一只小多利。若目标好友已与他人共养小多利，双方仍可成为好友并拥有聊天房间，但房间内不生成小多利；该用户的小窝仍展示"需要邀请好友"的信件空状态。

## 已确认的关键决策

1. 自己已有小多利时，仍可添加新好友，但不再创建第二只小多利。
2. 暂无存量数据，无需兼容迁移。
3. 规则仅在小程序邀请链路（`invitationService`）生效；Web 好友请求链路（`friendshipService`）保持现状。
4. 无小多利时，小窝统一展示现有信件空状态文案，不新增区分文案。
5. 好友关系和聊天房间照常创建，仅跳过小多利创建。

## 方案选型

- **方案 A（采用）**：在 `invitationService.accept` 中校验双方共养名额，满额则创建关系 + 房间、跳过 pet 创建。改动集中、不动数据库结构。
- 方案 B：数据模型加"共养关系"专属标记（需迁移脚本）。为尚不存在的"更换共养对象"能力预留，过度设计，否决。
- 方案 C：满额时拒绝接受邀请。与需求矛盾（仍要能成为好友），否决。

## 详细设计

### 1. 服务端：邀请接受时的名额校验（仅小程序路径）

- 新增查询能力：判断某用户是否已拥有共养小多利。实现方式为遍历该用户已接受关系（`relationships.listAcceptedForUser`）对应房间（`rooms.findByRelationshipId`）查询 `pets.findByRoomId`，任一命中即视为"已有小多利"。封装为服务层可复用的判定逻辑，memory 与 postgres 仓储无需新增接口。
- `invitationService.accept` 流程调整：
  - 现有校验（token 有效、非本人、非已有关系）不变。
  - 新增：若邀请人或接受人任一方已有共养小多利 → 仅创建 relationship + room，**跳过** `pets.createForRelationship` 与"初见纪念"记忆写入。
  - 若双方均无小多利 → 维持现状（创建关系、房间、pet，并写入初见纪念）。
  - 初见纪念文案提到"住在这个小窝里"，无小多利时不适用，因此跳过；不新增替代文案。
- `friendshipService`（Web 好友请求）不改。

### 2. 服务端：启动上下文兼容无小多利房间

- `sessionService.getLaunchContext`：
  - 不再跳过无 pet 的房间；房间条目中 `pet` 字段变为可空（无 pet 时为 `null`）。
  - `activeRoomId` 缺省选择时优先选有小多利的房间；全部无 pet 时回退 `rooms[0]?.id`（此时小程序侧会展示空状态）。
- `socialService.listConversations` 已按房间遍历且不依赖 pet 存在，无需改动。

### 3. 小程序端适配

- `launchContextApi.ts`：`rooms[].pet` 类型改为可空。
- `miniappViewModel.getNestSceneMode`：只要没有任何带小多利的房间 → 返回 `empty`（展示现有邀请信件，文案不变）。
- `MiniappNestView`：房间切换 chip 只渲染有小多利的房间，避免读取空 `pet.level`。
- `launchPreparation`：对无 pet 房间容错（pet 加载失败或为空时按 null 处理，不阻断启动）。
- 邀请页 `pages/invite/invite.tsx` 文案不改；接受满额邀请人的邀请仍按现有成功流程展示。

### 4. 非目标与已知边界

- 不支持更换共养对象。
- 不处理存量数据（确认暂无）。
- 不改 Web 端行为与文案。
- 已知边界：通过小程序邀请建立的无 pet 房间用户若登录 Web 端，`sessionService.getSession` 会因 `pet_not_found` 报错。本次不处理。

## 测试计划

- `invitationService.test.ts`：
  - 对方（或自己）已有小多利时接受邀请 → 关系与房间创建成功、无 pet、无初见纪念。
  - 双方均无小多利 → 行为与现状一致（含初见纪念）。
- `sessionService.test.ts`：无 pet 房间进入 launch context（pet 为 null）；activeRoomId 优先选有 pet 的房间。
- `miniappViewModel.test.ts`：有房间但全无 pet 时场景为 `empty`。
- 验证命令：`npm run verify:full`（合并/部署前）。
