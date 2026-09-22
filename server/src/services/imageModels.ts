/** 生图/生视频模型目录与启用集合：接口按此校验 model 入参，测试页按此渲染下拉。 */

export type ImageModelKind = 'image' | 'video'

export interface ImageModelDef {
  id: string
  kind: ImageModelKind
  label: string
}

// 模型存在性以中转 /videos（视频）与 /chat/completions（图）的免费畸形体探测为准（2026-09-22）：
// 视频 gpt/sora 系不存在，可灵 kwaivgi/kling-v3.0 两档存在；Gemini 图像 preview 两档存在。
export const IMAGE_MODEL_CATALOG: ImageModelDef[] = [
  { id: 'openai/gpt-5.4-image-2', kind: 'image', label: 'GPT-5.4 Image（现役锁狗主力）' },
  { id: 'openai/gpt-5.5', kind: 'image', label: 'GPT-5.5 多模态生图' },
  { id: 'google/gemini-3.1-flash-image-preview', kind: 'image', label: 'Gemini 3.1 Flash 生图' },
  { id: 'google/gemini-3-pro-image-preview', kind: 'image', label: 'Gemini 3 Pro 生图' },
  { id: 'kwaivgi/kling-v3.0-pro', kind: 'video', label: '可灵 3.0 Pro 视频' },
  { id: 'kwaivgi/kling-v3.0-std', kind: 'video', label: '可灵 3.0 标准视频' }
]

export function findImageModel(id: string): ImageModelDef | undefined {
  return IMAGE_MODEL_CATALOG.find((model) => model.id === id)
}

/** 按配置的 id 列表解析启用模型：未知 id 丢弃、去重，保持目录顺序 */
export function resolveEnabledImageModels(enabledIds: string[]): ImageModelDef[] {
  const wanted = new Set(enabledIds)
  return IMAGE_MODEL_CATALOG.filter((model) => wanted.has(model.id))
}

/** 同步 /generations 只支持图片模型；视频走任务接口 */
export function isImageModel(model: ImageModelDef): model is ImageModelDef & { kind: 'image' } {
  return model.kind === 'image'
}
