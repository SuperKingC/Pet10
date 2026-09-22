import { describe, expect, it } from 'vitest'
import { IMAGE_MODEL_CATALOG, findImageModel, isImageModel, resolveEnabledImageModels } from './imageModels.js'

describe('image model catalog', () => {
  it('contains image and video models with unique ids', () => {
    const ids = IMAGE_MODEL_CATALOG.map((model) => model.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findImageModel('openai/gpt-5.4-image-2')?.kind).toBe('image')
    expect(findImageModel('google/gemini-3.1-flash-image-preview')?.kind).toBe('image')
    expect(findImageModel('kwaivgi/kling-v3.0-pro')?.kind).toBe('video')
    expect(findImageModel('kwaivgi/kling-v3.0-std')?.kind).toBe('video')
  })

  it('resolves enabled models by id, dropping unknown ones and keeping catalog order', () => {
    const enabled = resolveEnabledImageModels(['kwaivgi/kling-v3.0-std', 'not-a-model', 'openai/gpt-5.4-image-2', 'kwaivgi/kling-v3.0-std'])
    expect(enabled.map((model) => model.id)).toEqual(['openai/gpt-5.4-image-2', 'kwaivgi/kling-v3.0-std'])
    expect(resolveEnabledImageModels([])).toEqual([])
  })

  it('marks the recommended image model in its label', () => {
    expect(findImageModel('openai/gpt-5.4-image-2')?.label).toBe('GPT-5.4 Image（推荐）')
  })

  it('narrowing helper distinguishes image models from video models', () => {
    const video = findImageModel('kwaivgi/kling-v3.0-std')
    const image = findImageModel('openai/gpt-5.4-image-2')
    expect(isImageModel(video!)).toBe(false)
    expect(isImageModel(image!)).toBe(true)
  })
})
