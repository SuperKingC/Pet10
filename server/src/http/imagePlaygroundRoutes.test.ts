import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createImagePlaygroundRoutes } from './imagePlaygroundRoutes.js'

function createApp() {
  const app = express()
  app.use('/image-playground', createImagePlaygroundRoutes())
  return app
}

describe('image playground route', () => {
  it('serves the browser test page without any embedded invite code', async () => {
    const response = await request(createApp()).get('/image-playground')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.headers['x-robots-tag']).toBe('noindex')
    expect(response.text).toContain('Pet10 工作台')
    expect(response.text).toContain('id="gate"')
    expect(response.text).toContain('/api/images/tasks')
    expect(response.text).toContain('/api/images/models')
    expect(response.text).not.toContain('localStorage')
    expect(response.text).not.toContain('Bearer sk-')
    // 内联脚本必须可解析（曾因模板字符串吃掉正则反斜杠导致整段脚本失效）
    const script = response.text.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
    expect(() => new Function(script)).not.toThrow()
  })
})
