# 图片生成

## 功能

用户在独立的 `/image` 页面输入提示词，可通过文件选择、粘贴或拖拽添加参考图，并通过服务端代理调用图片生成服务。

生成完成后页面显示耗时。上游失败时页面显示安全的错误码、耗时和可用的请求 ID；服务端同时记录脱敏诊断日志，不记录 API Key、提示词或参考图内容。

## 关键入口

- `src/components/ImageGenerationRoom.tsx`
- `src/components/ImageGenerationRoom.css`
- `src/services/imageGenerationApi.ts`：封装请求、鉴权头和响应解析。
- `src/services/imageGenerationSession.ts`：封装邀请码的浏览器会话存储。
- `src/services/imageReference.ts`：封装参考图校验、缩放、压缩和大小计算。
- `server/src/http/imageRoutes.ts`
- `server/src/services/imageGenerationService.ts`
- `server/src/services/imageRateLimiter.ts`

## 风险

- UI 组件不得直接请求接口；网络响应解析与浏览器图片处理必须留在服务边界。
- 参考图会增加请求体积。
- API Key 只能在服务端环境变量中。
- 生成服务超时或限流时必须给出可理解提示。
- 部分上游会以 HTTP 200 返回内嵌错误对象，不能只依赖 HTTP 状态判断成功。
- 上游错误消息可能包含敏感信息，只能透传错误码和请求 ID。

## 验收

- [ ] 无参考图可以生成。
- [ ] 文件选择、粘贴和拖拽添加的参考图都可以预览和移除。
- [ ] 成功结果显示生成耗时。
- [ ] 超长提示、限流和上游失败有明确提示，上游失败显示安全错误码和请求 ID。
- [ ] 服务端日志包含状态、错误码、请求 ID 和耗时，不包含提示词、参考图或秘钥。
- [ ] 秘钥不会出现在浏览器代码和日志。
