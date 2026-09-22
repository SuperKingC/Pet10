import { describe, expect, it } from 'vitest'
import { IMAGE_MODEL_CATALOG, findImageModel, isImageModel, resolveEnabledImageModels } from './imageModels.js'

describe('image model catalog', () => {
  it('contains image and video models with unique ids', () => {
    const ids = IMAGE_MODEL_CATALOG.map((model) => model.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findImageModel('openai/gpt-5.4-image-2')?.kind).toBe('image')
    expect(findImageModel('openai/sora-2')?.kind).toBe('video')
    expect(findImageModel('openai/sora-2')?.supportsSeconds).toBe(true)
  })

  it('resolves enabled models by id, dropping unknown ones and keeping catalog order', () => {
    const enabled = resolveEnabledImageModels(['openai/sora-2', 'not-a-model', 'openai/gpt-5.4-image-2', 'openai/sora-2'])
    expect(enabled.map((model) => model.id)).toEqual(['openai/gpt-5.4-image-2', 'openai/sora-2'])
    expect(resolveEnabledImageModels([])).toEqual([])
  })

  it('narrowing helper distinguishes image models from video models', () => {
    const video = findImageModel('openai/sora-2')
    const image = findImageModel('openai/gpt-5.4-image-2')
    expect(isImageModel(video!)).toBe(false)
    expect(isImageModel(image!)).toBe(true)
  })
})
