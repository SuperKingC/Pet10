# 狗脚印下拉栏重设计（小程序端）

日期：2026-08-23
范围：仅小程序端 `miniapp/src/features/main/MiniappPawMenu.*`，Web 端不改。

## 背景与目标

当前狗脚印下拉栏由「标题区 + 每日暗号大卡片 + 2 个带说明文字的入口卡片」组成，视觉生硬单调、无弹出动画。

目标：

- 下拉栏更美观、更柔和，摆脱卡片堆叠的生硬感。
- 加入面板弹出动画与图标错峰入场动画。
- 每日暗号从内嵌卡片改为与游戏、塔罗并列的图标入口，点击后打开居中弹窗作答。
- 每个入口只保留图标 + 小标题，去掉说明文字；一行三个图标，间距紧凑。

非目标：

- 不改 Web 端 `src/components/PawMenu.tsx`。
- 不改暗号、游戏、塔罗的业务逻辑与 API。
- 不改底部 TabBar 本体。

## 结构

```
┌────────────────────────────┐
│        ▬ (把手)             │
│  一起留下今天的脚印      ×   │
│  今天想做点什么？           │
│                            │
│   (●)      (●)      (●)    │
│   暗号     游戏     塔罗    │
└────────────────────────────┘
```

- 保持底部下拉栏形式（符合 Pet10 界面呈现形式规范）。
- 面板高度贴合内容：删除 `min-height: 62vh`。
- 删除原每日暗号内嵌卡片区、入口说明文字（`__entry-caption`）。
- 标题保留「一起留下今天的脚印」，副标题改为「今天想做点什么？」。

## 三个入口

- 一行三列 `flex` 均分，左右内边距 48rpx，列间距 48rpx。
- 每个入口 = 圆形底座 + 图标 + 小标题：
  - 圆形底座：直径 128rpx，奶油到浅杏径向渐变，1px 柔和描边，投影 `0 6rpx 16rpx rgba(70,48,37,.12)`。
  - 图标：72rpx，居中；游戏复用 `assets/navigation/game.png`，塔罗复用 `assets/navigation/tarot.png`。
  - 暗号图标：新生成一张同风格手绘图标（信封 + 钥匙元素），存放 `miniapp/src/assets/navigation/codeword.png`。
  - 小标题：26rpx，颜色 `#8a6250`，距底座 12rpx。
- 顺序：每日暗号 · 游戏 · 塔罗占卜。

## 动画

- 遮罩：`opacity` 淡入 0.2s。
- 面板：上滑 + 缩放回弹，`translateY(24rpx) scale(.96)` → 原位，`cubic-bezier(.34,1.56,.64,1)`，0.3s。
- 图标：从 `scale(.6)` + `opacity: 0` 放大回弹，0.35s，延迟依次 0 / 60ms / 120ms。
- 关闭：组件内维护退出状态，反向收起约 0.18s 后再真正卸载/回调 `onClose`。
- 动画全部用 CSS keyframes/transition 实现，不引入动画库。

## 每日暗号弹窗

- 点「暗号」图标 → 关闭下拉栏 → 打开居中弹窗。
- 弹窗遵循统一弹窗规范：居中卡片、奶油白 `#fffaf6`、圆角 28px、遮罩透明度 0.5、内容区最大高度 84vh 可滚动。
- 内容：今日问题、回答输入框 + 提交按钮；已作答时显示我的答案与 TA 的答案（或作答人数）；未绑定好友（无 roomId）时显示「绑定好友后，就能一起回答每日暗号。」。
- 逻辑复用现有 `socialApi.getCodeword` / `socialApi.answerCodeword`。
- 新建组件 `MiniappCodewordModal`（同目录），下拉栏组件只负责三个入口。

## 测试与验证

- 更新/新增针对 `MiniappPawMenu` 的测试：三个图标入口存在、无说明文字、点击暗号触发弹窗回调。
- 如有既有快照/断言涉及旧结构（暗号卡片、caption），同步更新。
- 按小程序改动规则：改完清缓存重编译，用微信开发者工具预览验证布局与动画。

## 涉及文件

- 修改：`miniapp/src/features/main/MiniappPawMenu.tsx` / `.scss`
- 新增：`miniapp/src/features/main/MiniappCodewordModal.tsx` / `.scss`
- 新增：`miniapp/src/assets/navigation/codeword.png`
- 修改：`miniapp/src/pages/index/index.tsx`（接入暗号弹窗状态）
- 测试：相关测试文件同步更新
