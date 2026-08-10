# 图片生成

## 功能

用户在独立的 `/image` 页面输入提示词，可选择参考图，并通过服务端代理调用图片生成服务。

## 关键入口

- `src/components/ImageGenerationRoom.tsx`
- `src/components/ImageGenerationRoom.css`
- `server/src/http/imageRoutes.ts`
- `server/src/services/imageGenerationService.ts`
- `server/src/services/imageRateLimiter.ts`

## 风险

- 参考图会增加请求体积。
- API Key 只能在服务端环境变量中。
- 生成服务超时或限流时必须给出可理解提示。

## 验收

- [ ] 无参考图可以生成。
- [ ] 有参考图可以预览和移除。
- [ ] 超长提示、限流和上游失败有明确提示。
- [ ] 秘钥不会出现在浏览器代码和日志。
