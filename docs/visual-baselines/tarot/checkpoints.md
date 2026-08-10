# 塔罗截图检查点

固定移动端视口：`390x844`。桌面复核视口：`1280x800`。

| 检查点 | 阶段 | 必须可见 | 禁止现象 |
| --- | --- | --- | --- |
| `question-start` | question | 问题类别和输入入口 | 横向溢出 |
| `shuffle-start` | shuffle | 完整牌堆和提示 | 首帧跳动 |
| `shuffle-mid` | shuffle | 交错洗牌层次 | 卡牌消失或穿帮 |
| `shuffle-end` | shuffle | 重新收拢牌堆 | 仍可重复触发 |
| `cut-lift` | cut | 上层牌堆抬起 | 下层牌堆移动 |
| `cut-drop` | cut | 牌堆自然落下 | 位置突变 |
| `fan-ready` | fan | 扇形牌面完整 | 超出屏幕 |
| `card-selected` | fan | 已选牌明确 | 重复选中 |
| `reveal-mid` | reveal | 翻牌中间状态 | 图片闪白 |
| `reading-final` | reading | 阅读、分享和重新开始 | 文字截断 |
