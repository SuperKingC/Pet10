# 塔罗视觉基线

本目录定义塔罗动画的唯一验收标准。视频和图片可以作为参考，但实际修改必须同时符合状态机、时间线和交互规则。

- `timeline.md`：阶段和时序。
- `checkpoints.md`：固定截图检查点。
- `acceptance-criteria.md`：人工验收清单。

修改时一次只处理一个阶段，并通过 `/dev/tarot?stage=<stage>` 直接验收。
