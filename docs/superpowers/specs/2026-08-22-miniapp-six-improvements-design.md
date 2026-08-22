# 小程序六项体验改进设计（微信昵称授权、小窝背景、运势浮层、脚印弹窗、游戏单机模式）

日期：2026-08-22
范围：仅 `miniapp`（Taro 小程序端）。不改后端接口契约，不改 Web 端。

## 背景与目标

用户反馈 6 项改进需求，本轮实际落地 4 项：

1. ~~微信授权获取昵称 / 「我的」页改名改造~~（用户决定暂缓，本轮不做）。
2. 小窝背景图真机不显示（开发者工具正常）；右侧三个快捷按钮放大。
3. ~~消息页"还没有消息"文字调大~~（用户取消）。
4. 今日运势点开需新打开一个界面（全屏浮层），不在小记页下方内联展开。
5. 脚印弹窗（MiniappPawMenu）整体变高；内部字体与按钮尺寸不变。
6. 游戏入口无好友也能打开；五子棋新增单人模式（与机器人对弈）。

## 非目标

- 不改后端：性别字段保留在 API，前端不再展示与提交。
- 不改五子棋联网对战逻辑。
- 不做单机模式成绩持久化、不做 AI 难度选择。
- 不改消息页空态样式。
- 本轮不改登录页与「我的」页（第 1 项暂缓），性别功能维持现状。

## 1. 微信昵称授权与「我的」页改造

### 平台限制说明

微信已于 2022 年回收 `getUserProfile` / `getUserInfo` 静默获取昵称能力。官方唯一方案是「头像选择按钮（`openType="chooseAvatar"`）+ 昵称输入框（`type="nickname"`，键盘自带"使用微信昵称"绿色按钮）」。登录页已采用该方案，**不存在点一下就自动拿到昵称的合规方式**。

### 改动

- 登录页（`pages/index/index.tsx`）：
  - 保留现有头像选择 + 昵称输入框；将输入框 placeholder 改为引导性文案（如"点击输入框，可使用微信昵称"），让用户明确知道如何一键填入微信昵称。
  - 未填写昵称时由服务端默认"微信用户"（现状已实现，不改）。
- 「我的」页（`MiniappMeView.tsx`）：
  - 头像名字栏拆成两个点击区：头像点击 → 打开头像编辑器（现状保留）；名字文本 + 右侧新增 `›` 箭头 → 打开"编辑昵称"弹窗。
  - 昵称编辑弹窗使用统一 `MiniappModal`（奶油白 `#fffaf6`、圆角 28px、遮罩 0.5），内含昵称 `Input`（maxlength 20）+ 保存按钮，保存调用现有 `socialApi.updateProfile({ displayName })`，不再附带 gender。
  - 删除「姓名与性别」行、内联 `editing` 编辑块中的性别 Picker 与相关 gender 状态。
  - `getGenderLabel` 在 miniappViewModel 中保留（含现有单测），仅删除调用处。

## 2. 小窝背景与快捷按钮

### 背景真机不显示

- 现状：`room-background.webp`（158KB）经 `require` 打包输出到 `dist/assets/room-background.webp`，开发者工具正常、真机不显示。
- 方案：将 `room-background.webp` 转换为 jpg 并压缩到 ≤180KB（小程序单图预算），替换 `PetStatusCard.tsx` 与 `MiniappNestView.tsx` 中的引用（`assets/room-background.jpg`），删除旧 webp。
- 若转 jpg 后真机仍不显示，则回退排查引用路径（改为包内绝对路径 `/assets/room-background.jpg`），并以真机预览为准。

### 快捷按钮放大

- `MiniappNestView.scss`：`.miniapp-nest__shortcut` 及其 `image` 从 100×100/104px 放大到约 128px，列间距 `gap` 12px → 16px。图标为含文字的插画，整体放大即可。

## 4. 今日运势全屏浮层

- 新增组件 `miniapp/src/features/main/MiniappFortuneView.tsx`：
  - 全屏浮层形式（`position: fixed; inset: 0`，整屏覆盖 + 顶部返回按钮），符合"页面级界面仅允许整页/弹窗/下拉栏"规范中的整页呈现。
  - 内容：总评摘要 + 星级、幸运色、幸运数字、感情/学习/工作/财富/健康五维详情（复用 `MiniappCalendarView` 中现有的 `fortuneSections` 定义，提取共享）。
- `MiniappCalendarView.tsx`：
  - 运势卡片保留摘要展示；「详情/收起」按钮改为「查看详情 ›」，点击打开 `MiniappFortuneView`。
  - 删除 `fortuneOpen` 内联展开逻辑。
  - 未设置生日（`getFortuneAvailability` 未 ready）时，点击入口弹 Toast 提示 `availability.message`，不打开浮层。

## 5. 脚印弹窗加高

- 仅调整 `MiniappPawMenu.scss` 的 `.miniapp-paw-menu__sheet`：增加 `min-height`（约 62vh）并配合 `max-height: 84vh; overflow-y: auto`，内容仍顶部排布。
- 不修改内部字号、按钮、图标尺寸。

## 6. 游戏入口与五子棋单人模式

### 入口放开

- `MiniappPawMenu.tsx`：游戏按钮移除 `disabled={!roomId}`；无好友时副标题文案改为"五子棋和更多玩法"（去掉"绑定好友后开启"）。

### 单人模式

- 新增纯领域模块 `miniapp/src/domain/gobangSolo.ts`（无网络、无副作用、可单测）：
  - `createSoloGame()`：初始 15×15 空棋盘，玩家执黑先行。
  - `applySoloMove(state, x, y)`：落子并返回新状态（不可变）。
  - `checkFive(board, x, y, color)`：五连判定。
  - `chooseAiMove(board)`：启发式评分选点——自己成五 > 堵对方成五 > 自己成四 > 堵对方成四 > 成三/堵三 > 靠近中心与已有棋子，空棋盘走天元。
- `MiniappGobangPanel.tsx` 增加模式选择：
  - 打开面板先显示两个入口：「单人练习（和小多利机器人下）」与「好友对战」。
  - 单人练习：纯本地状态，玩家落子后由 `chooseAiMove` 回应；支持再来一局、返回；复用现有棋盘样式。
  - 好友对战：沿用现有联网逻辑；无好友（无 roomId/friendId）时该入口显示"绑定好友后可邀请对战"提示且不可点。

## 测试与验证

- 新增 `gobangSolo` 单元测试：五连判定（四个方向）、AI 必堵对方冲四、AI 优先自己成五、空棋盘走天元。
- 更新受影响测试：`miniappViewModel.test.ts`（保留 gender label 用例）；如 `miniappPresentation.test.ts` 等涉及已删 UI 的断言同步修正。
- 构建验证：`npm --prefix miniapp run build:weapp`（以 package.json 实际脚本为准），确认包体积在 2MB 内、背景图正确输出。
- 真机/开发者工具验证：小窝背景显示、快捷按钮尺寸、运势浮层、脚印弹窗高度、无好友打开游戏与单人五子棋、昵称编辑弹窗。
