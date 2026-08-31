# AI Image Generation Rules（AI 生图规则）

需要 AI 生成的图片素材（衣柜服饰、装饰、概念图等）**由 AI 直接调用用户的中转 API 生图**，不再让用户手工生成后提供文件。固定通道与约束如下。

## 固定通道

- 模型固定 `openai/gpt-5.4-image-2`，走 `POST {上游}/chat/completions`，body 带 `modalities: ['image']`、`image_config: { aspect_ratio: '1:1'|'2:3'|'3:2', image_size: '2K' }`；响应图片在 `choices[0].message.images[0].image_url.url`（base64 data-url）。
- 上游与生图房间同一中转 `https://apirouter.zhiqiteai.cn/ApiRouterServ/v1`（`server/src/services/imageGenerationService.ts`）。
- 统一用脚本 `node scripts/gen-ai-image.mjs "提示词" [-o 输出.png] [--ratio 1:1|2:3|3:2] [--ref 参考图1,参考图2]`，不要手写一次性请求。
- key 从本地读取（脚本自动找 ZCode 配置 `C:/Users/admin/.zcode/v2/config.json` 里 zhiqiteai provider，或环境变量 `AI_IMAGE_API_KEY`），**禁止把 key 写进代码、仓库、日志或发到外部**。

## 使用约束

- 支持参考图（图生图）：最多 2 张、单张 ≤2MB 的本地 jpg/png/webp。
- 单张 2K 实测约 2.3 分钟、cost 约 0.47（2026-08-31 计）：批量出图要预留时间，脚本逐张跑、逐张查看再继续。
- 生成图一律视为**源图（source-only）**：出件/进包前必须按 `.agents/rules/miniapp-image.md` 处理（切图、PNG8/JPEG、禁本地 WebP、单张 180KB 安全线），登记 `docs/assets/asset-manifest.json`，同路径换图按缓存规则升版文件名。
- 需要透明底素材时在提示词里要求纯白背景，再用仓库现有 segment 管线去底，不要指望模型直出透明 PNG。
