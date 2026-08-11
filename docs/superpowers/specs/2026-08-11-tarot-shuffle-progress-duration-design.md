# 塔罗洗牌进度时长设计

## 目标

将长按洗牌从当前约 1.39 秒延长到 2 秒，使进度增长更从容，同时保持从 0% 开始、松手暂停、继续长按续接以及 100% 解锁下一步的现有行为。

## 方案

- 在 `src/games/tarot/tarotAnimation.ts` 定义 `TAROT_SHUFFLE_HOLD_DURATION_MS = 2000`。
- `advancePressProgress` 使用 `elapsedMs / TAROT_SHUFFLE_HOLD_DURATION_MS * 100` 线性推进。
- 继续限制最大值为 100，并忽略非正耗时。
- 不修改 `usePressProgress` 的逐帧上限、洗牌 CSS、切牌阶段或状态机迁移。

## 验收

- 从 0% 连续长按 1000ms 时进度为 50%。
- 从 0% 连续长按 2000ms 时进度为 100%。
- 已有进度继续累加并在 100% 截止。
- `/dev/tarot?stage=shuffle` 从 0% 开始并可长按增长。
