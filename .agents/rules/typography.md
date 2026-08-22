# Typography Rules（小程序字体规范）

## Scope

本规则适用于 Pet10 微信小程序（`miniapp/`），来源为已确认的字体规范（`.superpowers/brainstorm/font-spec-20260822`，方案 B 舒适可读 + 辅助文字合并决议）。PWA（`src/`）暂不适用。

## 语义字号阶梯

代码统一使用 `app.scss` 中的语义 CSS 变量，不得硬编码阶梯外字号：

| 语义 | 变量 | 字号 | 字重 | 行高 | 用途 |
|---|---|---|---|---|---|
| 展示标题 | `--font-size-display` | 56rpx | 700 | 1.20 | 邀请页、结果页；每页最多一个 |
| 页面标题 | `--font-size-page-title` | 44rpx | 700 | 1.25 | 主导航页面唯一标题 |
| 流程标题 | `--font-size-overlay-title` | 40rpx | 700 | 1.30 | 弹窗、整页任务、游戏面板标题 |
| 区块标题 | `--font-size-section-title` | 34rpx | 700 | 1.40 | 页面内部一级分组 |
| 卡片标题 | `--font-size-card-title` | 32rpx | 600 | 1.45 | 卡片名、列表主值 |
| 正文 / 控件 | `--font-size-body` | 30rpx | 400 / 600 | 1.65 / 1.20 | 正文、聊天、按钮、输入文字 |
| 次级正文 | `--font-size-secondary` | 28rpx | 400 | 1.60 | 列表补充、较弱说明 |
| 辅助文字 | `--font-size-aux` | 26rpx | 400 / 600 | 1.55 | 操作提示、错误、空状态说明 |
| 辅助文字（标签） | `--font-size-aux` | 26rpx | 500 | 1.40 | 时间、导航标签、日历星期 |

对应字重变量：`--font-weight-regular: 400`、`--font-weight-medium: 500`、`--font-weight-semibold: 600`、`--font-weight-bold: 700`。

## 硬性规则

1. 承担操作、状态或理解任务的功能文字不得小于 26rpx。
2. 按钮与输入文字统一使用正文 / 控件档（30rpx）。
3. 错误提示不能靠缩小字号弱化，只能靠颜色与容器表达。
4. 所有文字 `letter-spacing` 为 0。
5. 只允许 400 / 500 / 600 / 700 四档字重，禁止 800、900 等额外字重。
6. 代码统一使用 rpx 单位与语义变量；不得使用 px 字号。
7. 字体族使用系统无衬线字体，不引入网络字体。

## 例外

- 塔罗牌面内部不承担操作或解读任务的微型装饰字可低于 26rpx。
- 仅塔罗牌名、牌面编号、仪式性标题允许使用衬线展示字（Georgia / Noto Serif SC / Songti SC）。
- Emoji、符号和图标字形（如关闭按钮 ✕、日历箭头）的字号归入图标尺寸，不计入正文字号阶梯。

## Review Checklist

- [ ] 新增或修改的文字样式使用了语义变量而非硬编码字号。
- [ ] 无 `font-weight: 800/900`。
- [ ] 无低于 26rpx 的功能文字。
- [ ] 按钮与输入文字为 30rpx 档。
- [ ] `letter-spacing` 为 0。
- [ ] 单位均为 rpx。
