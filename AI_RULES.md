# Pet10 的 AI 协作规则

这份文件给不熟悉代码的维护者和 AI 使用。目标不是让你读懂所有代码，而是让每次修改都可控、可验收、可回退。

## 项目怎么分层

```text
miniapp/src/pages/    小程序页面
miniapp/src/features/ 功能模块的状态、组件、样式和测试
miniapp/src/domain/   纯业务规则和类型
miniapp/src/services/ API、存储和小程序能力
miniapp/config/       构建配置和环境变量
server/src/http/      后端请求入口
server/src/services/  后端用例和业务协调
server/src/domain/    后端领域模型和规则
server/src/repositories/数据读写
docs/features/        中文功能说明
deploy/               服务器固定部署脚本
```

## 让 AI 修改前先做什么

请先使用这个提示：

```text
先不要修改代码。请检查当前分支、基线提交和未提交改动，
阅读对应的 docs/features 文档与 .agents/rules 规则，
说明本次只修改哪些文件、明确不修改哪些内容、如何自动验证，
以及完成后如何在微信开发者工具中预览。等我确认后再执行。
```

AI 必须先确认：

- 当前是否基于最新 `main`。
- 是否存在旧 worktree 或未提交修改。
- 本次目标只有一个明确功能。
- 哪些功能明确不在本次范围内。

## 验收方式

界面、交互修改完成后，AI 必须提供：

```text
本次修改：
修改文件：
行为变化：
自动验证：
预览方式：
验收路径：
重点检查：
未验证内容：
回滚方式：
```

默认预览方式：执行 `npm run build:weapp --prefix miniapp` 后，在微信开发者工具中编译并预览 `miniapp/dist`；涉及塔罗资源时必须提供 `TARO_TAROT_ASSET_BASE_URL` 指向的 COS 版本目录。

你确认视觉效果前，不要让 AI 合并或部署。

## 图片特别规则

- 需要 AI 生成的图片素材：统一由 AI 调用户中转 key 生图，模型固定 `openai/gpt-5.4-image-2`，用 `node scripts/gen-ai-image.mjs`，详见 `.agents/rules/ai-image-generation.md`。
- 运行时图片必须登记在 `docs/assets/asset-manifest.md`。
- 原始概念图是 `source-only`，不能加入预加载。
- 不要只靠降低压缩质量解决加载速度。
- 图片替换必须同时报告尺寸、格式、体积、加载方式和清晰度验收结果。

## 服务器更新

服务器只部署 `main` 的已提交版本。日常发布通过 GitHub Actions 手动批准：

```text
main 通过 CI → 选择 assets/api/all → 批准 production → 健康检查 → 打开线上链接
```

不要把生产密钥写进代码、Issue、日志或发给 AI。数据库迁移必须单独确认。
