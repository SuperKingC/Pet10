import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('startup artwork', () => {
  it('uses a dedicated lightweight image before the app opens', () => {
    const root = resolve(import.meta.dirname, '..')
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')
    const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')
    const login = readFileSync(resolve(root, 'src/components/LoginScreen.tsx'), 'utf8')
    const asset = resolve(root, 'public/pet/xiaoduoli-startup.png')

    expect(html).toContain('/pet/xiaoduoli-startup.png')
    expect(main).toContain('/pet/xiaoduoli-startup.png')
    expect(login).toContain('/pet/xiaoduoli-startup.png')
    expect(statSync(asset).size).toBeLessThan(200_000)
  })

  it('bounds installed-app navigation and session startup waits', () => {
    const root = resolve(import.meta.dirname, '..')
    const serviceWorker = readFileSync(resolve(root, 'public/sw.js'), 'utf8')
    const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')

    expect(serviceWorker).toContain('NAVIGATION_TIMEOUT_MS')
    expect(serviceWorker).toContain("request.mode === 'navigate'")
    expect(serviceWorker).toContain("request.destination === 'script'")
    expect(main).toContain('SESSION_STARTUP_TIMEOUT_MS')
    expect(main).toContain('controller.abort()')
  })

  it('preloads chat avatar and bottom navigation artwork before the app opens', () => {
    const root = resolve(import.meta.dirname, '..')
    const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')
    const requiredAssets = [
      '/pet/xiaoduoli.png',
      '/navigation/tab-bar-background.png',
      '/navigation/nest.png',
      '/navigation/journal.png',
      '/navigation/paw.png',
      '/navigation/messages.png',
      '/navigation/me.png'
    ]

    for (const asset of requiredAssets) {
      expect(main).toContain(`preloadImage('${asset}')`)
    }
  })

  it('pre-caches the bottom navigation background for standalone launches', () => {
    const root = resolve(import.meta.dirname, '..')
    const serviceWorker = readFileSync(resolve(root, 'public/sw.js'), 'utf8')

    expect(serviceWorker).toContain("const CACHE_NAME = 'xiaoduoli-shell-v8'")
    expect(serviceWorker).toContain("'/navigation/tab-bar-background.png'")
  })
})
