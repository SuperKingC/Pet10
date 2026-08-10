# Pet10 的 AI 协作规则

这份文件给不熟悉代码的维护者和 AI 使用。目标不是让你读懂所有代码，而是让每次修改都可控、可验收、可回退。

## 项目怎么分层

```text
src/components/     界面组件
src/games/          独立功能，例如 tarot
src/domain/         纯业务规则和类型
src/services/       API、存储、浏览器能力
src/state/          全局状态和 Mock 数据
server/src/http/    后端请求入口
server/src/services/后端用例和业务协调
server/src/domain/  后端领域模型和规则
server/src/repositories/数据读写
docs/features/      中文功能说明
deploy/             服务器固定部署脚本
```

## 让 AI 修改前先做什么

请先使用这个提示：

```text
先不要修改代码。请检查当前分支、基线提交和未提交改动，
阅读对应的 docs/features 文档与 .agents/rules 规则，
说明本次只修改哪些文件、明确不修改哪些内容、如何自动验证，
以及完成后提供哪个本地验收链接。等我确认后再执行。
```

AI 必须先确认：

- 当前是否基于最新 `main`。
- 是否存在旧 worktree 或未提交修改。
- 本次目标只有一个明确功能。
- 哪些功能明确不在本次范围内。

## 验收方式

界面、交互和动画修改完成后，AI 必须提供：

```text
本次修改：
修改文件：
行为变化：
自动验证：
本地验收地址：
验收路径：
重点检查：
未验证内容：
停止验收服务：
回滚方式：
```

默认本地验收命令：

```powershell
npm run review
```

它会输出本地链接。塔罗动画还应提供对应阶段的直接链接，例如：

```text
http://127.0.0.1:4173/dev/tarot?stage=cut
```

你确认视觉效果前，不要让 AI 合并或部署。

## 塔罗动画特别规则

修改塔罗时必须阅读：

- `.agents/rules/tarot-animation.md`
- `docs/features/tarot.md`
- `docs/visual-baselines/tarot/`

一次只修改一个阶段或一个视觉目标。不要在旧 worktree 上继续补丁。每次从最新 `main` 开始，并说明动画时间线、检查点和未修改阶段。

## 图片特别规则

- 运行时图片必须登记在 `docs/assets/asset-manifest.md`。
- 原始概念图是 `source-only`，不能加入预加载。
- 不要只靠降低压缩质量解决加载速度。
- 图片替换必须同时报告尺寸、格式、体积、加载方式和清晰度验收结果。

## 服务器更新

服务器只部署 `main` 的已提交版本。日常发布通过 GitHub Actions 手动批准：

```text
main 通过 CI → 选择 web/api/all → 批准 production → 健康检查 → 打开线上链接
```

不要把生产密钥写进代码、Issue、日志或发给 AI。数据库迁移必须单独确认。
